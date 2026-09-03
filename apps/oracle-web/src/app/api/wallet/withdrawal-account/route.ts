import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

const Input = z.object({
  accountNumber: z.string().regex(/^\d{10}$/),
  bankCode: z.string().min(1),
  bankName: z.string().min(1),
  accountHolderName: z.string().min(1),
});

/** Get-or-create — safe to call again with the same account. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const input = Input.parse(await req.json());
    const result = await bmoni.registerNigerianWithdrawalAccount(session.bmoni_user_id, input);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
