import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session-core";

// Cookie helpers (need next/headers). The pure signing logic lives in
// ./session-core so middleware can use it without importing next/headers.

export { SESSION_COOKIE, signSession, verifySession };

export async function getSession(): Promise<{ email: string } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export async function setSessionCookie(email: string): Promise<void> {
  const token = await signSession(email);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<{ email: string }> {
  const s = await getSession();
  if (!s) throw new Error("unauthorized");
  return s;
}
