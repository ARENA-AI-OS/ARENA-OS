import "server-only";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getSession, type OnboardingSession } from "@/lib/db";

export class SessionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(): Promise<OnboardingSession> {
  const bmoniUserId = await getSessionUserId();
  if (!bmoniUserId) throw new SessionError(401, "No active session. Start onboarding first.");
  const session = getSession(bmoniUserId);
  if (!session) throw new SessionError(404, "Session cookie is valid but no local record exists.");
  return session;
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof SessionError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const status = (err as { status?: number })?.status ?? 500;
  const body = (err as { body?: unknown })?.body;
  return NextResponse.json(
    { error: (err as Error)?.message ?? "Unknown error", detail: body },
    { status: typeof status === "number" ? status : 500 },
  );
}
