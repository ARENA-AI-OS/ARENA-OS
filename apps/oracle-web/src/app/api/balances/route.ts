import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

/** GET /api/balances — real balances from BMONI. Nothing mocked here. */
export async function GET() {
  try {
    const session = await requireSession();
    const balances = await bmoni.listBalances(session.bmoni_user_id);
    return NextResponse.json(balances);
  } catch (err) {
    return errorResponse(err);
  }
}
