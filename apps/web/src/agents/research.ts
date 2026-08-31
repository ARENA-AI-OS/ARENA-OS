import type { AgentContext } from "./runtime";
import { toolCtx } from "./runtime";

// Research Agent (spec §12). Inspects the repository / issue and summarizes.
export async function research(ctx: AgentContext): Promise<string> {
  // Mark research task running
  const task = ctx.mission.tasks.find((t) => t.type === "research");
  if (task) task.status = "running";

  const issueRes = await ctx.tools.execute(
    "github.read_issue",
    { repository: ctx.mission.projectId ? undefined : "ARENA-AI-OS/ARENA-OS", issueNumber: 42 } as any,
    toolCtx(ctx, "research" as any),
  );

  const analysis = await ctx.model.research(
    `Research the problem described by this GitHub issue: ${JSON.stringify(issueRes.output ?? {})}`,
    "You are the Research Agent. Identify the root cause and recommended approach.",
  );

  if (task) {
    task.status = "done";
    task.result = { issue: issueRes.output, analysis: analysis.text } as any;
    task.updatedAt = new Date().toISOString();
  }
  ctx.mission.toolsUsed = Array.from(new Set([...ctx.mission.toolsUsed, "github.read_issue"]));
  ctx.mission.modelsUsed = Array.from(new Set([...ctx.mission.modelsUsed, analysis.provider]));
  ctx.mission.costUsd += analysis.usageUsd;
  await ctx.repo.saveMission(ctx.mission);
  return `Research complete. ${analysis.text}`;
}
