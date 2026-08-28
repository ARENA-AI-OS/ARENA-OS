import { NextResponse } from "next/server";
import { getSession } from "@security/session";
import { providerStatus } from "@db/index";

// GET /api/v1/models -> AI provider connection status (keys read server-side only)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ providers: providerStatus() });
}
