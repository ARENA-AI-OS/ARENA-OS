import { NextResponse } from "next/server";
import { requireSession, errorResponse } from "@/lib/require-session";
import { listPendingSavingsActions } from "@/lib/db";

/** Pending savings proposals auto-created + auto-approved by a deposit event, awaiting the user's signature. */
export async function GET() {
  try {
    const session = await requireSession();
    const pending = listPendingSavingsActions(session.bmoni_user_id);
    return NextResponse.json({ pending });
  } catch (err) {
    return errorResponse(err);
  }
}
