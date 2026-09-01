import { NextResponse } from "next/server";
import { getRepository } from "@db/index";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const conv = await repo.getChatConversation(id);
  if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  await repo.deleteChatConversation(id);
  return NextResponse.json({ ok: true });
}
