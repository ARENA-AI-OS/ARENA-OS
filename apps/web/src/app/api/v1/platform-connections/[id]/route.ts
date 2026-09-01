import { NextResponse } from "next/server";
import { getRepository } from "@db/index";
import { nowIso } from "@core/ids";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const conn = await repo.getPlatformConnection(id);
  if (!conn) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(conn);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const conn = await repo.getPlatformConnection(id);
  if (!conn) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json();
  const updated = { ...conn, ...body, id, updatedAt: nowIso() };
  await repo.savePlatformConnection(updated);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  await repo.deletePlatformConnection(id);
  return NextResponse.json({ ok: true });
}
