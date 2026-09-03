import { NextRequest, NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";
import { updateSession } from "@/lib/db";

/** PATCH /api/onboard/kyc — body is a bmoni.KycProfilePatch, relayed as-is. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const patch = (await req.json()) as bmoni.KycProfilePatch;

    const result = await bmoni.patchKyc(session.bmoni_user_id, patch);

    const bvn = patch.identificationNumbers?.find((n) => n.type === "bvn")?.number;
    updateSession(session.bmoni_user_id, {
      step: "kyc_submitted",
      ...(bvn ? { bvn } : {}),
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET() {
  try {
    const session = await requireSession();
    const options = await bmoni.getKycOptions(session.bmoni_user_id);
    return NextResponse.json(options);
  } catch (err) {
    return errorResponse(err);
  }
}
