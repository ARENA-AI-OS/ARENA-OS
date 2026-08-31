import { getRepository, providerStatus } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader } from "@/components/ui";
import { IntegrationConnect } from "@/components/integration-connect";

export const dynamic = "force-dynamic";

const INTEGRATION_INFO: Record<string, { label: string; description: string; envVar: string; docsUrl: string }> = {
  github: {
    label: "GitHub",
    description: "Repository access, issues, PRs, and CI checks.",
    envVar: "GITHUB_TOKEN",
    docsUrl: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token",
  },
  supabase: {
    label: "Supabase",
    description: "PostgreSQL database, auth, storage, and Edge Functions.",
    envVar: "SUPABASE_URL + SUPABASE_SERVICE_KEY",
    docsUrl: "https://supabase.com/docs/guides/api",
  },
  firebase: {
    label: "Firebase",
    description: "Firestore, Authentication, Cloud Storage, and Hosting.",
    envVar: "FIREBASE_PROJECT_ID + FIREBASE_API_KEY",
    docsUrl: "https://firebase.google.com/docs/web/setup",
  },
  railway: {
    label: "Railway",
    description: "Container deployments, preview environments, and logs.",
    envVar: "RAILWAY_TOKEN",
    docsUrl: "https://docs.railway.app/reference/token",
  },
  stellar: {
    label: "Stellar",
    description: "Blockchain payments, Soroban contracts, and receipt anchoring.",
    envVar: "STELLAR_SECRET_KEY",
    docsUrl: "https://developers.stellar.org/docs",
  },
};

export default async function IntegrationsPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const integrations = await repo.listIntegrations(ws.id);
  const providers = providerStatus();

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Integrations" subtitle="Connect external services through the Tool Gateway. All calls are permission-checked and audited." />
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(INTEGRATION_INFO).map(([type, info]) => {
            const connected = integrations.find((i) => i.type === type)?.connected ?? false;
            return (
              <Panel key={type} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <StatusDot tone={connected ? "green" : "muted"} />
                  <span className="text-sm font-medium text-arena-text">{info.label}</span>
                </div>
                <Badge tone={connected ? "green" : "default"}>
                  {connected ? "Connected" : "Not connected"}
                </Badge>
              </Panel>
            );
          })}
        </div>

        <Panel>
          <PanelHeader title="Connected Services" right={<IntegrationConnect />} />
          <div className="divide-y divide-arena-border">
            {integrations.map((i) => {
              const info = INTEGRATION_INFO[i.type];
              return (
                <div key={i.id} className="flex items-center gap-4 px-5 py-4">
                  <StatusDot tone={i.connected ? "green" : "muted"} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-arena-text">{info?.label ?? i.name}</div>
                    <div className="text-xs text-arena-muted mt-0.5">{info?.description ?? i.type}</div>
                    <div className="text-[10px] text-arena-muted font-mono mt-1">
                      env: {info?.envVar ?? "unknown"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={i.connected ? "green" : "default"}>
                      {i.connected ? "Connected" : "Not connected"}
                    </Badge>
                    {info?.docsUrl && (
                      <a
                        href={info.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-arena-blue hover:underline"
                      >
                        docs
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            {integrations.length === 0 && (
              <div className="px-5 py-8 text-sm text-arena-muted">No integrations configured.</div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Provider Keys Status"
            subtitle="API keys are read from environment variables and never exposed to agents or models."
          />
          <div className="divide-y divide-arena-border">
            {providers.map((p) => (
              <div key={p.provider} className="flex items-center gap-3 px-5 py-3">
                <StatusDot tone={p.connected ? "green" : "muted"} />
                <div className="flex-1">
                  <div className="text-sm text-arena-text">{p.label}</div>
                  <div className="text-xs text-arena-muted font-mono">{p.provider}</div>
                </div>
                <div className="hidden md:flex gap-1">
                  {p.models.map((m) => (
                    <Badge key={m} tone="violet">{m}</Badge>
                  ))}
                </div>
                <Badge tone={p.connected ? "green" : "default"}>
                  {p.connected ? "Key set" : "No key"}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
