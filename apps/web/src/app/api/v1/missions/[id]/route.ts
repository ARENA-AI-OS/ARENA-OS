import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const mission = await getRepository().getMission(id);
  if (!mission) return NextResponse.json({ error: "not found" }, { status: 404 });
  const audit = await getRepository().listAudit(id);
  return NextResponse.json({ mission, audit });
}
