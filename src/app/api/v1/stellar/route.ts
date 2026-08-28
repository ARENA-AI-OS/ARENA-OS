import { NextResponse } from "next/server";
import { getSession } from "@security/session";
import { getRepository } from "@db/index";
import { walletState } from "@stellar/wallet";

// GET /api/v1/stellar -> wallet state + recent transactions (spec §26-§28)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repo = getRepository();
  const [wallet, txs, payments] = await Promise.all([
    walletState(),
    repo.listStellarTx(),
    repo.listPayments(),
  ]);
  return NextResponse.json({ wallet, transactions: txs.slice(0, 20), payments: payments.slice(0, 20) });
}
