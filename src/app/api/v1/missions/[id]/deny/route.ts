import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import { runMission } from "@mission/engine";

// POST /api/v1/missions/:id/deny -> deny a pending x402 payment and resume mission.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const repo = getRepository();
  const mission = await repo.getMission(id);
  if (!mission) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pending = mission.pendingPayment as any;
  if (!pending || pending.denied) {
    return NextResponse.json({ error: "no pending payment" }, { status: 400 });
  }

  // Mark payment as denied
  mission.pendingPayment = { denied: true, reason: "User denied payment", ...pending };
  await repo.appendAudit({
    id: shortId("AE"),
    at: nowIso(),
    actor: "user",
    action: "payment.denied",
    missionId: mission.id,
    detail: { service: pending.service, amountXlm: pending.amountXlm, reason: "User denied" },
  });
  await repo.saveMission(mission);

  // Resume mission (it will skip the payment stage since pendingPayment.denied is set)
  try {
    const report = await runMission(id);
    return NextResponse.json({ report, mission: await repo.getMission(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
