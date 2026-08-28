import { providerStatus } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ModelsPage() {
  const providers = providerStatus();
  const connected = providers.filter((p) => p.connected).length;
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
      </div>
    </div>
  );
}
