import { NextResponse } from "next/server";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import { getSecretsStore } from "@arena-os/security";
import type { PlatformConnection } from "@domain/index";

export async function POST(req: Request) {
  const body = await req.json();
  const { platform, credentials } = body;

  if (!platform || !credentials) {
    return NextResponse.json(
      { error: "platform and credentials are required" },
      { status: 400 }
    );
  }

  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const store = getSecretsStore();

  // Determine credential storage key based on platform
  const credKey = `${platform}-credentials`;

  // Store each credential value through the encrypted security module
  // Secrets are encrypted at rest and never returned to the client
  const credentialEntries = Object.entries(credentials).filter(
    ([, v]) => v && typeof v === "string" && v.trim()
  );

  if (credentialEntries.length === 0) {
    return NextResponse.json(
      { error: "no credentials provided" },
      { status: 400 }
    );
  }

  // Store the entire credential object as a single encrypted secret
  const plaintext = JSON.stringify(credentials);
  store.set(credKey, plaintext, { actor: "user" });

  // Create or update platform connection
  const connections = await repo.listPlatformConnections(ws.id);
  const existing = connections.find((c) => c.platform === platform);

  const conn: PlatformConnection = {
    id: existing?.id || shortId("PC"),
    workspaceId: ws.id,
    platform,
    label: existing?.label || platform,
    status: "connected",
    credentialReference: `secret:${credKey}`,
    scopes: existing?.scopes || [],
    lastUsedAt: nowIso(),
    lastTestAt: undefined,
    lastTestOk: undefined,
    network: body.network,
    meta: existing?.meta || {},
    createdAt: existing?.createdAt || nowIso(),
  };

  await repo.savePlatformConnection(conn);

  // Audit the connection
  await repo.appendAudit({
    id: `AE_${Date.now()}`,
    at: nowIso(),
    actor: "user",
    action: `platform.connect.${platform}`,
    detail: {
      method: "credentials",
      connectionId: conn.id,
      fieldsStored: credentialEntries.map(([k]) => k),
    },
  });

  return NextResponse.json({
    ok: true,
    connectionId: conn.id,
    status: "connected",
  });
}
