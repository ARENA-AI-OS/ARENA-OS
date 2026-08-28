import type { Capability } from "@core/types";
import type { AgentRole } from "@domain/index";
import { AGENT_REGISTRY } from "@domain/index";

// Capability-based permission system (spec §37).
// Agents receive only the capabilities required for their mission.

export function hasCapability(granted: Capability[], required: Capability): boolean {
  if (granted.includes("*")) return true;
  if (granted.includes(required)) return true;
  // wildcard prefix e.g. "github:*" satisfies "github:create_branch"
  const [scope] = required.split(":");
  return granted.includes(`${scope}:*`);
}

export function authorize(
  granted: Capability[],
  required: Capability,
): { ok: true } | { ok: false; reason: string } {
  if (hasCapability(granted, required)) return { ok: true };
  return { ok: false, reason: `missing capability: ${required}` };
}

// Production operations require elevated approval beyond base capabilities.
const ELEVATED: Capability[] = [
  "railway:deploy_production",
  "github:merge_pull_request",
  "stellar:spend",
  "supabase:schema_change",
];

export function requiresElevation(cap: Capability): boolean {
  return ELEVATED.includes(cap);
}

// Build the effective capability set for an agent within a mission.
export function capabilitiesFor(role: AgentRole, extra: Capability[] = []): Capability[] {
  const base = AGENT_REGISTRY[role].defaultCapabilities;
  return Array.from(new Set([...base, ...extra]));
}
