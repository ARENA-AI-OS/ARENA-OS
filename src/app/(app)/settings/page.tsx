import { getRepository, providerStatus } from "@db/index";
import { AGENT_REGISTRY } from "@domain/index";
import { Panel, PanelHeader, Badge, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const providers = providerStatus();
  const integrations = await repo.listIntegrations(ws.id);
  const apiKeys = await repo.listApiKeys(ws.id);
  const driver = (process.env.ARENA_DB_DRIVER || "memory").toLowerCase();
  const network = process.env.STELLAR_NETWORK || "testnet";
  const agents = Object.values(AGENT_REGISTRY);

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Settings" subtitle="Workspace configuration. Secrets are server-side only." />
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Workspace" value={ws.name} />
          <Stat label="Database" value={driver} tone="blue" />
          <Stat label="Stellar Net" value={network} tone="violet" />
          <Stat label="Owner" value={ws.ownerEmail} sub="single-developer" />
        </div>

        <Panel>
          <PanelHeader title="Connected Providers" />
          <div className="divide-y divide-arena-border">
            {providers.map((p) => (
              <div key={p.provider} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-arena-text">{p.label}</span>
                <Badge tone={p.connected ? "green" : "default"}>{p.connected ? "Connected" : "Not connected"}</Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Agent Configuration" subtitle="Per-agent model routing, capabilities and budget limits" />
          <div className="divide-y divide-arena-border">
            {agents.map((a) => (
              <div key={a.role} className="px-5 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge tone="blue">{a.role}</Badge>
                  <div className="text-sm text-arena-text font-medium">{a.name}</div>
                </div>
                <div className="text-xs text-arena-muted mb-2">{a.description}</div>
                <div className="flex flex-wrap gap-1.5">
                  {a.defaultCapabilities.map((cap) => (
                    <span key={cap} className="inline-block rounded bg-arena-bg/60 border border-arena-border px-2 py-0.5 text-[10px] font-mono text-arena-muted">{cap}</span>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-arena-muted">
                  Default model: <span className="font-mono text-arena-blue">{a.defaultModelRole}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Arena API Keys" subtitle="Scoped, expiring keys for external agents." right={<button className="rounded-md bg-arena-blue px-3 py-1.5 text-xs font-medium text-white">Create API Key</button>} />
          <div className="divide-y divide-arena-border">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <div className="text-sm text-arena-text">{k.name}</div>
                  <div className="text-xs text-arena-muted font-mono">{k.prefix}</div>
                </div>
                <Badge tone={k.environment === "live" ? "green" : "amber"}>{k.environment}</Badge>
                <Badge tone={k.revoked ? "red" : "default"}>{k.revoked ? "revoked" : "active"}</Badge>
              </div>
            ))}
            {apiKeys.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No API keys.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
