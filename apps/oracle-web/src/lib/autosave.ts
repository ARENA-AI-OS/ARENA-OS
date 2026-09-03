import "server-only";
import crypto from "node:crypto";
import * as bmoni from "@/lib/bmoni";
import { getSavingsRule, createPendingSavingsAction, type SavingsRule } from "@/lib/db";

/**
 * Auto-save: real automation up to the signature. On a real deposit
 * webhook, this computes the save amount and gets a TRANSFER proposal to
 * PENDING_SIGNATURES — created AND approved without the user touching
 * anything. It stops there deliberately.
 *
 * Why it stops there: BMONI's signing model needs the smart wallet
 * owner's private key for every proposal signature. The owner key lives
 * PIN-encrypted in the user's browser (lib/wallet-client.ts) — there is
 * no server-side copy, on purpose (see apps/oracle-web/README's custody
 * section). A fully unattended version would need a second co-signer key
 * added to the wallet via BMONI's ADD_MEMBER proposal type — live-checked
 * against their OpenAPI spec, it takes a `targetUserId`, meaning that
 * co-signer would be a SHARED identity added to potentially every user's
 * wallet. One compromised operator key would then touch every
 * participating user's funds — a materially worse custody model than
 * "stops one step short of moving money." Deliberately not built that
 * way. See contracts/oracle-fee-router's README for the same
 * "designed the riskier version, shipped the safer one" pattern.
 */

export function computeSaveAmount(rule: SavingsRule, depositAmount: number): number {
  if (rule.rule_type === "percentage") {
    return Math.round(depositAmount * (rule.param / 10000) * 100) / 100;
  }
  // roundup: round the deposit up to the nearest `param`, save the difference.
  const roundedUp = Math.ceil(depositAmount / rule.param) * rule.param;
  return Math.round((roundedUp - depositAmount) * 100) / 100;
}

/**
 * Handles one employee.deposit.completed event: looks up the user's
 * active rule, computes the save amount, and creates + approves a real
 * TRANSFER proposal — stopping at PENDING_SIGNATURES. Returns null if
 * there's no active rule, the amount rounds to zero, or the deposit
 * currency doesn't match what this v1 supports (NGN only).
 */
export async function handleDepositEvent(payload: {
  userId?: string;
  bmoniUserId?: string;
  amount?: string;
  currency?: string;
}) {
  const bmoniUserId = payload.bmoniUserId ?? payload.userId;
  if (!bmoniUserId || !payload.amount) return null;
  if (payload.currency && payload.currency !== "NGN" && payload.currency !== "CNGN") return null;

  const rule = getSavingsRule(bmoniUserId);
  if (!rule) return null;

  const depositAmount = Number(payload.amount);
  const saveAmount = computeSaveAmount(rule, depositAmount);
  if (saveAmount <= 0) return null;

  const { proposal } = await bmoni.createTransferProposal(bmoniUserId, rule.smart_wallet_id, {
    type: "TRANSFER",
    toAddress: rule.destination_address,
    amount: saveAmount.toFixed(2),
    currency: "CNGN",
    description: `Oracle auto-save (${rule.rule_type === "percentage" ? `${rule.param / 100}%` : `round-up to ${rule.param}`})`,
  });

  await bmoni.approveProposal(bmoniUserId, proposal.id);

  const id = crypto.randomUUID();
  createPendingSavingsAction({
    id,
    bmoniUserId,
    proposalId: proposal.id,
    triggerDepositAmount: payload.amount,
    saveAmount: saveAmount.toFixed(2),
  });

  return { id, proposalId: proposal.id, saveAmount };
}
