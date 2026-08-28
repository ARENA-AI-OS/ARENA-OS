import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";
import { createMission, runMission } from "@mission/engine";

// GET /api/v1/missions  -> list missions for the workspace
// POST /api/v1/missions -> create + run a mission
//   body: { title, description, projectId?, allowPaidApi?, budgetXlm?, paidService?, paidAmountXlm? }
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const missions = await repo.listMissions(ws.id);
  return NextResponse.json({ missions });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const mission = await createMission({
    title: String(body.title || "Untitled mission"),
    description: String(body.description || ""),
    projectId: body.projectId,
    allowPaidApi: !!body.allowPaidApi,
    budgetXlm: Number(body.budgetXlm || 5),
    paidService: body.paidService,
    paidAmountXlm: Number(body.paidAmountXlm || 0.25),
  });

  const report = await runMission(mission.id);
  return NextResponse.json({ mission: await getRepository().getMission(mission.id), report });
}
