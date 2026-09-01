import { NextResponse } from "next/server";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import type { PlatformConnection } from "@domain/index";

export async function GET() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const connections = await repo.listPlatformConnections(ws.id);
  return NextResponse.json(connections);
}

export async function POST(req: Request) {
  const body = await req.json();
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const conn: PlatformConnection = {
    id: shortId("PC"),
    workspaceId: ws.id,
    platform: body.platform,
    label: body.label || body.platform,
    status: "disconnected",
    credentialReference: body.credentialReference || "",
    scopes: body.scopes || [],
    network: body.network,
    meta: body.meta || {},
    createdAt: nowIso(),
  };
  await repo.savePlatformConnection(conn);
  return NextResponse.json(conn, { status: 201 });
}
