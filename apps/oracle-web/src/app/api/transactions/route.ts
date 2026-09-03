import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

/** GET /api/transactions — real transaction history, used to derive burn rate. */
export async function GET() {
  try {
    const session = await requireSession();
    if (!session.smart_wallet_id) {
      return NextResponse.json({ transactions: [], total: 0 });
    }
    const result = await bmoni.listTransactions(session.bmoni_user_id, session.smart_wallet_id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
