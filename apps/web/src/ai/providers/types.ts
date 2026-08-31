import type { ModelProvider, ModelRequest, ModelResponse, ModelTaskKind } from "@domain/index";

// A ModelAdapter hides provider specifics behind one interface.
// The gateway NEVER receives raw API keys — they live server-side only.
export interface ModelAdapter {
  provider: ModelProvider;
  // Whether the adapter is actually usable (key present / reachable).
  isAvailable(): boolean;
  complete(req: ModelRequest): Promise<ModelResponse>;
}

export function pickModelForTaskKind(kind: ModelTaskKind | undefined, provider: ModelProvider): string {
  switch (provider) {
    case "openai":
      return kind === "code" ? "gpt-4o" : "gpt-4o-mini";
    case "gemini":
      return kind === "research" ? "gemini-1.5-pro" : "gemini-1.5-flash";
    case "claude":
      return "claude-3-5-sonnet";
    default:
      return "mock-reason";
  }
}
