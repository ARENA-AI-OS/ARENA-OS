import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

/**
 * POST /api/proposals/:id/approve — step 2 of "Make it real". This is the
 * explicit-human-approval gate: the UI must have shown the user the
 * proposal and gotten a deliberate click before this is ever called. Never
 * call this automatically off a simulated recommendation.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { proposal } = await bmoni.approveProposal(session.bmoni_user_id, id);
    return NextResponse.json({ proposal });
  } catch (err) {
    return errorResponse(err);
  }
}
