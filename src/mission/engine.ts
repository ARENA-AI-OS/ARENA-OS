import type { Mission, MissionStage, Payment } from "@domain/index";
import { newMission } from "@domain/index";
import { getRepository } from "@db/index";
import { getModelGateway } from "@ai/model-gateway";
import { getToolGateway } from "@tools/gateway";
import { capabilitiesFor } from "@security/permissions";
import { runAgent, type AgentContext } from "@agents/runtime";
import { verify } from "./verifier";
import { defaultPolicy, evaluatePayment, settlePayment } from "@stellar/x402";
import { publicKey } from "@stellar/wallet";
import { shortId, nowIso } from "@core/ids";

const STAGES: MissionStage[] = [
  "commander",
  "research",
  "payment",
  "code",
  "qa",
  "deployment",
  "verification",
  "stellar",
];

export interface CreateMissionInput {
  title: string;
  description: string;
  projectId?: string;
  allowPaidApi?: boolean;
  budgetXlm?: number;
  paidService?: string;
  paidAmountXlm?: number;
}

export interface MissionReport {
  missionId: string;
  status: Mission["status"];
  stages: { stage: MissionStage; summary: string; status: string }[];
  verification?: { status: string; checks: { name: string; pass: boolean; detail: string }[] };
  pendingPayment?: any;
}

async function ctxFor(mission: Mission): Promise<AgentContext> {
  const repo = getRepository();
  const model = getModelGateway();
  const tools = getToolGateway();
  const emit = async (actor: any, action: string, detail?: unknown) => {
    await repo.appendAudit({ id: shortId("AE"), at: nowIso(), actor, action, missionId: mission.id, detail: detail as any });
  };
  return {
    mission,
    repo,
    model,
    tools,
    capabilities: capabilitiesFor("code"),
    emit,
  };
}

export async function createMission(input: CreateMissionInput): Promise<Mission> {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const mission = newMission({
    title: input.title,
    description: input.description,
    workspaceId: ws.id,
    projectId: input.projectId,
  });
  mission.budgetXlm = input.budgetXlm ?? 5;
  mission.allowPaidApi = input.allowPaidApi ?? false;
  mission.paidService = input.paidService;
  mission.paidAmountXlm = input.paidAmountXlm;
  mission.pipelineStage = "commander";
  await repo.saveMission(mission);
  await repo.appendAudit({ id: shortId("AE"), at: nowIso(), actor: "user", action: "mission.created", missionId: mission.id });
  return mission;
}

// Run (or resume) a mission through its staged pipeline.
export async function runMission(missionId: string): Promise<MissionReport> {
  const repo = getRepository();
  const mission = await repo.getMission(missionId);
  if (!mission) throw new Error("mission not found");
  const ctx = await ctxFor(mission);
  const stagesOut: MissionReport["stages"] = [];

  let idx = mission.pipelineStage ? STAGES.indexOf(mission.pipelineStage) : 0;
  if (idx < 0) idx = 0;

  for (; idx < STAGES.length; idx++) {
    const stage = STAGES[idx];
    const task = mission.tasks.find((t) => t.type === stage);
    if (task && task.status === "done" && stage !== "payment" && stage !== "verification") {
      // already completed (e.g. on resume) — skip
      continue;
    }

    let summary = "";
    if (stage === "commander") {
      mission.status = "planning";
      summary = await runAgent("commander", ctx);
    } else if (stage === "research") {
      mission.status = "research";
      summary = await runAgent("research", ctx);
    } else if (stage === "payment") {
      summary = await runPaymentStage(mission, ctx, stagesOut);
      // payment stage may pause; if it returned a pending payment, stop.
      const pending = (mission.pendingPayment as any) || null;
      if (pending) {
        mission.status = "awaiting_approval";
        mission.pipelineStage = "payment";
        await repo.saveMission(mission);
        return buildReport(mission, stagesOut, undefined, pending);
      }
    } else if (stage === "code") {
      mission.status = "coding";
      summary = await runAgent("code", ctx);
    } else if (stage === "qa") {
      mission.status = "testing";
      summary = await runAgent("qa", ctx);
      if (mission.status === "failed") break;
    } else if (stage === "deployment") {
      mission.status = "deployment";
      summary = await runAgent("deployment", ctx);
    } else if (stage === "verification") {
      const v = await verify(mission, ctx);
      mission.verificationStatus = v.status;
      summary = `Verification ${v.status}`;
      stagesOut.push({ stage, summary, status: v.status });
      await repo.appendAudit({ id: shortId("AE"), at: nowIso(), actor: "system", action: "verification", missionId: mission.id, detail: v as any });
      if (v.status === "failed") {
        mission.status = "failed";
        break;
      }
    } else if (stage === "stellar") {
      mission.status = "verification";
      summary = await runAgent("stellar", ctx);
    }

    if (stage !== "payment" && stage !== "verification") {
      stagesOut.push({ stage, summary, status: "done" });
    }
    mission.pipelineStage = STAGES[idx + 1] ?? "done";
    await repo.saveMission(mission);
  }

  if (mission.status !== "failed") {
    mission.status = mission.verificationStatus === "verified" ? "verified" : "completed";
  }
  mission.pipelineStage = "done";
  await repo.saveMission(mission);

  const v = await verify(mission, ctx);
  return buildReport(mission, stagesOut, v);
}

async function runPaymentStage(mission: Mission, ctx: AgentContext, _stagesOut: MissionReport["stages"]): Promise<string> {
  const allowPaid = (mission as any).allowPaidApi;
  if (!allowPaid) return "no paid API requested";
  const service = (mission as any).paidService || "Repo Analyzer API";
  const amount = Number((mission as any).paidAmountXlm || 0.25);
  const policy = defaultPolicy();

  const decision = evaluatePayment(policy, {
    service,
    recipient: "GRECIPENT",
    amountXlm: amount,
    missionBudgetRemainingXlm: mission.budgetXlm,
  });

  if (decision.decision === "approved") {
    const settled = await settlePayment({
      service,
      recipient: "GRECIPENT",
      amountXlm: amount,
      network: policy.network,
      wallet: publicKey(),
    });
    const payment: Payment = {
      id: shortId("PAY"),
      missionId: mission.id,
      service,
      purpose: "External repository analysis",
      amountXlm: amount,
      asset: policy.asset,
      network: policy.network,
      wallet: publicKey(),
      recipient: "GRECIPENT",
      status: "settled",
      txHash: settled.txHash,
      receiptHash: mission.receiptHash,
      createdAt: nowIso(),
      settledAt: nowIso(),
    };
    await ctx.repo.savePayment(payment);
    mission.paymentsXlm += amount;
    await ctx.repo.appendAudit({ id: shortId("AE"), at: nowIso(), actor: "stellar", action: "payment.settled", missionId: mission.id, detail: payment as any });
    return `Payment settled: ${amount} XLM to ${service}`;
  }

  if (decision.decision === "needs_approval") {
    mission.pendingPayment = {
      service,
      purpose: "External repository analysis",
      amountXlm: amount,
      network: policy.network,
      missionId: mission.id,
      remainingBudget: mission.budgetXlm,
      reason: decision.reason,
    };
    return "payment requires approval";
  }

  mission.pendingPayment = { denied: true, reason: decision.reason };
  return `payment denied: ${decision.reason}`;
}

// Resume a mission after the user approves a pending payment.
export async function approvePayment(missionId: string): Promise<MissionReport> {
  const repo = getRepository();
  const mission = await repo.getMission(missionId);
  if (!mission) throw new Error("mission not found");
  const pending = mission.pendingPayment as any;
  if (!pending || pending.denied) throw new Error("no pending payment");
  const policy = defaultPolicy();
  const ctx = await ctxFor(mission);

  const settled = await settlePayment({
    service: pending.service,
    recipient: "GRECIPENT",
    amountXlm: pending.amountXlm,
    network: pending.network,
    wallet: publicKey(),
  });
  const payment: Payment = {
    id: shortId("PAY"),
    missionId: mission.id,
    service: pending.service,
    purpose: pending.purpose,
    amountXlm: pending.amountXlm,
    asset: policy.asset,
    network: pending.network,
    wallet: publicKey(),
    recipient: "GRECIPENT",
    status: "settled",
    txHash: settled.txHash,
    receiptHash: mission.receiptHash,
    createdAt: nowIso(),
    settledAt: nowIso(),
  };
  await repo.savePayment(payment);
  mission.paymentsXlm += pending.amountXlm;
  mission.pendingPayment = null;
  mission.approvedPayments = [...(mission.approvedPayments ?? []), pending.service];
  await repo.appendAudit({ id: shortId("AE"), at: nowIso(), actor: "user", action: "payment.approved", missionId: mission.id, detail: payment as any });
  await repo.saveMission(mission);

  return runMission(missionId);
}

function buildReport(
  mission: Mission,
  stages: MissionReport["stages"],
  verification?: { status: string; checks: { name: string; pass: boolean; detail: string }[] },
  pendingPayment?: any,
): MissionReport {
  return {
    missionId: mission.id,
    status: mission.status,
    stages,
    verification,
    pendingPayment,
  };
}
