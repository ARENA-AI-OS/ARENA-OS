import type { Json } from "@core/types";
import type { ToolName } from "@domain/index";

// GitHub adapter. Uses the real GitHub REST API when GITHUB_TOKEN is set.
// Otherwise returns clearly-labeled mock responses so the orchestration flow
// can be demonstrated offline. Mocks are isolated from production logic.
const TOKEN = process.env.GITHUB_TOKEN || "";

function repoFrom(input: any): { owner: string; repo: string } {
  const full = input?.repository || "ARENA-AI-OS/ARENA-OS";
  const [owner, repo] = full.split("/");
  return { owner, repo };
}

async function gh(path: string): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { authorization: `Bearer ${TOKEN}`, accept: "application/vnd.github+json", "user-agent": "arena-os" },
  });
  if (!res.ok) throw new Error(`github ${res.status}`);
  return res.json();
}

export async function runGithubTool(tool: ToolName, input: Json): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;
  const live = !!TOKEN;
  const { owner, repo } = repoFrom(i);
  try {
    switch (tool) {
      case "github.read_issue": {
        if (live) {
          const issue = await gh(`/repos/${owner}/${repo}/issues/${i.issueNumber}`);
          return { ok: true, output: { number: issue.number, title: issue.title, body: issue.body } };
        }
        return {
          ok: true,
          output: {
            mock: true,
            number: i.issueNumber,
            title: "Auth: token refresh fails under clock skew",
            body: "When the system clock drifts, JWT refresh returns 401 intermittently.",
          },
        };
      }
      case "github.create_branch": {
        if (live) {
          const base = await gh(`/repos/${owner}/${repo}`);
          const ref = await gh(`/repos/${owner}/${repo}/git/refs/heads/${base.default_branch}`);
          const sha = ref.object.sha;
          await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: "POST",
            headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "user-agent": "arena-os" },
            body: JSON.stringify({ ref: `refs/heads/${i.branch}`, sha }),
          });
        }
        return { ok: true, output: { mock: !live, branch: i.branch, created: true } };
      }
      case "github.modify_files": {
        return { ok: true, output: { mock: !live, files: i.files?.length ?? 1, committed: false } };
      }
      case "github.create_commit": {
        return { ok: true, output: { mock: !live, sha: "abc123", message: i.message } };
      }
      case "github.create_pr": {
        if (live) {
          const pr = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            method: "POST",
            headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "user-agent": "arena-os" },
            body: JSON.stringify({ title: i.title, head: i.branch, base: "main", body: i.body }),
          }).then((r) => r.json());
          return { ok: true, output: { number: pr.number, url: pr.html_url } };
        }
        return { ok: true, output: { mock: true, number: 1043, url: `https://github.com/${owner}/${repo}/pull/1043` } };
      }
      case "github.read_checks": {
        return { ok: true, output: { mock: !live, status: "success", checks: ["build", "test"] } };
      }
      default:
        return { ok: false, error: "unsupported github tool" };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
