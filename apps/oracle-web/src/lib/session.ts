import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Minimal auth: a session cookie holding the bmoniUserId, HMAC-signed so it
 * can't be forged, tied to nothing else. Not a full accounts system —
 * intentionally, per scope (hackathon-grade, see README).
 */

const COOKIE_NAME = "oracle_session";
const SECRET = process.env.SESSION_SECRET ?? "";

function sign(value: string): string {
  if (!SECRET) throw new Error("SESSION_SECRET is not set.");
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

function pack(bmoniUserId: string): string {
  const sig = sign(bmoniUserId);
  return `${bmoniUserId}.${sig}`;
}

function unpack(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const value = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(value);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

export async function setSessionCookie(bmoniUserId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, pack(bmoniUserId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return unpack(token);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
