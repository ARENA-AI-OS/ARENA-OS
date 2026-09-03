import { NextRequest, NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

/**
 * POST /api/onboard/kyc/documents
 *
 * multipart/form-data:
 *   kind: "identification" | "proof-of-address" | "biometric"
 *   file: the image (JPEG or PNG; BMONI enforces a ~2KB minimum size)
 *   -- identification only --
 *   documentType, documentNumber, issuingCountry
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const form = await req.formData();
    const kind = form.get("kind");
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (kind === "identification") {
      const documentType = String(form.get("documentType") ?? "national_id");
      const documentNumber = String(form.get("documentNumber") ?? "");
      const issuingCountry = String(form.get("issuingCountry") ?? "NGA");
      if (!documentNumber) {
        return NextResponse.json({ error: "documentNumber is required" }, { status: 400 });
      }
      const result = await bmoni.uploadIdentificationDocument(
        session.bmoni_user_id,
        file,
        file.name,
        { type: documentType, documentNumber, issuingCountry },
      );
      return NextResponse.json(result);
    }

    if (kind === "proof-of-address") {
      const result = await bmoni.uploadProofOfAddressDocument(session.bmoni_user_id, file, file.name);
      return NextResponse.json(result);
    }

    if (kind === "biometric") {
      const result = await bmoni.uploadBiometricDocument(session.bmoni_user_id, file, file.name);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: `Unknown kind "${String(kind)}". Expected identification, proof-of-address, or biometric.` },
      { status: 400 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
