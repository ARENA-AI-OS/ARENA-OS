import type { AgentContext } from "./runtime";
import { toolCtx } from "./runtime";
import { sha256Hex, canonicalMissionDigest } from "@stellar/hash";
import { shortId, nowIso } from "@core/ids";
import type { Receipt } from "@domain/index";

// Stellar Agent (spec §12, §28). Produces a canonical receipt, anchors it on
// Stellar/Soroban, and records the on-chain reference.
export async function stellarAgent(ctx: AgentContext): Promise<string> {
  const task = ctx.mission.tasks.find((t) => t.type === "stellar");
  if (task) task.status = "running";

  const digest = canonicalMissionDigest(ctx.mission);
  const receiptHash = await sha256Hex(digest);

  const anchor = await ctx.tools.execute(
    "stellar.anchor_receipt",
    { digest: receiptHash, missionId: ctx.mission.id },
    toolCtx(ctx, "stellar"),
  );
  const anchorTx = (anchor.output as any)?.anchorTx;

  const receipt: Receipt = {
    hash: receiptHash,
    missionDigest: digest,
    submitter: (anchor.output as any)?.submitter ?? "unknown",
    timestamp: nowIso(),
    status: "verified",
    anchorTx,
  };
  await ctx.repo.saveReceipt(receipt);

  if (task) {
    task.status = "done";
    task.result = { receiptHash, anchorTx };
    task.updatedAt = nowIso();
  }
  ctx.mission.receiptHash = receiptHash;
  ctx.mission.stellarTx = anchorTx;
  ctx.mission.toolsUsed = Array.from(new Set([...ctx.mission.toolsUsed, "stellar.anchor_receipt"]));
  await ctx.repo.saveMission(ctx.mission);
  return `Receipt anchored: ${receiptHash} (tx ${anchorTx})`;
}
