import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

const Input = z.object({
  bankAccountId: z.string().min(1),
  amount: z.string().min(1),
});

/**
 * POST /api/wallet/withdraw — creates the offramp proposal only. Nothing
 * moves yet: same approve -> sign-payload -> sign cycle as every other
 * proposal, driven from the wallet UI.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session.smart_wallet_id) {
      return NextResponse.json({ error: "No smart wallet on this session." }, { status: 409 });
    }
    const { bankAccountId, amount } = Input.parse(await req.json());
    const result = await bmoni.createNigeriaOfframp(session.bmoni_user_id, session.smart_wallet_id, bankAccountId, amount);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
