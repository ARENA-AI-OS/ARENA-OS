import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";
import { shortId, nowIso } from "@core/ids";
import type { AgentApiAssignment } from "@domain/index";

// GET /api/v1/agent-api-assignments -> list all assignments
// POST /api/v1/agent-api-assignments -> create an assignment
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId") || undefined;
  const repo = getRepository();
  const assignments = await repo.listAgentApiAssignments(agentId || undefined);

  // Enrich with API and agent names
  const enriched = await Promise.all(
    assignments.map(async (a) => {
      const api = await repo.getCustomApi(a.customApiId);
      const slot = await repo.getAgentSlot(a.agentId);
      return {
        ...a,
        apiName: api?.name || "Unknown API",
        agentName: slot?.name || "Unknown Agent",
      };
    }),
  );

  return NextResponse.json({ assignments: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const repo = getRepository();

  // Validate API and agent exist
  const api = await repo.getCustomApi(body.customApiId);
  if (!api) return NextResponse.json({ error: "API not found" }, { status: 404 });

  const slot = await repo.getAgentSlot(body.agentId);
  if (!slot) return NextResponse.json({ error: "Agent slot not found" }, { status: 404 });

  const assignment: AgentApiAssignment = {
    id: shortId("AA"),
    customApiId: body.customApiId,
    agentId: body.agentId,
    grantedCapabilities: body.grantedCapabilities || ["can_call"],
    assignedAt: nowIso(),
    assignedBy: session.userId || "user",
  };

  await repo.saveAgentApiAssignment(assignment);
  await repo.appendAudit({
    id: shortId("AE"),
    at: nowIso(),
    actor: "user",
    action: "agent_api_assignment.created",
    detail: { assignmentId: assignment.id, apiId: api.id, agentId: slot.id },
  });

  return NextResponse.json({ assignment });
}

// DELETE /api/v1/agent-api-assignments?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const repo = getRepository();
  const assignment = await repo.getAgentApiAssignment(id);
  if (!assignment) return NextResponse.json({ error: "not found" }, { status: 404 });

  await repo.deleteAgentApiAssignment(id);
  await repo.appendAudit({
    id: shortId("AE"),
    at: nowIso(),
    actor: "user",
    action: "agent_api_assignment.deleted",
    detail: { assignmentId: id },
  });

  return NextResponse.json({ ok: true });
}
