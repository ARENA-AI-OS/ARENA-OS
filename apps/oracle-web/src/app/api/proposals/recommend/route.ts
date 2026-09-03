import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as bmoni from "@/lib/bmoni";
import { requireSession, errorResponse } from "@/lib/require-session";
import { splitAmount, getFeeWalletAddress } from "@/lib/fees";

const Input = z.object({
  toAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amount: z.number().positive(),
  currency: z.string().default("CNGN"),
  description: z.string().optional(),
});

/**
 * POST /api/proposals/recommend — the monetized version of "Make it real".
 *
 * Creates TWO real BMONI TRANSFER proposals from one recommended amount:
 * one for (amount - fee) to the user's chosen destination, one for the fee
 * itself to Oracle's fee wallet. Both are ordinary proposals through
 * BMONI's existing API — no new contract, no new trust assumption, nothing
 * BMONI has to deploy or approve to make this work today. The user
 * approves and signs both, individually, and sees the fee amount before
 * doing so — nothing is skimmed off the primary transfer invisibly.
 *
 * If ORACLE_FEE_WALLET_ADDRESS isn't configured, this fails closed rather
 * than silently transferring the full amount with no fee — a
 * misconfigured deployment should be loud, not quietly unmonetized.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session.smart_wallet_id) {
      return NextResponse.json({ error: "No smart wallet on this session." }, { status: 409 });
    }

    const feeWallet = getFeeWalletAddress();
    if (!feeWallet) {
      return NextResponse.json(
        { error: "ORACLE_FEE_WALLET_ADDRESS is not configured. Set it in .env.local to enable monetized recommendations." },
        { status: 500 },
      );
    }

    const input = Input.parse(await req.json());
    const split = splitAmount(input.amount);

    if (split.feeAmount <= 0) {
      // Amount too small to produce a non-zero fee at kobo precision — skip
      // the fee proposal rather than create a proposal for ₦0.00.
      const { proposal } = await bmoni.createTransferProposal(
        session.bmoni_user_id,
        session.smart_wallet_id,
        {
          type: "TRANSFER",
          toAddress: input.toAddress,
          amount: input.amount.toFixed(2),
          currency: input.currency,
          description: input.description ?? "Oracle recommendation",
        },
      );
      return NextResponse.json({ netProposal: proposal, feeProposal: null, split });
    }

    const { proposal: netProposal } = await bmoni.createTransferProposal(
      session.bmoni_user_id,
      session.smart_wallet_id,
      {
        type: "TRANSFER",
        toAddress: input.toAddress,
        amount: split.netAmount.toFixed(2),
        currency: input.currency,
        description: input.description ?? "Oracle recommendation — net transfer",
      },
    );

    const { proposal: feeProposal } = await bmoni.createTransferProposal(
      session.bmoni_user_id,
      session.smart_wallet_id,
      {
        type: "TRANSFER",
        toAddress: feeWallet,
        amount: split.feeAmount.toFixed(2),
        currency: input.currency,
        description: `Oracle performance fee (${split.feeBps / 100}%)`,
      },
    );

    return NextResponse.json({ netProposal, feeProposal, split });
  } catch (err) {
    return errorResponse(err);
  }
}
