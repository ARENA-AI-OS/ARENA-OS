import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";
import { updateSession } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSession();
    const status = await bmoni.getOnboardingStatus(session.bmoni_user_id);

    const step = status.anchorStatus === "active" ? "active" : session.step;
    updateSession(session.bmoni_user_id, {
      onboarding_status_json: JSON.stringify(status),
      step,
    });

    return NextResponse.json(status);
  } catch (err) {
    return errorResponse(err);
  }
}
