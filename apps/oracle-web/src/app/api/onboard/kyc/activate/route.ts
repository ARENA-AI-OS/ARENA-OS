import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

/**
 * POST /api/onboard/kyc/activate — the Global-KYC step. Required before the
 * USD rail; NOT required for Nigeria's local (NGN) rail, which activates
 * directly through /onboard/start-nigeria. See lib/bmoni.ts for the
 * live-verified note on this.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const result = await bmoni.activateKyc(session.bmoni_user_id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
