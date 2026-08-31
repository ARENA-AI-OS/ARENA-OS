import type { PaymentPolicy } from "@domain/index";
import { shortId, nowIso } from "@core/ids";
import { submitPayment, publicKey, isStellarConfigured } from "./wallet";

// x402 policy engine (spec §29-§31). Agents NEVER spend without policy checks.
// This is a HARD GATE — not a soft warning.

export function defaultPolicy(): PaymentPolicy {
  return {
    perRequestXlm: 1, // Max 1 XLM per single request
    perMissionXlm: Number(process.env.ARENA_DEFAULT_MISSION_XLM_LIMIT || 5),
    perDayXlm: 20,
    allowedServices: [], // empty = any service allowed
    allowedRecipients: [], // empty = any recipient allowed
    approvalThresholdXlm: 0.5, // Amounts above this need approval
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
  dailySpendSoFarXlm?: number;
}

export function evaluatePayment(policy: PaymentPolicy, req: PaymentRequestInput): { decision: PaymentDecision; reason: string } {
  // 1. Recipient allow-list check (hard deny)
  if (policy.allowedRecipients.length && !policy.allowedRecipients.includes(req.recipient)) {
    return { decision: "denied", reason: `recipient not on allow-list: ${req.recipient}` };
  }

  // 2. Service allow-list check (requires approval for unknown services)
  if (policy.allowedServices.length && !policy.allowedServices.includes(req.service)) {
    return { decision: "needs_approval", reason: `service not pre-approved: ${req.service}` };
  }

  // 3. Per-mission budget check (hard deny)
  if (req.missionBudgetRemainingXlm !== undefined && req.amountXlm > req.missionBudgetRemainingXlm) {
    return { decision: "denied", reason: `exceeds remaining mission budget: ${req.amountXlm} XLM > ${req.missionBudgetRemainingXlm} XLM remaining` };
  }

  // 4. Per-request limit check (hard deny)
  if (req.amountXlm > policy.perRequestXlm) {
    return { decision: "denied", reason: `exceeds per-request limit: ${req.amountXlm} XLM > ${policy.perRequestXlm} XLM limit` };
  }

  // 5. Daily spend limit check (hard deny)
  const dailySpend = req.dailySpendSoFarXlm ?? 0;
  if (dailySpend + req.amountXlm > policy.perDayXlm) {
    return { decision: "denied", reason: `would exceed daily limit: ${dailySpend + req.amountXlm} XLM > ${policy.perDayXlm} XLM daily limit` };
  }

  // 6. Approval threshold check (needs approval)
  if (req.amountXlm > policy.approvalThresholdXlm) {
    return { decision: "needs_approval", reason: `above approval threshold: ${req.amountXlm} XLM > ${policy.approvalThresholdXlm} XLM threshold` };
  }

  return { decision: "approved", reason: "within all policy limits" };
}

// Calculate daily spend from payment history
export function calculateDailySpend(payments: { amountXlm: number; createdAt: string; status: string }[]): number {
  const today = new Date().toISOString().split("T")[0];
  return payments
    .filter((p) => p.createdAt.startsWith(today) && (p.status === "settled" || p.status === "approved"))
    .reduce((sum, p) => sum + p.amountXlm, 0);
}

// Settle a payment. Real path executes a Stellar transaction; mock path returns
// a deterministic hash so the flow is demonstrable offline.
export async function settlePayment(req: {
  service: string;
  recipient: string;
  amountXlm: number;
  network: "testnet" | "mainnet";
  wallet: string;
}): Promise<{ txHash: string; settled: boolean; error?: string }> {
  // Try real Stellar payment first
  if (isStellarConfigured()) {
    try {
      const result = await submitPayment(
        req.recipient,
        req.amountXlm,
        `x402:${req.service}`,
      );
      if (result.success) {
        return { txHash: result.txHash, settled: true };
      }
      return { txHash: "", settled: false, error: result.error };
    } catch (e) {
      return { txHash: "", settled: false, error: (e as Error).message };
    }
  }

  // Mock settlement for demo/offline mode
  const facilitator = process.env.X402_FACILITATOR_URL;
  if (facilitator) {
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

  return { txHash: "mock_tx_" + shortId("", 10), settled: true };
}

// Verify a Stellar transaction is actually confirmed on-chain.
export async function verifyTransactionOnChain(txHash: string): Promise<{
  confirmed: boolean;
  ledger?: number;
  successful?: boolean;
  error?: string;
}> {
  if (!isStellarConfigured()) {
    // Mock verification for demo mode
    return { confirmed: true, ledger: 100001, successful: true };
  }

  const { confirmTransaction } = await import("./wallet");
  return confirmTransaction(txHash);
}
