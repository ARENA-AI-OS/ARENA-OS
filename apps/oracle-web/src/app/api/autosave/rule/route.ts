import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, errorResponse } from "@/lib/require-session";
import { upsertSavingsRule, getSavingsRule, deactivateSavingsRule } from "@/lib/db";

const Input = z.object({
  ruleType: z.enum(["percentage", "roundup"]),
  param: z.number().positive(),
  destinationAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

export async function GET() {
  try {
    const session = await requireSession();
    const rule = getSavingsRule(session.bmoni_user_id);
    return NextResponse.json({ rule: rule ?? null });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session.smart_wallet_id) {
      return NextResponse.json({ error: "No smart wallet on this session." }, { status: 409 });
    }
    const input = Input.parse(await req.json());
    if (input.ruleType === "percentage" && input.param > 10000) {
      return NextResponse.json({ error: "Percentage cannot exceed 100% (10000 bps)." }, { status: 400 });
    }
    upsertSavingsRule({
      bmoniUserId: session.bmoni_user_id,
      smartWalletId: session.smart_wallet_id,
      ruleType: input.ruleType,
      param: input.param,
      destinationAddress: input.destinationAddress,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    deactivateSavingsRule(session.bmoni_user_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
