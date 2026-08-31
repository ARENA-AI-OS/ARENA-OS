// @arena-os/x402
// x402 payment protocol integration for Stellar micropayments.
// Stub for Prompt 1 — real x402 integration comes in Prompt 5+.

export interface X402Config {
  facilitatorUrl?: string;
  defaultBudgetXlm: number;
}

export interface PaymentPolicy {
  perRequestXlm: number;
  perMissionXlm: number;
  perDayXlm: number;
  allowedServices: string[];
  allowedRecipients: string[];
  approvalThresholdXlm: number;
  asset: string;
  network: "testnet" | "mainnet";
}

export type PaymentDecision = "approved" | "denied" | "needs_approval";

export function evaluatePayment(
  _policy: PaymentPolicy,
  _req: { service: string; recipient: string; amountXlm: number },
): { decision: PaymentDecision; reason: string } {
  // Stub — real evaluation comes in Prompt 5+.
  return { decision: "needs_approval", reason: "x402: not yet implemented" };
}
