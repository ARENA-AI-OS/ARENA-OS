import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

export async function GET() {
  try {
    const session = await requireSession();
    const result = await bmoni.listNigerianBanks(session.bmoni_user_id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
