import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";
import { updateSession } from "@/lib/db";

const Input = z.object({
  userOwnerAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  currency: z.string().default("CNGN"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { userOwnerAddress, currency } = Input.parse(await req.json());

    const challenge = await bmoni.requestOwnerProofChallenge(
      session.bmoni_user_id,
      currency,
      userOwnerAddress,
    );
    updateSession(session.bmoni_user_id, { owner_address: userOwnerAddress, step: "wallet_challenge" });

    return NextResponse.json(challenge);
  } catch (err) {
    return errorResponse(err);
  }
}
