import type { ModelRequest, ModelResponse } from "@domain/index";
import type { ModelAdapter } from "./types";
import { pickModelForTaskKind } from "./types";

// OpenAI adapter. Key is read server-side only and never forwarded to models.
export class OpenAIAdapter implements ModelAdapter {
  provider = "openai" as const;
  private key = process.env.OPENAI_API_KEY || "";
  isAvailable() {
    return !!this.key;
  }

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const start = Date.now();
    const model = pickModelForTaskKind(req.taskKind, "openai");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.key}` },
      body: JSON.stringify({
        model,
        temperature: req.temperature ?? 0.3,
        max_tokens: req.maxTokens ?? 1024,
        messages: [
          ...(req.system ? [{ role: "system", content: req.system }] : []),
          { role: "user", content: req.prompt },
        ],
        response_format: req.structured ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    let json: ModelResponse["json"];
    if (req.structured) {
      try {
        json = JSON.parse(text);
      } catch {
        /* ignore */
      }
    }
    return {
      provider: "openai",
      model,
      text,
      json,
      usageUsd: estimateOpenAiCost(model, data.usage),
      latencyMs: Date.now() - start,
    };
  }
}

function estimateOpenAiCost(model: string, usage?: { prompt_tokens?: number; completion_tokens?: number }): number {
  const inRate = model.includes("mini") ? 0.00015 : 0.0005;
  const outRate = model.includes("mini") ? 0.0006 : 0.0015;
  const p = usage?.prompt_tokens ?? 0;
  const c = usage?.completion_tokens ?? 0;
  return Number((p * inRate + c * outRate).toFixed(4));
}
