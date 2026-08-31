// @arena-os/railway
// Railway deployment integration adapter.
// Stub for Prompt 1 — real integration comes in Prompt 4+.

export interface RailwayConfig {
  token: string;
}

export function createRailwayClient(_config: RailwayConfig) {
  return {
    async deployPreview(_project: string) {
      throw new Error("railway: not yet implemented");
    },
    async getLogs(_project: string) {
      throw new Error("railway: not yet implemented");
    },
  };
}
