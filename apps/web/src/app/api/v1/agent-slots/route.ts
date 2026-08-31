import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import type { AgentSlot } from "@domain/index";

// GET /api/v1/agent-slots -> list all agent slots
// POST /api/v1/agent-slots -> create a new custom agent slot
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repo = getRepository();
  const slots = await repo.listAgentSlots();

  // Enrich with assignment counts
  const assignments = await repo.listAgentApiAssignments();
  const enriched = slots.map((slot) => ({
    ...slot,
    apiCount: assignments.filter((a) => a.agentId === slot.id).length,
  }));

  return NextResponse.json({ agentSlots: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const repo = getRepository();

  const slot: AgentSlot = {
    id: shortId("SLOT"),
    name: String(body.name || "Custom Agent"),
    description: String(body.description || ""),
    role: String(body.role || body.name?.toLowerCase().replace(/\s+/g, "_") || "custom"),
    isCustom: true,
    modelPreference: body.modelPreference || "auto",
    budget: Number(body.budget || 5),
    timeoutMs: Number(body.timeoutMs || 120000),
    retryLimit: Number(body.retryLimit || 2),
    status: "active",
    defaultCapabilities: body.defaultCapabilities || ["custom_api:can_call"],
    createdAt: nowIso(),
  };

  await repo.saveAgentSlot(slot);
  await repo.appendAudit({
    id: shortId("AE"),
    at: nowIso(),
    actor: "user",
    action: "agent_slot.created",
    detail: { slotId: slot.id, name: slot.name, role: slot.role },
  });

  return NextResponse.json({ agentSlot: slot });
}
