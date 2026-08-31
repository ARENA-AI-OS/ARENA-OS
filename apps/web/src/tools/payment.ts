import type { Json } from "@core/types";
import type { ToolName } from "@domain/index";
import type { ToolContext } from "./gateway";
import { defaultPolicy, evaluatePayment, settlePayment } from "@stellar/x402";
import { publicKey } from "@stellar/wallet";
import { shortId } from "@core/ids";

// payment.request tool. Enforces the x402 policy before settling. If the policy
// requires approval, it returns a structured "needs approval" result that the
// mission engine / UI turns into an approval prompt (spec §31).
export async function runPaymentTool(
  _tool: ToolName,
  input: Json,
  ctx: ToolContext,
): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;
  const policy = defaultPolicy();
  const decision = evaluatePayment(policy, {
    service: i.service,
    recipient: i.recipient || "GRECIPENT",
    amountXlm: Number(i.amountXlm || 0),
  });

  if (decision.decision === "denied") {
    return { ok: false, error: decision.reason, output: { denied: true, reason: decision.reason } };
  }
  if (decision.decision === "needs_approval") {
    return {
      ok: false,
      error: "approval_required",
      output: {
        needsApproval: true,
        service: i.service,
        purpose: i.purpose,
        amountXlm: i.amountXlm,
        network: policy.network,
        missionId: ctx.missionId,
        remainingBudget: i.budgetRemainingXlm,
        reason: decision.reason,
      } as any,
    };
  }

  const settled = await settlePayment({
    service: i.service,
    recipient: i.recipient || "GRECIPENT",
    amountXlm: Number(i.amountXlm || 0),
    network: policy.network,
    wallet: publicKey(),
  });
  return {
    ok: true,
    output: {
      paymentId: shortId("PAY"),
      txHash: settled.txHash,
      amountXlm: i.amountXlm,
      asset: policy.asset,
      network: policy.network,
      wallet: publicKey(),
      service: i.service,
      purpose: i.purpose,
      settled: settled.settled,
    },
  };
}
