import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, errorResponse } from "@/lib/require-session";
import { handleDepositEvent } from "@/lib/autosave";

const Input = z.object({ amount: z.string().min(1) });

/**
 * POST /api/autosave/simulate-deposit — TEST-ONLY. Directly invokes the
 * same handling a real `employee.deposit.completed` webhook would trigger
 * (lib/autosave.ts), bypassing webhook signature verification entirely.
 *
 * This exists because there is no way to make BMONI actually fire that
 * webhook at a local dev server (see /api/webhooks/bmoni's docstring) —
 * so this is how the create+approve logic gets exercised against the
 * real sandbox without a real deposit or a real webhook delivery. It
 * proves the BMONI calls work; it does NOT prove the webhook pipeline
 * (signature verification -> dispatch -> this handler) does, since it
 * skips straight past that pipeline. Do not expose this in a real
 * deployment without gating it — it lets any authenticated session
 * fabricate a "deposit" of an arbitrary size against their own rule.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { amount } = Input.parse(await req.json());
    const result = await handleDepositEvent({ bmoniUserId: session.bmoni_user_id, amount, currency: "NGN" });
    if (!result) {
      return NextResponse.json({ triggered: false, reason: "No active rule, or computed save amount was zero." });
    }
    return NextResponse.json({ triggered: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
