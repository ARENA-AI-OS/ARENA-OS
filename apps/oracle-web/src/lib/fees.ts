/**
 * Oracle's monetization mechanism: a performance fee, skimmed only when a
 * recommendation converts into a real, human-approved transaction.
 *
 * No subscription, no fee on advice that goes unused — every wallet that
 * never touches "Make it real" costs nothing and earns nothing. The fee is
 * realized as a second, fully-transparent BMONI TRANSFER proposal running
 * alongside the user's own transfer — not hidden in the primary amount,
 * not a smart-contract skim the user can't see in their own approval flow.
 * See contracts/oracle-fee-router for the on-chain atomic version of this
 * same idea (designed, unit-tested, not yet deployed — see its README).
 */

export const DEFAULT_FEE_BPS = 50; // 0.5%

export function getFeeBps(): number {
  const raw = process.env.ORACLE_FEE_BPS;
  const parsed = raw ? Number(raw) : DEFAULT_FEE_BPS;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000) return DEFAULT_FEE_BPS; // cap at 10%
  return parsed;
}

export function getFeeWalletAddress(): string | null {
  const addr = process.env.ORACLE_FEE_WALLET_ADDRESS;
  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) return null;
  return addr;
}

export interface FeeSplit {
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feeBps: number;
}

/** Splits a gross NGN amount into (net-to-recipient, fee-to-Oracle), rounded to kobo. */
export function splitAmount(grossAmount: number, feeBpsOverride?: number): FeeSplit {
  const feeBps = feeBpsOverride ?? getFeeBps();
  const feeAmount = Math.round(grossAmount * (feeBps / 10000) * 100) / 100;
  const netAmount = Math.round((grossAmount - feeAmount) * 100) / 100;
  return { grossAmount, feeAmount, netAmount, feeBps };
}
