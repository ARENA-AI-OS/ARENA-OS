import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { approvePayment } from "@mission/engine";
import { getRepository } from "@db/index";

// POST /api/v1/missions/:id/approve -> approve a pending x402 payment and resume.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const report = await approvePayment(id);
    return NextResponse.json({ report, mission: await getRepository().getMission(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
