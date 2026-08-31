import type { Json } from "@core/types";
import type { AuditActor, ToolName, ToolRun } from "@domain/index";
import { newAudit } from "@domain/index";
import { shortId, nowIso } from "@core/ids";
import { authorize, hasCapability } from "@security/permissions";
import { TOOL_REGISTRY } from "./registry";
import { runGithubTool } from "./github";
import { runTerminalTool } from "./terminal";
import { runSupabaseTool } from "./supabase";
import { runRailwayTool } from "./railway";
import { runPaymentTool } from "./payment";
import { runStellarAnchorTool } from "@stellar/receipt-anchor";

export interface ToolContext {
  missionId?: string;
  // Capabilities the calling agent is allowed to use.
  grantedCapabilities: string[];
  actor: AuditActor;
  // Allows the gateway to record audit/tool-run rows.
  record?: (run: ToolRun, audit: ReturnType<typeof newAudit>) => Promise<void>;
}

export interface ToolResult {
  ok: boolean;
  output?: Json;
  error?: string;
  denied?: boolean;
}

// Central Tool Gateway (spec §18). Enforces: permission check -> validation ->
// credential resolution -> execution -> normalization -> audit.
export class ToolGateway {
  async execute(tool: ToolName, input: Json, ctx: ToolContext): Promise<ToolResult> {
    const spec = TOOL_REGISTRY[tool];
    const runId = shortId("TR");
    const startedAt = nowIso();

    const record = async (status: ToolRun["status"], output?: Json, error?: string) => {
      const run: ToolRun = {
        id: runId,
        missionId: ctx.missionId,
        tool,
        input,
        output,
        status,
        startedAt,
        endedAt: nowIso(),
        error,
      };
      const audit = newAudit({
        actor: ctx.actor,
        action: `tool.${tool} -> ${status}`,
        missionId: ctx.missionId,
        detail: { tool, status, error } as any,
      });
      await ctx.record?.(run, audit);
      return run;
    };

    if (!spec) {
      await record("failed", undefined, "unknown tool");
      return { ok: false, error: "unknown tool", denied: false };
    }

    const perm = authorize(ctx.grantedCapabilities, spec.capability);
    if (!perm.ok) {
      await record("denied", undefined, perm.reason);
      return { ok: false, error: perm.reason, denied: true };
    }

    try {
      let result: ToolResult;
      switch (spec.requiresProvider) {
        case "github":
          result = await runGithubTool(tool, input);
          break;
        case "supabase":
          result = await runSupabaseTool(tool, input);
          break;
        case "railway":
          result = await runRailwayTool(tool, input);
          break;
        case "x402":
          result = await runPaymentTool(tool, input, ctx);
          break;
        case "stellar":
          result = await runStellarAnchorTool(tool, input, ctx);
          break;
        default:
          // terminal and any non-provider tool
          result = await runTerminalTool(tool, input);
      }
      await record(result.ok ? "success" : "failed", result.output, result.error);
      return result;
    } catch (e) {
      const msg = (e as Error).message;
      await record("failed", undefined, msg);
      return { ok: false, error: msg };
    }
  }
}

let gateway: ToolGateway | null = null;
export function getToolGateway(): ToolGateway {
  if (!gateway) gateway = new ToolGateway();
  return gateway;
}

export { hasCapability };
