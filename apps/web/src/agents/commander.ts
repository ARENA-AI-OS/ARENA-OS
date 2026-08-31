import type { AgentContext } from "./runtime";

// Commander Agent (spec §12). Understands intent and builds the task graph.
export async function commander(ctx: AgentContext): Promise<string> {
  const res = await ctx.model.reason(
    `Create an execution plan for this mission: ${ctx.mission.title}. ${ctx.mission.description}`,
    "You are the Commander Agent. Break the mission into ordered engineering steps.",
  );
  // Persist the plan as tasks so the UI can show progress.
  const steps = [
    { type: "research" as const, title: "Analyze the issue and repository", role: "research" as const },
    { type: "code" as const, title: "Implement the fix", role: "code" as const },
    { type: "qa" as const, title: "Run tests and verify", role: "qa" as const },
    { type: "deploy" as const, title: "Deploy a preview", role: "deployment" as const },
    { type: "stellar" as const, title: "Anchor receipt on Stellar", role: "stellar" as const },
  ];
  ctx.mission.tasks = steps.map((s, idx) => ({
    id: `T${idx + 1}`,
    missionId: ctx.mission.id,
    type: s.type,
    title: s.title,
    agentRole: s.role,
    status: "pending",
    dependsOn: idx === 0 ? [] : [`T${idx}`],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  ctx.mission.agents = ["commander", "research", "code", "qa", "deployment", "stellar"];
  await ctx.repo.saveMission(ctx.mission);
  return `Plan created with ${steps.length} steps. ${res.text}`;
}
