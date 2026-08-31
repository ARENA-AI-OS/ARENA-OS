import type { Repository } from "./repository";
import { getMemoryRepository } from "./memory-repo";
import { getPgRepository } from "./pg-repo";
import type { ModelProviderConfig } from "@domain/index";

// Single entry point. Chooses backend based on ARENA_DB_DRIVER.
let repo: Repository | null = null;

export function getRepository(): Repository {
  if (repo) return repo;
  const driver = (process.env.ARENA_DB_DRIVER || "memory").toLowerCase();
  if (driver === "postgres") {
    repo = getPgRepository();
  } else {
    repo = getMemoryRepository(process.env.ARENA_SEED_EMAIL || "dev@arena.os");
  }
  return repo;
}

// Model providers are config-derived (keys are read server-side only).
export function providerStatus(): ModelProviderConfig[] {
  const openai = !!process.env.OPENAI_API_KEY;
  const gemini = !!process.env.GEMINI_API_KEY;
  const claude = !!process.env.ANTHROPIC_API_KEY;
  return [
    { provider: "openai", label: "OpenAI", connected: openai, models: ["gpt-4o", "gpt-4o-mini"] },
    { provider: "gemini", label: "Google Gemini", connected: gemini, models: ["gemini-1.5-pro", "gemini-1.5-flash"] },
    { provider: "claude", label: "Anthropic Claude", connected: claude, models: ["claude-3-5-sonnet", "claude-3-haiku"] },
    { provider: "mock", label: "Mock Model (offline)", connected: true, models: ["mock-reason"] },
  ];
}
