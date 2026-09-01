import { NextResponse } from "next/server";
import { getRepository } from "@db/index";
import { newMission } from "@domain/index";
import { runMission } from "@mission/engine";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();

  const conv = await repo.getChatConversation(id);
  if (!conv) return NextResponse.json({ error: "conversation not found" }, { status: 404 });

  const messages = await repo.listChatMessages(id);
  const conversationSummary = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");

  // Create mission from conversation context
  const mission = newMission({
    title: conv.title,
    description: `Planning conversation handoff:\n\n${conversationSummary.slice(0, 4000)}`,
    workspaceId: ws.id,
  });
  await repo.saveMission(mission);

  // Link conversation to mission
  conv.missionId = mission.id;
  await repo.saveChatConversation(conv);

  // Run the mission asynchronously (fire and forget)
  runMission(mission.id).catch(() => {});

  return NextResponse.json({ mission, conversationId: conv.id });
}
