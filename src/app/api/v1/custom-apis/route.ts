import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import type { CustomApi } from "@domain/index";

// GET /api/v1/custom-apis -> list all custom APIs
// POST /api/v1/custom-apis -> create a new custom API
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const apis = await repo.listCustomApis(ws.id);

  // Enrich with endpoint counts and assignment info
  const enriched = await Promise.all(
    apis.map(async (api) => {
      const endpoints = await repo.listCustomApiEndpoints(api.id);
      const assignments = await repo.listAgentApiAssignments();
      const myAssignments = assignments.filter((a) => a.customApiId === api.id);
      return {
        ...api,
        endpointCount: endpoints.length,
        assignedAgent: myAssignments[0]?.agentId || null,
      };
    }),
  );

  return NextResponse.json({ customApis: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();

  const api: CustomApi = {
    id: shortId("API"),
    workspaceId: ws.id,
    name: String(body.name || "Untitled API"),
    description: String(body.description || ""),
    baseUrl: String(body.baseUrl || ""),
    authType: body.authType || "none",
    credentialReference: String(body.credentialReference || ""),
    requestConfig: body.requestConfig || {},
    status: "active",
    createdAt: nowIso(),
    createdBy: session.userId || "user",
  };

  await repo.saveCustomApi(api);
  await repo.appendAudit({
    id: shortId("AE"),
    at: nowIso(),
    actor: "user",
    action: "custom_api.created",
    detail: { apiId: api.id, name: api.name },
  });

  return NextResponse.json({ customApi: api });
}
