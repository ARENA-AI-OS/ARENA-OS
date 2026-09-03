import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

const Input = z.object({
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/, "expected a 65-byte 0x-prefixed signature"),
});

/**
 * POST /api/proposals/:id/sign — step 4 of "Make it real": submit the
 * client-produced signature. This is a relay only — the signature was
 * produced in the browser, this route never touches a private key.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { signature } = Input.parse(await req.json());
    const { proposal } = await bmoni.submitProposalSignature(session.bmoni_user_id, id, signature);
    return NextResponse.json({ proposal });
  } catch (err) {
    return errorResponse(err);
  }
}
