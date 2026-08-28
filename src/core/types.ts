// Shared result type used across gateways, agents and tools.
// Explicit error handling keeps the system auditable and avoids swallowed throws.

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: string): Result<T> {
  return { ok: false, error };
}

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

// Capability-based permission strings, e.g. "github:create_pull_request".
export type Capability = string;

export interface Scoped {
  capabilities: Capability[];
}

export type Environment = "development" | "preview" | "production";
