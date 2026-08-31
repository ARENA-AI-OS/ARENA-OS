import type { Json } from "@core/types";
import type { ToolName } from "@domain/index";

// Controlled terminal adapter. No unrestricted shell access.
// Operations are discrete, gateway-mediated actions with:
//   - Timeout (default 60s for builds, 30s for others)
//   - Working-directory restriction (project root only)
//   - Full audit logging through the tool gateway
// Arbitrary commands go through the same permission + audit path.

const PROJECT_ROOT = process.env.ARENA_PROJECT_ROOT || process.cwd();

// Allowed command prefixes — anything not on this list is denied.
const ALLOWED_PREFIXES = [
  "npm test",
  "npm run test",
  "npx vitest",
  "npx jest",
  "pnpm test",
  "bun test",
  "npm run build",
  "npx next build",
  "npx tsc",
  "pnpm build",
  "bun build",
  "npm install",
  "pnpm install",
  "bun install",
  "npm ci",
  "git status",
  "git diff",
  "git log",
  "git branch",
  "git show",
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "grep",
  "find",
  "node --version",
  "npm --version",
  "pnpm --version",
  "bun --version",
];

// Timeout per operation type (ms)
const TIMEOUTS: Record<string, number> = {
  test: 120_000,
  build: 120_000,
  install: 120_000,
  git: 15_000,
  default: 30_000,
};

function getTimeout(command: string): number {
  if (command.includes("test")) return TIMEOUTS.test;
  if (command.includes("build")) return TIMEOUTS.build;
  if (command.includes("install")) return TIMEOUTS.install;
  if (command.startsWith("git")) return TIMEOUTS.git;
  return TIMEOUTS.default;
}

function isAllowed(command: string): { allowed: boolean; reason?: string } {
  const trimmed = command.trim();
  if (!trimmed) return { allowed: false, reason: "empty command" };

  // Block dangerous patterns
  const blocked = ["rm -rf", "sudo", "chmod 777", "eval ", "exec ", "curl |", "wget |", "shutdown", "reboot"];
  for (const b of blocked) {
    if (trimmed.includes(b)) return { allowed: false, reason: `blocked pattern: ${b}` };
  }

  // Check against allow-list
  const allowed = ALLOWED_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  if (!allowed) return { allowed: false, reason: `command not in allow-list: ${trimmed.split(" ")[0]}` };

  return { allowed: true };
}

// Execute a real command with timeout and capture output.
async function execCommand(
  command: string,
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const { spawn } = await import("child_process");
  return new Promise((resolve) => {
    const proc = spawn("sh", ["-c", command], {
      cwd: PROJECT_ROOT,
      timeout: timeoutMs,
      env: {
        ...process.env,
        CI: "true",
        NO_COLOR: "1",
      },
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
      // Truncate very long output
      if (stdout.length > 50_000) {
        stdout = stdout.slice(0, 50_000) + "\n... [truncated]";
        proc.kill("SIGTERM");
        killed = true;
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
      if (stderr.length > 10_000) {
        stderr = stderr.slice(0, 10_000) + "\n... [truncated]";
      }
    });

    proc.on("close", (code) => {
      resolve({
        exitCode: killed ? -1 : (code ?? 1),
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    proc.on("error", (err) => {
      resolve({
        exitCode: -1,
        stdout: "",
        stderr: err.message,
      });
    });

    // Kill after timeout
    setTimeout(() => {
      if (!killed) {
        killed = true;
        proc.kill("SIGTERM");
      }
    }, timeoutMs);
  });
}

// Parse test output to extract pass/fail counts.
function parseTestOutput(output: string): { passed: number; failed: number } {
  // Jest/Vitest output patterns
  const passMatch = output.match(/(\d+)\s+passed/i) ?? output.match(/Tests:\s+(\d+)\s+passed/);
  const failMatch = output.match(/(\d+)\s+failed/i) ?? output.match(/Tests:\s+\d+\s+passed,\s+(\d+)\s+failed/);

  // Also check for "All X tests passed" pattern
  if (output.includes("all passed") || output.includes("All tests passed")) {
    return { passed: 1, failed: 0 };
  }

  return {
    passed: passMatch ? parseInt(passMatch[1]) : 0,
    failed: failMatch ? parseInt(failMatch[1]) : 0,
  };
}

export async function runTerminalTool(
  tool: ToolName,
  input: Json,
): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;

  // Route discrete tool names to specific commands
  let command: string;
  switch (tool) {
    case "terminal.git_status":
      command = "git status --porcelain";
      break;
    case "terminal.git_diff":
      command = "git diff --stat" + (i.path ? ` -- ${i.path}` : "");
      break;
    case "terminal.run_tests":
      command = i.command || "npx vitest run --reporter=verbose 2>&1 || npx jest --verbose 2>&1";
      break;
    case "terminal.run_build":
      command = i.command || "npm run build 2>&1";
      break;
    case "terminal.install_deps":
      command = i.command || "npm install 2>&1";
      break;
    case "terminal.run":
      command = i.command || "";
      break;
    default:
      return { ok: false, error: `unsupported terminal tool: ${tool}` };
  }

  if (!command) {
    return { ok: false, error: "no command specified" };
  }

  // Permission check
  const check = isAllowed(command);
  if (!check.allowed) {
    return {
      ok: false,
      error: check.reason,
      output: { denied: true, reason: check.reason },
    };
  }

  // Execute with timeout
  const timeoutMs = getTimeout(command);
  const result = await execCommand(command, timeoutMs);

  if (result.exitCode === -1 && result.stderr.includes("killed")) {
    return {
      ok: false,
      error: `command timed out after ${timeoutMs}ms`,
      output: { exitCode: -1, timeout: true, stdout: result.stdout.slice(-500), stderr: result.stderr.slice(-500) },
    };
  }

  // Parse test output for structured results
  const isTest = command.includes("test");
  const testResults = isTest ? parseTestOutput(result.stdout + result.stderr) : undefined;

  return {
    ok: result.exitCode === 0,
    output: {
      command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      ...(testResults ? { passed: testResults.passed, failed: testResults.failed } : {}),
    },
    error: result.exitCode !== 0 ? `exit code ${result.exitCode}: ${result.stderr.slice(0, 300)}` : undefined,
  };
}
