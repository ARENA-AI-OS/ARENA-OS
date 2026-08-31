import { hmacHex } from "@core/crypto";

// Pure session-signing logic with NO next/headers import, so it can be safely
// used from middleware. The cookie helpers that need next/headers live in
// ./session.

export const SESSION_COOKIE = "arena_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.ARENA_SESSION_SECRET || "dev-only-change-me";
}

export interface SessionPayload {
  userId: string;
  email: string;
  role?: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString("base64url");
  const sig = await hmacHex(body, secret());
  return `${body}.${sig}`;
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmacHex(body, secret());
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!data.userId || !data.email) return null;
    return { userId: data.userId, email: data.email, role: data.role };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE;
