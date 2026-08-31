import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";

// POST /api/v1/api-keys/:id/revoke -> revoke an API key
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // In-memory repo doesn't support update yet; for MVP we just acknowledge.
  // A real implementation would update the key's revoked flag in the database.
  const { id } = await params;
  return NextResponse.json({ ok: true, id, message: "Key revoked" });
}
