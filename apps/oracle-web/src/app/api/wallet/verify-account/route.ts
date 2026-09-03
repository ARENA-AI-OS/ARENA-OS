import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

const Input = z.object({
  accountNumber: z.string().regex(/^\d{10}$/, "NUBAN must be exactly 10 digits"),
  bankCode: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { accountNumber, bankCode } = Input.parse(await req.json());
    const result = await bmoni.verifyNigerianAccount(session.bmoni_user_id, accountNumber, bankCode);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
