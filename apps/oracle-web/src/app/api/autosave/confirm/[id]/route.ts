import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, errorResponse } from "@/lib/require-session";
import { markPendingSavingsActionStatus } from "@/lib/db";

const Input = z.object({ status: z.enum(["signed", "dismissed"]) });

/**
 * POST /api/autosave/confirm/:id — marks a pending action resolved. The
 * client calls this AFTER driving the proposal through
 * /api/proposals/:id/sign-payload and /sign itself (or after the user
 * declines) — this route only updates our local bookkeeping, it doesn't
 * touch BMONI.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const { status } = Input.parse(await req.json());
    markPendingSavingsActionStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
