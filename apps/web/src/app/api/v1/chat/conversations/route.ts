import { NextResponse } from "next/server";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import type { ChatConversation } from "@domain/index";

export async function GET() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const convos = await repo.listChatConversations(ws.id);
  return NextResponse.json(convos);
}

export async function POST(req: Request) {
  const body = await req.json();
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const conv: ChatConversation = {
    id: shortId("CHAT"),
    workspaceId: ws.id,
    projectId: body.projectId,
    title: body.title || "New Planning Chat",
    modelProvider: body.modelProvider || "mock",
    status: "active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await repo.saveChatConversation(conv);
  return NextResponse.json(conv, { status: 201 });
}
