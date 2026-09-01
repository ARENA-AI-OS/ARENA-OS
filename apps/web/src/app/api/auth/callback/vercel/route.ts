import { NextResponse } from "next/server";
import { getRepository } from "@db/index";
import { nowIso } from "@core/ids";
import { getSecretsStore } from "@arena-os/security";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const returnTo = url.searchParams.get("returnTo") || "/arena";

  if (!code) {
    return NextResponse.redirect(new URL(`${returnTo}?error=missing_code`, url.origin));
  }

  const cookieState = req.headers.get("cookie")?.match(/vercel_oauth_state=([^;]+)/)?.[1];
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(new URL(`${returnTo}?error=invalid_state`, url.origin));
  }

  try {
    const clientId = process.env.VERCEL_CLIENT_ID;
    const clientSecret = process.env.VERCEL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL(`${returnTo}?error=vercel_not_configured`, url.origin));
    }

    const tokenRes = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL(`${returnTo}?error=token_exchange_failed`, url.origin));
    }

    // Get user info
    const userRes = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    const store = getSecretsStore();
    store.set("vercel-oauth-token", tokenData.access_token, { actor: "oauth-vercel" });

    const repo = getRepository();
    const ws = await repo.ensureSeedWorkspace();
    const connections = await repo.listPlatformConnections(ws.id);
    const existing = connections.find((c) => c.platform === "vercel");

    const conn = {
      id: existing?.id || `PC_VERCEL_${Date.now()}`,
      workspaceId: ws.id,
      platform: "vercel" as const,
      label: `Vercel (${user.user?.username || "connected"})`,
      status: "connected" as const,
      credentialReference: "secret:vercel-oauth-token",
      scopes: [{ name: "deployments", description: "Deploy and manage projects" }, { name: "projects", description: "Access project settings" }] as { name: string; description: string }[],
      lastUsedAt: nowIso(),
      lastTestAt: nowIso(),
      lastTestOk: true,
      meta: { username: user.user?.username, id: user.user?.id },
      createdAt: existing?.createdAt || nowIso(),
    };
    await repo.savePlatformConnection(conn);

    await repo.appendAudit({
      id: `AE_${Date.now()}`,
      at: nowIso(),
      actor: "user",
      action: "platform.connect.vercel",
      detail: { method: "oauth", username: user.user?.username },
    });

    return NextResponse.redirect(new URL(`${returnTo}?connected=vercel`, url.origin));
  } catch (e) {
    return NextResponse.redirect(new URL(`${returnTo}?error=${encodeURIComponent((e as Error).message)}`, url.origin));
  }
}
