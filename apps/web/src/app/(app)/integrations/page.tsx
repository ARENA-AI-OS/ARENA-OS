import { getRepository } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader } from "@/components/ui";
import { IntegrationConnect } from "@/components/integration-connect";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const integrations = await repo.listIntegrations(ws.id);
  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Integrations" subtitle="Connect GitHub, Supabase, Firebase, Railway and Stellar through adapters." />
      <div className="px-6 py-6">
        <Panel>
          <PanelHeader title="Connected Services" right={<IntegrationConnect />} />
          <div className="divide-y divide-arena-border">
            {integrations.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-5 py-3">
                <StatusDot tone={i.connected ? "green" : "muted"} />
                <div className="flex-1">
                  <div className="text-sm text-arena-text">{i.name}</div>
                  <div className="text-xs text-arena-muted font-mono">{i.type}</div>
                </div>
                <Badge tone={i.connected ? "green" : "default"}>{i.connected ? "Connected" : "Not connected"}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
