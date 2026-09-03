import { NextResponse } from "next/server";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";

/**
 * GET /api/proposals/:id/sign-payload — fetches the raw digest to sign.
 * The browser signs it client-side with the PIN-decrypted owner key
 * (lib/wallet-client.ts, signRawDigest — NO EIP-191 prefix) and posts the
 * result to /sign. The private key never reaches this server.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const payload = await bmoni.getSignPayload(session.bmoni_user_id, id);
    return NextResponse.json(payload);
  } catch (err) {
    return errorResponse(err);
  }
}
