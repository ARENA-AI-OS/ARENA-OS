import type { Json } from "@core/types";
import type { ToolName } from "@domain/index";

// Vercel adapter. Uses the Vercel REST API (api.vercel.com).
// Credentials: VERCEL_TOKEN (read server-side only via process.env).

const API_BASE = "https://api.vercel.com";

function getConfig() {
  const token = process.env.VERCEL_TOKEN || "";
  return { token, configured: !!token };
}

async function vercelFetch(path: string, opts?: { method?: string; body?: any }): Promise<any> {
  const { token, configured } = getConfig();
  if (!configured) throw new Error("vercel not configured — set VERCEL_TOKEN");
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`vercel ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function runVercelTool(
  tool: ToolName,
  input: Json,
): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;
  const { configured } = getConfig();

  if (!configured) {
    return { ok: false, error: "vercel not configured — set VERCEL_TOKEN" };
  }

  try {
    switch (tool) {
      case "vercel.list_projects": {
        const limit = Math.min(i.limit || 20, 100);
        const data = await vercelFetch(`/v9/projects?limit=${limit}`);
        return {
          ok: true,
          output: {
            projects: (data.projects ?? []).map((p: any) => ({
              id: p.id,
              name: p.name,
              framework: p.framework,
              latestDeployment: p.latestDeployments?.[0]
                ? {
                    id: p.latestDeployments[0].id,
                    url: p.latestDeployments[0].url,
                    state: p.latestDeployments[0].state,
                    createdAt: p.latestDeployments[0].created,
                  }
                : undefined,
            })),
          },
        };
      }

      case "vercel.get_deployment_status": {
        const deployId = i.deploymentId || i.deployment_id;
        if (!deployId) return { ok: false, error: "missing deploymentId" };
        const data = await vercelFetch(`/v13/deployments/${deployId}`);
        return {
          ok: true,
          output: {
            id: data.id,
            name: data.name,
            state: data.readyState,
            url: data.url,
            inspectorUrl: data.inspectorUrl,
            createdAt: data.created,
            ready: data.readyState === "READY",
            target: data.target,
          },
        };
      }

      case "vercel.get_logs": {
        const did = i.deploymentId || i.deployment_id;
        if (!did) return { ok: false, error: "missing deploymentId" };
        const data = await vercelFetch(`/v2/deployments/${did}/events?limit=100`);
        return {
          ok: true,
          output: {
            deploymentId: did,
            logs: (data ?? []).map((e: any) => ({
              type: e.type,
              text: e.payload?.text || "",
              createdAt: e.created,
            })).slice(0, 50),
          },
        };
      }

      case "vercel.deploy_preview": {
        const name = i.name || i.project;
        if (!name) return { ok: false, error: "missing name/project" };
        const data = await vercelFetch("/v13/deployments", {
          method: "POST",
          body: {
            name,
            target: "preview",
            gitSource: i.gitSource || undefined,
          },
        });
        return {
          ok: true,
          output: {
            deploymentId: data.id,
            url: data.url,
            state: data.readyState,
            target: "preview",
          },
        };
      }

      case "vercel.deploy_production": {
        const name = i.name || i.project;
        if (!name) return { ok: false, error: "missing name/project" };
        const data = await vercelFetch("/v13/deployments", {
          method: "POST",
          body: {
            name,
            target: "production",
            gitSource: i.gitSource || undefined,
          },
        });
        return {
          ok: true,
          output: {
            deploymentId: data.id,
            url: data.url,
            state: data.readyState,
            target: "production",
          },
        };
      }

      case "vercel.get_domains": {
        const projectId = i.projectId || i.project_id || i.name;
        if (!projectId) return { ok: false, error: "missing projectId" };
        const data = await vercelFetch(`/v9/projects/${projectId}/domains`);
        return {
          ok: true,
          output: {
            domains: (data.domains ?? []).map((d: any) => ({
              name: d.name,
              verified: d.verified,
              createdAt: d.created,
            })),
          },
        };
      }

      default:
        return { ok: false, error: `unknown vercel tool: ${tool}` };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Test connection — lightweight read-only call
export async function testVercelConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await vercelFetch("/v2/user");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
