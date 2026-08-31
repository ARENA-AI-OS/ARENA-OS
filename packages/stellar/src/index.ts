// @arena-os/stellar
// Stellar blockchain integration: wallet management, Soroban contract calls,
// and receipt anchoring.
// Stub for Prompt 1 — real Stellar integration comes in Prompt 5+.

export interface StellarConfig {
  secretKey?: string;
  network: "testnet" | "mainnet";
  horizonUrl?: string;
}

export function createStellarClient(_config: StellarConfig) {
  return {
    async getBalance() {
      throw new Error("stellar: not yet implemented");
    },
    async submitTransaction(_tx: unknown) {
      throw new Error("stellar: not yet implemented");
    },
  };
}
