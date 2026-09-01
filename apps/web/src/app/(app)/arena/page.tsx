import { getRepository } from "@db/index";
import { ArenaHub } from "@/components/arena-hub";
import { shortId, nowIso } from "@core/ids";

export const dynamic = "force-dynamic";

export default async function ArenaPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  let connections = await repo.listPlatformConnections(ws.id);

  // Auto-seed default connections if none exist
  if (connections.length === 0) {
    const defaults = [
      { platform: "openai" as const, label: "OpenAI" },
      { platform: "gemini" as const, label: "Google Gemini" },
      { platform: "claude" as const, label: "Anthropic Claude" },
      { platform: "github" as const, label: "GitHub" },
      { platform: "supabase" as const, label: "Supabase" },
      { platform: "firebase" as const, label: "Firebase" },
      { platform: "railway" as const, label: "Railway" },
      { platform: "render" as const, label: "Render" },
      { platform: "vercel" as const, label: "Vercel" },
      { platform: "stellar" as const, label: "Stellar Testnet", network: "testnet" as const },
      { platform: "stellar" as const, label: "Stellar Mainnet", network: "mainnet" as const },
    ];
    for (const d of defaults) {
      await repo.savePlatformConnection({
        id: shortId("PC"),
        workspaceId: ws.id,
        platform: d.platform,
        label: d.label,
        status: "disconnected",
        credentialReference: "",
        scopes: [],
        network: d.network,
        meta: {},
        createdAt: nowIso(),
      });
    }
    connections = await repo.listPlatformConnections(ws.id);
  }

  return (
    <div className="min-h-screen">
      <div className="px-6 py-5 space-y-6">
        <div>
          <span className="arena-label">ARENA HUB</span>
          <p className="text-[11px] text-arena-secondary mt-0.5">
            Master connections control room · manage who Arena can talk to
          </p>
        </div>
        <ArenaHub initialConnections={connections} />
      </div>
    </div>
  );
}
