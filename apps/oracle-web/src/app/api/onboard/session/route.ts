import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getSession } from "@/lib/db";

/** Lets the client recover onboarding progress after a page refresh. */
export async function GET() {
  const bmoniUserId = await getSessionUserId();
  if (!bmoniUserId) return NextResponse.json({ session: null });

  const session = getSession(bmoniUserId);
  if (!session) return NextResponse.json({ session: null });

  return NextResponse.json({
    session: {
      bmoniUserId: session.bmoni_user_id,
      firstName: session.first_name,
      lastName: session.last_name,
      ownerAddress: session.owner_address,
      smartWalletId: session.smart_wallet_id,
      smartWalletAddress: session.smart_wallet_address,
      step: session.step,
      bvn: session.bvn,
      onboardingStatus: session.onboarding_status_json
        ? JSON.parse(session.onboarding_status_json)
        : null,
    },
  });
}
