import { NextRequest, NextResponse } from "next/server";
import { signSession, verifySession, SESSION_COOKIE } from "@security/session";

// POST /api/auth/login  { email, password }
// Demo auth: accepts the seed credentials from env, or any non-empty pair when
// running on the memory driver for local exploration. Replace with a real
// identity provider before production.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "");
  const password = String(body.password || "");

  const seedEmail = process.env.ARENA_SEED_EMAIL || "dev@arena.os";
  const seedPassword = process.env.ARENA_SEED_PASSWORD || "arena-dev";

  const ok = email === seedEmail && password === seedPassword;
  if (!ok) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const token = await signSession(email);
  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
