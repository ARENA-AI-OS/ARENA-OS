import { getRepository, providerStatus } from "@db/index";
import { Panel, PanelHeader, Badge, PageHeader, Stat } from "@/components/ui";
import { AGENT_REGISTRY } from "@domain/index";
import { ApiKeyManager } from "@/components/api-key-manager";

export const dynamic = "force-dynamic";

const ALL_CAPABILITIES = [
  // GitHub
  "github:read_repository", "github:read_issue", "github:create_branch",
  "github:write_files", "github:create_commit", "github:create_pull_request",
  "github:read_checks", "github:merge_pull_request",
  // Railway
  "railway:read_project", "railway:deploy_preview", "railway:deploy_production", "railway:read_logs",
  // Stellar
  "stellar:read_wallet", "stellar:prepare_transaction", "stellar:submit_transaction", "stellar:spend",
  // Supabase
  "supabase:read_database", "supabase:schema_change",
  // Terminal
  "terminal:run",
  // Mission
  "mission:plan", "agent:assign",
];

export default async function SettingsPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const providers = providerStatus();
  const apiKeys = await repo.listApiKeys(ws.id);
  const driver = (process.env.ARENA_DB_DRIVER || "memory").toLowerCase();
  const network = process.env.STELLAR_NETWORK || "testnet";

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Settings" subtitle="Workspace configuration. Secrets are server-side only." />
      <div className="px-4 md:px-6 py-4 md:py-6 space-y-6">
        {/* System stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Stat label="Workspace" value={ws.name} />
          <Stat label="Database" value={driver} tone="blue" />
          <Stat label="Stellar Net" value={network} tone="violet" />
          <Stat label="Owner" value={ws.ownerEmail || ws.ownerId} sub="single-developer" />
        </div>

        {/* Provider connections */}
        <Panel>
          <PanelHeader title="Connected Providers" subtitle="AI model providers and external services" />
          <div className="divide-y divide-arena-border">
            {providers.map((p) => (
              <div key={p.provider} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-arena-text">{p.label}</span>
                <Badge tone={p.connected ? "green" : "default"}>{p.connected ? "Connected" : "Not connected"}</Badge>
              </div>
            ))}
          </div>
        </Panel>

        {/* Agent capabilities matrix */}
        <Panel>
          <PanelHeader
            title="Agent Capabilities"
            subtitle="Capability-based permissions per agent role (enforced server-side)"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-arena-border">
                  <th className="px-5 py-3 text-left text-arena-muted font-medium">Capability</th>
                  {Object.keys(AGENT_REGISTRY).map((role) => (
                    <th key={role} className="px-3 py-3 text-center text-arena-muted font-medium font-mono">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-arena-border/50">
                {ALL_CAPABILITIES.map((cap) => (
                  <tr key={cap} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-2 font-mono text-arena-text">{cap}</td>
                    {Object.values(AGENT_REGISTRY).map((agent) => {
                      const has = agent.defaultCapabilities.includes(cap) ||
                        agent.defaultCapabilities.some((c) => c.endsWith(":*") && cap.startsWith(c.slice(0, -1)));
                      return (
                        <td key={agent.role} className="px-3 py-2 text-center">
                          {has ? <span className="text-arena-green">✓</span> : <span className="text-arena-muted/30">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* API Keys */}
        <ApiKeyManager apiKeys={apiKeys} workspaceId={ws.id} />
      </div>
    </div>
  );
}
