import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";

// GET /api/v1/activity  -> real-time event stream (audit + tools + payments + stellar)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const filter = {
    agent: url.searchParams.get("agent") || undefined,
    model: url.searchParams.get("model") || undefined,
    project: url.searchParams.get("project") || undefined,
    tool: url.searchParams.get("tool") || undefined,
    mission: url.searchParams.get("mission") || undefined,
    payment: url.searchParams.has("payment") ? url.searchParams.get("payment") !== "false" : undefined,
    stellar: url.searchParams.has("stellar") ? url.searchParams.get("stellar") !== "false" : undefined,
  };
  const activity = await getRepository().listActivity(filter);
  return NextResponse.json({ activity });
}
