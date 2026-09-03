import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";
import { updateSession } from "@/lib/db";

const Input = z.object({
  bvn: z.string().regex(/^\d{11}$/, "BVN must be exactly 11 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session.smart_wallet_address) {
      return NextResponse.json(
        { error: "Smart wallet must exist before starting Nigeria onboarding." },
        { status: 409 },
      );
    }
    const { bvn } = Input.parse(await req.json());

    const result = await bmoni.startNigeria(session.bmoni_user_id, {
      bvn,
      ngnWalletAddress: session.smart_wallet_address,
      ngnWalletIndex: 0,
    });
    updateSession(session.bmoni_user_id, { bvn, step: "rail_starting" });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
