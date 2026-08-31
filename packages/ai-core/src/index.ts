// @arena-os/ai-core
// Shared types, interfaces, and utilities for AI model integration.
// This package provides the type foundation; actual provider implementations
// live in packages/model-gateway.

export type ModelProvider = "openai" | "gemini" | "claude" | "mock";
export type ModelTaskKind = "research" | "code" | "simple" | "reasoning" | "any";

export interface ModelRequest {
  prompt: string;
  system?: string;
  taskKind?: ModelTaskKind;
  temperature?: number;
  maxTokens?: number;
  structured?: boolean;
}

export interface ModelResponse {
  provider: ModelProvider;
  model: string;
  text: string;
  json?: unknown;
  usageUsd: number;
  latencyMs: number;
}

export interface ModelAdapter {
  readonly provider: ModelProvider;
  readonly models: string[];
  isConfigured(): boolean;
  complete(req: ModelRequest): Promise<ModelResponse>;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: string): Result<T> {
  return { ok: false, error };
}
