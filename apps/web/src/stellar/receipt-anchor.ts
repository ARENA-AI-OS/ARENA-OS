import type { Json } from "@core/types";
import { anchorReceipt } from "./receipt-contract";

// Tool entry used by the Tool Gateway for stellar.anchor_receipt.
export async function runStellarAnchorTool(
  _tool: string,
  input: Json,
  _ctx: unknown,
): Promise<{ ok: boolean; output?: Json; error?: string }> {
  const i = input as any;
  const digest: string = i?.digest ?? i?.receiptHash;
  if (!digest) return { ok: false, error: "missing digest" };
  try {
    const r = await anchorReceipt(digest);
    return {
      ok: true,
      output: { anchorTx: r.anchorTx, network: r.network, mock: r.mock, submitter: r.submitter },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
