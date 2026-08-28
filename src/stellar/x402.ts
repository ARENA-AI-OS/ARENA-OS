import type { PaymentPolicy } from "@domain/index";
import { shortId } from "@core/ids";

// x402 policy engine (spec §29-§31). Agents NEVER spend without policy checks.
export function defaultPolicy(): PaymentPolicy {
  return {
    perRequestXlm: Number(process.env.ARENA_DEFAULT_MISSION_XLM_LIMIT || 5) / 10,
    perMissionXlm: Number(process.env.ARENA_DEFAULT_MISSION_XLM_LIMIT || 5),
    perDayXlm: 20,
    allowedServices: [], // empty = any service allowed
    allowedRecipients: [],
    approvalThresholdXlm: 0.5,
    asset: "XLM",
    network: (process.env.STELLAR_NETWORK as "testnet" | "mainnet") || "testnet",
  };
}

export type PaymentDecision = "approved" | "denied" | "needs_approval";

export interface PaymentRequestInput {
  service: string;
  recipient: string;
  amountXlm: number;
  missionBudgetRemainingXlm?: number;
}

export function evaluatePayment(policy: PaymentPolicy, req: PaymentRequestInput): { decision: PaymentDecision; reason: string } {
  if (policy.allowedRecipients.length && !policy.allowedRecipients.includes(req.recipient)) {
    return { decision: "denied", reason: `recipient not on allow-list: ${req.recipient}` };
  }
  if (policy.allowedServices.length && !policy.allowedServices.includes(req.service)) {
    return { decision: "needs_approval", reason: `service not pre-approved: ${req.service}` };
  }
  if (req.missionBudgetRemainingXlm !== undefined && req.amountXlm > req.missionBudgetRemainingXlm) {
    return { decision: "denied", reason: "exceeds remaining mission budget" };
  }
  if (req.amountXlm > policy.perRequestXlm) {
    return { decision: "needs_approval", reason: `exceeds per-request limit ${policy.perRequestXlm} XLM` };
  }
  if (req.amountXlm > policy.approvalThresholdXlm) {
    return { decision: "needs_approval", reason: `above approval threshold ${policy.approvalThresholdXlm} XLM` };
  }
  return { decision: "approved", reason: "within policy" };
}

// Settle a payment. Real path calls an x402 facilitator; mock path returns a
// deterministic hash so the flow is demonstrable offline.
export async function settlePayment(req: { service: string; recipient: string; amountXlm: number; network: "testnet" | "mainnet"; wallet: string }): Promise<{ txHash: string; settled: boolean }> {
  const facilitator = process.env.X402_FACILITATOR_URL;
  if (facilitator) {
    // Production: POST to facilitator /settle with signed request.
    try {
      const res = await fetch(`${facilitator}/settle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = await res.json();
        return { txHash: data.txHash ?? shortId("tx"), settled: true };
      }
    } catch {
      /* fall through to mock */
    }
  }
  return { txHash: "mock_tx_" + shortId("", 10), settled: !facilitator };
}
