import * as StellarSdk from "@stellar/stellar-sdk";

// Stellar wallet helper. Reads the secret key ONLY server-side. Never returns
// the secret to callers; only the public key and (optionally) balance.
const SECRET = process.env.STELLAR_SECRET_KEY || "";
const NETWORK = (process.env.STELLAR_NETWORK as "testnet" | "mainnet") || "testnet";
const HORIZON = process.env.STELLAR_HORIZON_URL || (NETWORK === "testnet"
  ? "https://horizon-testnet.stellar.org"
  : "https://horizon.stellar.org");

export function isStellarConfigured(): boolean {
  return !!SECRET;
}

export function publicKey(): string {
  if (!SECRET) return "GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 (mock)";
  try {
    return StellarSdk.Keypair.fromSecret(SECRET).publicKey();
  } catch {
    return "GINVALID";
  }
}

export function server() {
  return new StellarSdk.Horizon.Server(HORIZON);
}

export function networkPassphrase(): string {
  return NETWORK === "testnet" ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;
}

export interface WalletState {
  configured: boolean;
  network: string;
  publicKey: string;
  balanceXlm?: number;
}

export async function walletState(): Promise<WalletState> {
  const pk = publicKey();
  if (!SECRET) {
    return { configured: false, network: NETWORK, publicKey: pk };
  }
  try {
    const account = await server().loadAccount(pk);
    const bal = account.balances.find((b: any) => b.asset_type === "native");
    return { configured: true, network: NETWORK, publicKey: pk, balanceXlm: Number(bal?.balance ?? 0) };
  } catch {
    return { configured: true, network: NETWORK, publicKey: pk };
  }
}
