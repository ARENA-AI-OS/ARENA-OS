import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

/**
 * GET — the NGN deposit account(s) to show the user. Live-verified: a
 * freshly onboarded user gets a pooled/shared account resolved by
 * `depositMessage` (a reference to include on the transfer), not a
 * personal NUBAN — so there's no separate "register" step for this case.
 * bmoni.linkNgnDepositAccount exists for the personal-VBA case but isn't
 * reachable from standard onboarding in the sandbox — see lib/bmoni.ts.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const result = await bmoni.getNgnDepositAccounts(session.bmoni_user_id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
