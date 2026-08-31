import * as StellarSdk from "@stellar/stellar-sdk";
import { isStellarConfigured, networkPassphrase, publicKey, server } from "./wallet";
import { shortId } from "@core/ids";

// Anchors a canonical mission digest on Stellar (spec §28). In production this
// invokes the arena-receipt Soroban contract; for the MVP we submit a
// manageData operation carrying the digest, which is a real on-chain anchor.
// When no secret key is configured we return a clearly-labeled mock anchor so
// the verification flow can still be demonstrated.

export interface AnchorResult {
  anchorTx: string;
  network: string;
  mock: boolean;
  submitter: string;
}

export async function anchorReceipt(digest: string): Promise<AnchorResult> {
  const submitter = publicKey();
  const network = (process.env.STELLAR_NETWORK as string) || "testnet";
  if (!isStellarConfigured()) {
    return { anchorTx: "mock_tx_" + shortId("", 10), network, mock: true, submitter };
  }

  const secret = process.env.STELLAR_SECRET_KEY!;
  const kp = StellarSdk.Keypair.fromSecret(secret);
  const account = await server().loadAccount(kp.publicKey());
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(
      StellarSdk.Operation.manageData({
        name: "arena-receipt",
        value: digest.slice(0, 64),
      }),
    )
    .setTimeout(30)
    .build();
  tx.sign(kp);
  const res = await server().submitTransaction(tx);
  return { anchorTx: res.hash, network, mock: false, submitter };
}
