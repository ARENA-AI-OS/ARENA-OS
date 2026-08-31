import type { Json } from "@core/types";
import type { AuditActor, ToolName, ToolRun } from "@domain/index";
import { newAudit } from "@domain/index";
import { shortId, nowIso } from "@core/ids";
import { authorize, requiresElevation } from "@security/permissions";
import { TOOL_REGISTRY, validateToolInput } from "./registry";
import { runGithubTool } from "./github";
import { runTerminalTool } from "./terminal";
import { runSupabaseTool } from "./supabase";
import { runRailwayTool } from "./railway";
import { runFirebaseTool } from "./firebase";
import { runPaymentTool } from "./payment";
import { runStellarAnchorTool } from "@stellar/receipt-anchor";

export interface ToolContext {
  missionId?: string;
  // Capabilities the calling agent is allowed to use.
  grantedCapabilities: string[];
  actor: AuditActor;
  // Allows the gateway to record audit/tool-run rows.
  record?: (run: ToolRun, audit: ReturnType<typeof newAudit>) => Promise<void>;
  // User must approve elevated ops via UI before execution.
  approvalToken?: string;
}

export interface ToolResult {
  ok: boolean;
  output?: Json;
  error?: string;
  denied?: boolean;
}

// Default timeout for tool execution (30 seconds).
const DEFAULT_TIMEOUT_MS = 30_000;

// Central Tool Gateway (spec §18). Enforces:
//   permission check → input validation → credential resolution →
//   execution → result normalization → audit event
// No agent may call an external service directly.
export class ToolGateway {
  async execute(
    tool: ToolName,
    input: Json,
    ctx: ToolContext,
    opts?: { timeoutMs?: number },
  ): Promise<ToolResult> {
    const spec = TOOL_REGISTRY[tool];
    const runId = shortId("TR");
    const startedAt = nowIso();

    const record = async (status: ToolRun["status"], output?: Json, error?: string) => {
      const run: ToolRun = {
        id: runId,
        missionId: ctx.missionId,
        tool,
        input,
        output,
        status,
        startedAt,
        endedAt: nowIso(),
        error,
      };
      const audit = newAudit({
        actor: ctx.actor,
        action: `tool.${tool} -> ${status}`,
        missionId: ctx.missionId,
        detail: { tool, input: sanitizeInput(input), status, error },
      });
      await ctx.record?.(run, audit);
      return run;
    };

    // 1. Unknown tool
    if (!spec) {
      await record("failed", undefined, "unknown tool");
      return { ok: false, error: "unknown tool", denied: false };
    }

    // 2. Permission check
    const perm = authorize(ctx.grantedCapabilities, spec.capability);
    if (!perm.ok) {
      await record("denied", undefined, perm.reason);
      return { ok: false, error: perm.reason, denied: true };
    }

    // 3. Elevated operation check — production ops need approval
    if (requiresElevation(spec.capability) && !ctx.approvalToken) {
      await record("denied", undefined, "elevated operation requires approval");
      return {
        ok: false,
        error: `elevated capability ${spec.capability} requires user approval`,
        denied: true,
      };
    }

    // 4. Input validation
    const validationError = validateToolInput(tool, input);
    if (validationError) {
      await record("failed", undefined, `validation: ${validationError}`);
      return { ok: false, error: `input validation: ${validationError}` };
    }

    // 5. Credential resolution — resolve provider-specific credentials
    const credentials = resolveCredentials(spec.requiresProvider);
    if (spec.requiresProvider && !credentials.configured) {
      await record("failed", undefined, `${spec.requiresProvider} not configured`);
      return { ok: false, error: `${spec.requiresProvider} not configured` };
    }

    // 6. Execute with timeout
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    try {
      const result = await withTimeout(executeByProvider(tool, input, ctx), timeoutMs);
      await record(result.ok ? "success" : "failed", result.output, result.error);
      return result;
    } catch (e) {
      const msg = (e as Error).message;
      await record("failed", undefined, msg);
      return { ok: false, error: msg };
    }
  }
}

// Execute tool by provider with proper routing.
async function executeByProvider(
  tool: ToolName,
  input: Json,
  ctx: ToolContext,
): Promise<ToolResult> {
  const spec = TOOL_REGISTRY[tool];
  switch (spec.requiresProvider) {
    case "github":
      return runGithubTool(tool, input);
    case "supabase":
      return runSupabaseTool(tool, input);
    case "railway":
      return runRailwayTool(tool, input);
    case "firebase":
      return runFirebaseTool(tool, input);
    case "x402":
      return runPaymentTool(tool, input, ctx);
    case "stellar":
      return runStellarAnchorTool(tool, input, ctx);
    default:
      // Terminal and non-provider tools
      return runTerminalTool(tool, input);
  }
}

// Credential resolution — checks if provider is configured.
function resolveCredentials(provider?: string): { configured: boolean; reason?: string } {
  if (!provider) return { configured: true }; // No provider needed
  switch (provider) {
    case "github":
      return { configured: !!process.env.GITHUB_TOKEN };
    case "supabase":
      return { configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) };
    case "firebase":
      return { configured: !!process.env.FIREBASE_PROJECT_ID };
    case "railway":
      return { configured: !!process.env.RAILWAY_TOKEN };
    case "stellar":
      return { configured: !!process.env.STELLAR_SECRET_KEY };
    case "x402":
      return { configured: true }; // x402 uses Stellar credentials
    default:
      return { configured: false, reason: `unknown provider: ${provider}` };
  }
}

// Sanitize input for audit logs — never log secrets or raw keys.
function sanitizeInput(input: Json): Json {
  if (!input || typeof input !== "object") return input;
  const sanitized = { ...(input as Record<string, Json>) };
  const sensitiveKeys = ["token", "key", "secret", "password", "authorization"];
  for (const k of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      sanitized[k] = "***REDACTED***";
    }
  }
  return sanitized as Json;
}

// Execute with timeout.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`tool timeout after ${ms}ms`)), ms),
    ),
  ]);
}

let gateway: ToolGateway | null = null;
export function getToolGateway(): ToolGateway {
  if (!gateway) gateway = new ToolGateway();
  return gateway;
}

export { hasCapability } from "@security/permissions";
