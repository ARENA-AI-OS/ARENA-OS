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

  // Validate state parameter (CSRF protection)
  const cookieState = req.headers.get("cookie")?.match(/github_oauth_state=([^;]+)/)?.[1];
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(new URL(`${returnTo}?error=invalid_state`, url.origin));
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL(`${returnTo}?error=github_not_configured`, url.origin));
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL(`${returnTo}?error=token_exchange_failed`, url.origin));
    }

    // Get user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    // Store token in encrypted security module
    const store = getSecretsStore();
    store.set("github-oauth-token", tokenData.access_token, { actor: "oauth-github" });

    // Update or create platform connection
    const repo = getRepository();
    const ws = await repo.ensureSeedWorkspace();
    const connections = await repo.listPlatformConnections(ws.id);
    const existing = connections.find((c) => c.platform === "github");

    const conn = {
      id: existing?.id || `PC_GITHUB_${Date.now()}`,
      workspaceId: ws.id,
      platform: "github" as const,
      label: `GitHub (${user.login || "connected"})`,
      status: "connected" as const,
      credentialReference: "secret:github-oauth-token",
      scopes: (tokenData.scope?.split(",") || ["repo", "read:user"]).map((s: string) => ({ name: s, description: s })),
      lastUsedAt: nowIso(),
      lastTestAt: nowIso(),
      lastTestOk: true,
      meta: { login: user.login, id: user.id, avatar_url: user.avatar_url },
      createdAt: existing?.createdAt || nowIso(),
    };
    await repo.savePlatformConnection(conn);

    // Audit
    await repo.appendAudit({
      id: `AE_${Date.now()}`,
      at: nowIso(),
      actor: "user",
      action: "platform.connect.github",
      detail: { method: "oauth", login: user.login },
    });

    return NextResponse.redirect(new URL(`${returnTo}?connected=github`, url.origin));
  } catch (e) {
    return NextResponse.redirect(new URL(`${returnTo}?error=${encodeURIComponent((e as Error).message)}`, url.origin));
  }
}
