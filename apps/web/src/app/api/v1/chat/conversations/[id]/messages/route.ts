import { NextResponse } from "next/server";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import type { ChatMessage } from "@domain/index";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const messages = await repo.listChatMessages(id);
  return NextResponse.json(messages);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const repo = getRepository();
  const conv = await repo.getChatConversation(id);
  if (!conv) return NextResponse.json({ error: "conversation not found" }, { status: 404 });

  // Save user message
  const userMsg: ChatMessage = {
    id: shortId("MSG"),
    conversationId: id,
    role: "user",
    content: body.content,
    createdAt: nowIso(),
  };
  await repo.saveChatMessage(userMsg);

  // Build conversation history for context
  const history = await repo.listChatMessages(id);
  const conversationContext = history.map((m) => `${m.role}: ${m.content}`).join("\n");

  const systemPrompt = `You are the Arena Planning Assistant — a conversational reasoning partner.
You help the user think through what they want to build or accomplish.
You can read mission/project context to inform your reasoning.
You never call tools, execute code, or make external API calls.
When the user is ready, suggest "Hand off to Arena" to create a real mission from this conversation.

Current conversation:
${conversationContext}`;

  let assistantContent: string;
  let model = conv.modelProvider;

  // Try real model via ModelGateway, fall back to mock
  try {
    const { ModelGateway } = await import("@ai/model-gateway");
    const gw = new ModelGateway();
    const response = await gw.complete({
      prompt: body.content,
      system: systemPrompt,
      taskKind: "research",
    });
    assistantContent = response.text;
    model = response.provider;
  } catch {
    // Mock planner response
    assistantContent = generateMockPlannerResponse(body.content, conv.title);
  }

  const assistantMsg: ChatMessage = {
    id: shortId("MSG"),
    conversationId: id,
    role: "assistant",
    content: assistantContent,
    model,
    createdAt: nowIso(),
  };
  await repo.saveChatMessage(assistantMsg);

  // Update conversation
  conv.updatedAt = nowIso();
  if (conv.title === "New Planning Chat" && body.content) {
    conv.title = body.content.slice(0, 80);
  }
  await repo.saveChatConversation(conv);

  return NextResponse.json({ user: userMsg, assistant: assistantMsg });
}

function generateMockPlannerResponse(userInput: string, title: string): string {
  const lower = userInput.toLowerCase();
  if (lower.includes("hand off") || lower.includes("let's build") || lower.includes("start mission")) {
    return `Great — I've understood your plan. Here's what I'd hand off to Arena:\n\n**Mission:** ${title}\n\n**Recommended approach:**\n1. Commander Agent breaks this into a task graph\n2. Research Agent investigates current state\n3. Code Agent implements the changes\n4. QA Agent verifies with tests\n5. Deployment Agent ships it\n\nClick **"Hand off to Arena"** to create this mission and let the agents execute it.`;
  }
  if (lower.includes("how") || lower.includes("what") || lower.includes("approach")) {
    return `Good question. Let me think through this...\n\nFor "${userInput}", I'd consider:\n- What's the current state of the codebase?\n- Are there existing patterns we should follow?\n- What are the key risks or unknowns?\n- What's the simplest path to a working version?\n\nWould you like me to help refine the plan further, or shall we hand this off to Arena's execution pipeline?`;
  }
  return `I understand. You're thinking about: **${userInput}**\n\nLet me reason through this:\n1. This relates to our current project context\n2. The key considerations are scope, dependencies, and testing\n3. I'd recommend breaking this into smaller, verifiable steps\n\nWhat specific aspect would you like to explore further? Or if you're ready, we can hand this off to Arena for execution.`;
}
