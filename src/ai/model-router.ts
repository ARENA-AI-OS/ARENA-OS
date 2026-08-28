import type { ModelProvider, ModelTaskKind } from "@domain/index";

// Decides which provider(s) should handle a task. Real providers only appear
// in the ranking if the user has authorized them (key present). The mock is
// always the final safe fallback and never requires a key.
//
// Manual override example (from the spec):
//   Commander -> claude, Research -> gemini, Coding -> openai, QA -> gemini
export type ModelStrategy = Partial<Record<ModelTaskKind, ModelProvider[]>>;

const DEFAULT_STRATEGY: ModelStrategy = {
  research: ["gemini", "claude"],
  code: ["openai", "claude"],
  reasoning: ["claude", "openai"],
  simple: ["openai", "gemini"],
};

export function rankProviders(
  taskKind: ModelTaskKind | undefined,
  available: ModelProvider[],
  strategy?: ModelStrategy,
): ModelProvider[] {
  const kind = taskKind ?? "any";
  const override = strategy?.[kind];
  const base = override ?? DEFAULT_STRATEGY[kind] ?? ["claude", "openai", "gemini"];
  const ranked = [...base, "mock"];
  // keep only available providers (mock always available)
  const filtered = ranked.filter((p) => p === "mock" || available.includes(p));
  // de-dupe preserving order
  return Array.from(new Set(filtered));
}
