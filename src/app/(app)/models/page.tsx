import { providerStatus } from "@db/index";
import { AGENT_REGISTRY } from "@domain/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

// Default model routing strategy per task kind
const ROUTING_STRATEGY = {
  research: ["gemini", "claude"],
  code: ["openai", "claude"],
  reasoning: ["claude", "openai"],
  simple: ["openai", "gemini"],
};

export default function ModelsPage() {
  const providers = providerStatus();
  const connected = providers.filter((p) => p.connected).length;
  const agents = Object.values(AGENT_REGISTRY);

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Models" subtitle="Model-agnostic gateway. Connect your own provider keys (server-side only)." />
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Providers" value={providers.length} />
          <Stat label="Connected" value={connected} tone="green" />
          <Stat label="Router" value="active" tone="blue" />
          <Stat label="Failover" value="on" tone="violet" />
        </div>

        <Panel>
          <PanelHeader title="AI Providers" subtitle="Keys are read from environment variables and never sent to models." />
          <div className="divide-y divide-arena-border">
            {providers.map((p) => (
              <div key={p.provider} className="flex items-center gap-3 px-5 py-3">
                <StatusDot tone={p.connected ? "green" : "muted"} />
                <div className="flex-1">
                  <div className="text-sm text-arena-text">{p.label}</div>
                  <div className="text-xs text-arena-muted font-mono">{p.provider}</div>
                </div>
                <div className="hidden md:flex gap-1">
                  {p.models.map((m) => <Badge key={m} tone="violet">{m}</Badge>)}
                </div>
                <Badge tone={p.connected ? "green" : "default"}>{p.connected ? "Connected" : "Not connected"}</Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Agent Model Routing" subtitle="Each agent routes to the best provider for its task kind. Auto-failover on error." />
          <div className="divide-y divide-arena-border">
            {agents.map((a) => (
              <div key={a.role} className="px-5 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge tone="blue">{a.role}</Badge>
                  <span className="text-sm text-arena-text font-medium">{a.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-arena-muted">Task kind:</span>
                  <Badge tone="violet">{a.defaultModelRole}</Badge>
                  <span className="text-arena-muted">→</span>
                  <div className="flex gap-1">
                    {(ROUTING_STRATEGY[a.defaultModelRole as keyof typeof ROUTING_STRATEGY] ?? ["mock"]).map((p, i) => (
                      <span key={p} className="text-arena-text font-mono">
                        {i > 0 && <span className="text-arena-muted"> → </span>}{p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Default Routing Strategy" subtitle="Task kind → provider priority list (manual overrides available via command bar)" />
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(ROUTING_STRATEGY).map(([kind, providers]) => (
                <div key={kind} className="rounded-lg bg-arena-bg/60 border border-arena-border p-3">
                  <div className="text-xs text-arena-muted uppercase mb-2">{kind}</div>
                  <div className="space-y-1">
                    {providers.map((p, i) => (
                      <div key={p} className="flex items-center gap-2 text-sm">
                        <span className="text-arena-muted font-mono text-xs">{i + 1}.</span>
                        <span className="text-arena-text">{p}</span>
                        {i === 0 && <Badge tone="green">primary</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
