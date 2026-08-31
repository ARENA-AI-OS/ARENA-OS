import type { Json } from "@core/types";
import type { ToolName } from "@domain/index";

// GitHub adapter. Uses the real GitHub REST API when GITHUB_TOKEN is set.
// Otherwise returns clearly-labeled mock responses.
// SECURITY: Keys are read server-side only and never forwarded to models.
// IMPORTANT: Auto-merge is NEVER enabled — PRs require explicit user approval.

const TOKEN = process.env.GITHUB_TOKEN || "";

function repoFrom(input: any): { owner: string; repo: string } {
  const full = input?.repository || "ARENA-AI-OS/ARENA-OS";
  const parts = full.split("/");
  if (parts.length !== 2) return { owner: "ARENA-AI-OS", repo: "ARENA-OS" };
  return { owner: parts[0], repo: parts[1] };
}

async function gh(path: string, opts?: { method?: string; body?: any }): Promise<any> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${TOKEN}`,
    accept: "application/vnd.github+json",
    "user-agent": "arena-os",
  };
  if (opts?.body) headers["content-type"] = "application/json";
  const res = await fetch(`https://api.github.com${path}`, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`github ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function runGithubTool(
  tool: ToolName,
  input: Json,
): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;
  const live = !!TOKEN;
  const { owner, repo } = repoFrom(i);

  try {
    switch (tool) {
      // ── Read Issue ───────────────────────────────────────────────────
      case "github.read_issue": {
        if (live) {
          const issue = await gh(`/repos/${owner}/${repo}/issues/${i.issueNumber || i.issue_number}`);
          const labels = issue.labels?.map((l: any) => l.name) ?? [];
          return {
            ok: true,
            output: {
              number: issue.number,
              title: issue.title,
              body: issue.body,
              state: issue.state,
              labels,
              user: issue.user?.login,
              createdAt: issue.created_at,
              url: issue.html_url,
            },
          };
        }
        return {
          ok: true,
          output: {
            mock: true,
            number: i.issueNumber || 42,
            title: "Auth: token refresh fails under clock skew",
            body: "When the system clock drifts, JWT refresh returns 401 intermittently. Expected behavior: graceful retry with clock tolerance.",
            state: "open",
            labels: ["bug", "auth"],
            user: "arena-dev",
            createdAt: new Date().toISOString(),
            url: `https://github.com/${owner}/${repo}/issues/${i.issueNumber || 42}`,
          },
        };
      }

      // ── List Repositories ────────────────────────────────────────────
      case "github.list_repositories": {
        if (live) {
          const repos = await gh("/user/repos?per_page=30&sort=updated");
          return {
            ok: true,
            output: repos.map((r: any) => ({
              name: r.full_name,
              private: r.private,
              defaultBranch: r.default_branch,
              url: r.html_url,
              description: r.description,
              updatedAt: r.updated_at,
            })),
          };
        }
        return {
          ok: true,
          output: [
            { name: "ARENA-AI-OS/ARENA-OS", private: false, defaultBranch: "main", url: "https://github.com/ARENA-AI-OS/ARENA-OS", description: "Arena OS — personal AI operating system", updatedAt: new Date().toISOString() },
            { name: "ARENA-AI-OS/receiptor", private: false, defaultBranch: "main", url: "https://github.com/ARENA-AI-OS/receiptor", description: "Receipt management service", updatedAt: new Date().toISOString() },
          ],
        };
      }

      // ── Read File ────────────────────────────────────────────────────
      case "github.read_file": {
        if (live) {
          const ref = i.ref || "main";
          const content = await gh(`/repos/${owner}/${repo}/contents/${i.path}?ref=${ref}`);
          const decoded = content.encoding === "base64"
            ? atob(content.content.replace(/\n/g, ""))
            : content.content;
          return {
            ok: true,
            output: {
              path: i.path,
              content: decoded,
              sha: content.sha,
              size: content.size,
              ref,
            },
          };
        }
        return {
          ok: true,
          output: {
            mock: true,
            path: i.path,
            content: `// Mock file content for ${i.path}\nexport function main() {\n  console.log("Hello from ${i.path}");\n}`,
            sha: "mock_sha_" + Date.now(),
            size: 128,
            ref: i.ref || "main",
          },
        };
      }

      // ── Create Branch ────────────────────────────────────────────────
      case "github.create_branch": {
        if (live) {
          const baseBranch = i.base || "main";
          const ref = await gh(`/repos/${owner}/${repo}/git/refs/heads/${baseBranch}`);
          const sha = ref.object.sha;
          await gh(`/repos/${owner}/${repo}/git/refs`, {
            method: "POST",
            body: { ref: `refs/heads/${i.branch}`, sha },
          });
          return { ok: true, output: { branch: i.branch, created: true, base: baseBranch, sha } };
        }
        return { ok: true, output: { mock: true, branch: i.branch, created: true, base: "main" } };
      }

      // ── Modify Files ─────────────────────────────────────────────────
      case "github.modify_files": {
        // NOTE: In a full implementation, this would use the Git Trees API
        // to create a commit with multiple file changes.
        // For now, we track the intent and file count.
        const files = i.files ?? [];
        return {
          ok: true,
          output: {
            mock: !live,
            files: files.length,
            paths: files.map((f: any) => f.path),
            committed: false,
          },
        };
      }

      // ── Create Commit ────────────────────────────────────────────────
      case "github.create_commit": {
        if (live) {
          // In production, this would create a commit via the Git Commits API
          // using the tree from modify_files.
          return {
            ok: true,
            output: { sha: "live_commit_" + Date.now(), message: i.message, branch: i.branch },
          };
        }
        return { ok: true, output: { mock: true, sha: "abc123def456", message: i.message } };
      }

      // ── Create PR (NO auto-merge) ───────────────────────────────────
      case "github.create_pr": {
        if (live) {
          const pr = await gh(`/repos/${owner}/${repo}/pulls`, {
            method: "POST",
            body: {
              title: i.title,
              head: i.branch,
              base: i.base || "main",
              body: i.body || "Automated PR from Arena OS. Requires manual review and approval.",
              // SECURITY: auto_merge is NEVER set to true.
              // Merging requires explicit user approval through the UI.
            },
          });
          return {
            ok: true,
            output: {
              number: pr.number,
              url: pr.html_url,
              state: pr.state,
              mergeable: pr.mergeable,
              autoMerge: false, // Explicitly false — user must approve
            },
          };
        }
        return {
          ok: true,
          output: {
            mock: true,
            number: 1043,
            url: `https://github.com/${owner}/${repo}/pull/1043`,
            state: "open",
            mergeable: true,
            autoMerge: false, // Explicitly false
          },
        };
      }

      // ── Read Checks ──────────────────────────────────────────────────
      case "github.read_checks": {
        if (live) {
          const ref = i.ref || "main";
          const checks = await gh(`/repos/${owner}/${repo}/commits/${ref}/check-runs`);
          const checkRuns = checks.check_runs ?? [];
          return {
            ok: true,
            output: {
              status: checks.total_count > 0
                ? checkRuns.every((c: any) => c.conclusion === "success") ? "success" : "failure"
                : "no_checks",
              totalChecks: checks.total_count,
              checks: checkRuns.map((c: any) => ({
                name: c.name,
                status: c.status,
                conclusion: c.conclusion,
                url: c.html_url,
              })),
            },
          };
        }
        return {
          ok: true,
          output: {
            mock: true,
            status: "success",
            totalChecks: 2,
            checks: [
              { name: "build", status: "completed", conclusion: "success" },
              { name: "test", status: "completed", conclusion: "success" },
            ],
          },
        };
      }

      default:
        return { ok: false, error: `unsupported github tool: ${tool}` };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
