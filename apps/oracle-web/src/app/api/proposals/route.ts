import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

const Input = z.object({
  toAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amount: z.string().min(1),
  currency: z.string().default("CNGN"),
  description: z.string().optional(),
});

/**
 * POST /api/proposals — step 1 of "Make it real": create a TRANSFER
 * proposal. Nothing moves yet; this only records intent. Approval and
 * signing are separate steps the human must explicitly drive.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session.smart_wallet_id) {
      return NextResponse.json({ error: "No smart wallet on this session." }, { status: 409 });
    }
    const input = Input.parse(await req.json());

    const { proposal } = await bmoni.createTransferProposal(session.bmoni_user_id, session.smart_wallet_id, {
      type: "TRANSFER",
      toAddress: input.toAddress,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
    });

    return NextResponse.json({ proposal });
  } catch (err) {
    return errorResponse(err);
  }
}
