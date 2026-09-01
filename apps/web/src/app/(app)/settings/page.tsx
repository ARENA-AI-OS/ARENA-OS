import { getRepository, providerStatus } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot } from "@/components/ui";
import { AGENT_REGISTRY } from "@domain/index";
import { ApiKeyManager } from "@/components/api-key-manager";
import { ExhibitionAdmin } from "@/components/exhibition-admin";
import { SettingsTabs } from "@/components/settings-tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const providers = providerStatus();
  const apiKeys = await repo.listApiKeys(ws.id);
  const driver = (process.env.ARENA_DB_DRIVER || "memory").toLowerCase();
  const network = process.env.STELLAR_NETWORK || "testnet";

  return (
    <div className="min-h-screen">
      <div className="px-6 py-5 space-y-4">
        <div>
          <span className="arena-label">SETTINGS</span>
          <p className="text-[11px] text-arena-secondary mt-0.5">
            Workspace configuration · secrets are server-side only
          </p>
        </div>

        <SettingsTabs>
          {/* System Info */}
          <Panel>
            <PanelHeader title="SYSTEM" subtitle="Workspace configuration" />
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoBlock label="WORKSPACE" value={ws.name} />
              <InfoBlock label="DATABASE" value={driver} />
              <InfoBlock label="STELLAR NET" value={network} />
              <InfoBlock label="OWNER" value={ws.ownerEmail} />
            </div>
          </Panel>

          {/* Provider connections */}
          <Panel>
            <PanelHeader
              title="CONNECTED PROVIDERS"
              subtitle="AI model providers and external services"
            />
            <div className="divide-y divide-arena-border/30">
              {providers.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot tone={p.connected ? "green" : "muted"} />
                    <span className="text-[11px] text-arena-text">
                      {p.label}
                    </span>
                  </div>
                  <Badge tone={p.connected ? "green" : "muted"}>
                    {p.connected ? "ACTIVE" : "NOT CONNECTED"}
                  </Badge>
                </div>
              ))}
            </div>
          </Panel>

          {/* Agent capabilities matrix */}
          <Panel>
            <PanelHeader
              title="AGENT CAPABILITIES"
              subtitle="Capability-based permissions per agent role"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-arena-border">
                    <th className="px-4 py-2 text-left font-mono text-[9px] tracking-[0.08em] uppercase text-arena-muted">
                      Capability
                    </th>
                    {Object.keys(AGENT_REGISTRY).map((role) => (
                      <th
                        key={role}
                        className="px-2 py-2 text-center font-mono text-[8px] tracking-[0.08em] uppercase text-arena-muted"
                      >
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border/30">
                  {[
                    "github:read_repository",
                    "github:read_issue",
                    "github:create_branch",
                    "github:write_files",
                    "github:create_commit",
                    "github:create_pull_request",
                    "railway:read_project",
                    "railway:deploy_preview",
                    "stellar:read_wallet",
                    "stellar:spend",
                    "supabase:read_database",
                    "terminal:run",
                    "mission:plan",
                  ].map((cap) => (
                    <tr key={cap} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-1.5 font-mono text-arena-text">
                        {cap}
                      </td>
                      {Object.values(AGENT_REGISTRY).map((agent) => {
                        const has =
                          agent.defaultCapabilities.includes(cap) ||
                          agent.defaultCapabilities.some(
                            (c) =>
                              c.endsWith(":*") && cap.startsWith(c.slice(0, -1))
                          );
                        return (
                          <td
                            key={agent.role}
                            className="px-2 py-1.5 text-center"
                          >
                            {has ? (
                              <span className="text-arena-green">✓</span>
                            ) : (
                              <span className="text-arena-muted/20">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Exhibition Admin */}
          <ExhibitionAdmin workspaceId={ws.id} />

          {/* API Keys */}
          <ApiKeyManager apiKeys={apiKeys} workspaceId={ws.id} />
        </SettingsTabs>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="arena-inset px-3 py-2 rounded">
      <div className="arena-label text-[8px]">{label}</div>
      <div className="font-mono text-[11px] text-arena-text mt-0.5">
        {value}
      </div>
    </div>
  );
}
