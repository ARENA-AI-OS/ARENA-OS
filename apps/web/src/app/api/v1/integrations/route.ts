import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";
import { uuid, nowIso } from "@core/ids";
import type { Integration } from "@domain/index";

// GET /api/v1/integrations -> list connected integrations
// POST /api/v1/integrations -> connect an integration (mock for demo)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  return NextResponse.json({ integrations: await repo.listIntegrations(ws.id) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const integration: Integration = {
    id: body.id || uuid(),
    workspaceId: ws.id,
    type: body.type,
    name: body.name || body.type,
    connected: true,
    meta: body.meta ?? {},
  };
  await repo.upsertIntegration(integration);
  await repo.appendAudit({ id: uuid(), at: nowIso(), actor: "user", action: `integration.connected.${integration.type}`, detail: { id: integration.id } });
  return NextResponse.json({ integration });
}
