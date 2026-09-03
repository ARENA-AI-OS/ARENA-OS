import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";
import { updateSession } from "@/lib/db";

const Input = z.object({
  userOwnerAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  ownerProofChallengeId: z.string().min(1),
  ownerProofSignature: z.string().regex(/^0x[0-9a-fA-F]{130}$/, "expected a 65-byte 0x-prefixed signature"),
  currency: z.string().default("CNGN"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const input = Input.parse(await req.json());

    const wallet = await bmoni.createManagedSmartWallet(session.bmoni_user_id, input);
    updateSession(session.bmoni_user_id, {
      smart_wallet_id: wallet.id,
      smart_wallet_address: wallet.walletAddress,
      step: "wallet_created",
    });

    return NextResponse.json(wallet);
  } catch (err) {
    return errorResponse(err);
  }
}
