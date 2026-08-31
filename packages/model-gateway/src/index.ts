// @arena-os/model-gateway
// Routes model requests to the appropriate provider with failover.
// Stub for Prompt 1 — actual implementations come in Prompt 2+.

import type { ModelRequest, ModelResponse, ModelAdapter } from "@arena-os/ai-core";

export interface GatewayConfig {
  adapters: ModelAdapter[];
  fallbackProvider?: string;
}

export function createGateway(_config: GatewayConfig) {
  return {
    async route(_req: ModelRequest): Promise<ModelResponse> {
      throw new Error("model-gateway: not yet implemented");
    },
  };
}
