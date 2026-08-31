import type { Json } from "@core/types";
import type { ToolName } from "@domain/index";

// Railway adapter. Uses the Railway GraphQL API when RAILWAY_TOKEN is set.
// Production deployments (railway:deploy_production) require elevated approval.
// Preview deploys (railway:deploy_preview) are allowed for deployment agents.

const TOKEN = process.env.RAILWAY_TOKEN || "";
const API_URL = "https://railway.app/graphql";

async function railwayQuery(query: string, variables?: Record<string, unknown>): Promise<any> {
  if (!TOKEN) throw new Error("railway not configured (set RAILWAY_TOKEN)");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`railway ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`railway: ${data.errors[0]?.message ?? "unknown error"}`);
  return data.data;
}

export async function runRailwayTool(
  tool: ToolName,
  input: Json,
): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;
  const live = !!TOKEN;

  try {
    switch (tool) {
      // ── List Projects ────────────────────────────────────────────────
      case "railway.list_projects": {
        if (live) {
          const data = await railwayQuery(`{ projects { edges { node { id name createdAt } } } }`);
          const projects = data.projects?.edges?.map((e: any) => e.node) ?? [];
          return { ok: true, output: { projects, count: projects.length } };
        }
        return {
          ok: true,
          output: {
            mock: true,
            projects: [
              { id: "proj_arena", name: "arena-os", createdAt: new Date().toISOString() },
              { id: "proj_receiptor", name: "receiptor", createdAt: new Date().toISOString() },
            ],
            count: 2,
          },
        };
      }

      // ── Deploy Preview ───────────────────────────────────────────────
      case "railway.deploy_preview": {
        if (live) {
          // Trigger a preview deployment via Railway API
          const projectId = i.projectId || i.project;
          const data = await railwayQuery(
            `mutation { triggerDeploy(input: { projectId: "${projectId}", environmentId: "preview" }) { id status url } }`,
          );
          return {
            ok: true,
            output: {
              deploymentId: data.triggerDeploy?.id,
              status: data.triggerDeploy?.status ?? "building",
              deploymentUrl: data.triggerDeploy?.url,
              environment: "preview",
            },
          };
        }
        return {
          ok: true,
          output: {
            mock: true,
            deploymentId: "dep_preview_" + Date.now(),
            deploymentUrl: `https://${i.project ?? "arena"}-preview.railway.app`,
            status: "building",
            environment: "preview",
          },
        };
      }

      // ── Get Deployment Status ────────────────────────────────────────
      case "railway.get_deployment_status": {
        if (live) {
          const deploymentId = i.deploymentId;
          const data = await railwayQuery(
            `query { deployment(id: "${deploymentId}") { id status url createdAt updatedAt } }`,
          );
          const dep = data.deployment;
          return {
            ok: true,
            output: {
              deploymentId: dep.id,
              status: dep.status,
              url: dep.url,
              createdAt: dep.createdAt,
              updatedAt: dep.updatedAt,
            },
          };
        }
        return {
          ok: true,
          output: {
            mock: true,
            deploymentId: i.deploymentId || "dep_latest",
            status: "success",
            url: `https://${i.project ?? "arena"}.railway.app`,
            createdAt: new Date(Date.now() - 60000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }

      // ── Get Logs ─────────────────────────────────────────────────────
      case "railway.get_logs": {
        if (live) {
          const serviceId = i.serviceId;
          const data = await railwayQuery(
            `query { logs(serviceId: "${serviceId}", limit: ${i.limit || 50}) { edges { node { id message timestamp } } } }`,
          );
          const logs = data.logs?.edges?.map((e: any) => e.node) ?? [];
          return {
            ok: true,
            output: { logs, count: logs.length },
          };
        }
        return {
          ok: true,
          output: {
            mock: true,
            logs: [
              { id: "log1", message: "Build started...", timestamp: new Date(Date.now() - 5000).toISOString() },
              { id: "log2", message: "Dependencies installed", timestamp: new Date(Date.now() - 3000).toISOString() },
              { id: "log3", message: "Build successful", timestamp: new Date().toISOString() },
            ],
            count: 3,
          },
        };
      }

      default:
        return { ok: false, error: `unsupported railway tool: ${tool}` };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
