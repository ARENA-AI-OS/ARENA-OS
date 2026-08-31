import type { Capability } from "@core/types";
import type { AgentRole, AuditActor, Mission } from "@domain/index";
import { newAudit } from "@domain/index";
import type { Repository } from "@db/repository";
import type { ToolGateway, ToolContext } from "@tools/gateway";
import type { ModelGateway } from "@ai/model-gateway";
import type { ModelStrategy } from "@ai/model-router";

// Shared context passed to every agent. Agents are isolated: they only see the
// capabilities they were granted and act through the Tool Gateway (never
// touching credentials or external services directly).
export interface AgentContext {
  mission: Mission;
  repo: Repository;
  tools: ToolGateway;
  model: ModelGateway;
  strategy?: ModelStrategy;
  // Capabilities available to this agent for this mission.
  capabilities: Capability[];
  emit: (actor: AuditActor, action: string, detail?: unknown) => Promise<void>;
}

export function toolCtx(ctx: AgentContext, actor: AgentRole): ToolContext {
  return {
    missionId: ctx.mission.id,
    grantedCapabilities: ctx.capabilities,
    actor,
    record: async (run, audit) => {
      await ctx.repo.saveToolRun(run);
      await ctx.repo.appendAudit(audit);
    },
  };
}

// Execute a single agent step. Each agent returns a short summary string.
export async function runAgent(role: AgentRole, ctx: AgentContext): Promise<string> {
  const actor: AuditActor = role;
  await ctx.emit(actor, `agent.${role}.start`);
  let summary = "";
  switch (role) {
    case "commander":
      summary = await commander(ctx);
      break;
    case "research":
      summary = await research(ctx);
      break;
    case "code":
      summary = await code(ctx);
      break;
    case "qa":
      summary = await qa(ctx);
      break;
    case "deployment":
      summary = await deployment(ctx);
      break;
    case "stellar":
      summary = await stellarAgent(ctx);
      break;
  }
  await ctx.emit(actor, `agent.${role}.done`, { summary });
  return summary;
}

// --- individual agents (kept modular per spec §12) -------------------------

import { commander } from "./commander";
import { research } from "./research";
import { code } from "./code";
import { qa } from "./qa";
import { deployment } from "./deployment";
import { stellarAgent } from "./stellar-agent";
