import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

/** GET /api/proposals/:id — poll for terminal status (PENDING_* -> COMPLETED). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { proposal } = await bmoni.getProposal(session.bmoni_user_id, id);
    return NextResponse.json({ proposal });
  } catch (err) {
    return errorResponse(err);
  }
}
