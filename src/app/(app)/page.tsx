import { getRepository, providerStatus } from "@db/index";
import { CommandBar } from "@/components/command-bar";
import { Panel, PanelHeader, Stat, Badge, StatusDot, PageHeader, STATUS_TONE } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CommandCenter() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const [missions, projects, providers, payments, stellar] = await Promise.all([
    repo.listMissions(ws.id),
    repo.listProjects(ws.id),
    Promise.resolve(providerStatus()),
    repo.listPayments(),
    repo.listStellarTx(),
  ]);

  const active = missions.filter((m) => !["completed", "verified", "failed"].includes(m.status));
  const completed = missions.filter((m) => ["completed", "verified"].includes(m.status));
  const awaiting = missions.filter((m) => m.status === "awaiting_approval");

  const aiUsage = aggregateModels(missions);
  const providerCosts = aggregateProviderCosts(missions);
  const totalCost = missions.reduce((sum, m) => sum + m.costUsd, 0);
  const toolUsage = aggregateTools(missions);
  const todayPayments = payments.filter((p) => isToday(p.createdAt)).reduce((s, p) => s + p.amountXlm, 0);

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Command Center" subtitle="One workspace. Every AI. Every tool. One autonomous developer OS." />

      <div className="px-6 py-6 space-y-6">
        <CommandBar projects={projects.map((p) => ({ id: p.id, name: p.name }))} providers={providers} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Active Missions" value={active.length} sub={`${completed.length} completed`} tone="blue" />
          <Stat label="Awaiting Approval" value={awaiting.length} sub={awaiting.length ? "needs your decision" : "all clear"} tone="amber" />
          <Stat label="Payments Today" value={`${todayPayments.toFixed(2)} XLM`} sub={`${payments.length} total`} tone="green" />
          <Stat label="Stellar Anchors" value={stellar.length} sub="receipts on-chain" tone="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel className="lg:col-span-2">
            <PanelHeader title="Mission Status" subtitle="Live overview of your autonomous work" />
            <div className="divide-y divide-arena-border">
              {missions.slice(0, 6).map((m) => (
                <Link key={m.id} href={`/missions/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5">
                  <StatusDot tone={STATUS_TONE[m.status] ?? "muted"} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-arena-text truncate">{m.title}</div>
                    <div className="text-xs text-arena-muted font-mono">{m.id}</div>
                  </div>
                  <Badge tone={STATUS_TONE[m.status] ?? "default"}>{m.status}</Badge>
                </Link>
              ))}
              {missions.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No missions yet. Use the command bar above to start one.</div>}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel>
              <PanelHeader title="AI Usage" subtitle="Cost breakdown by provider" />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-arena-muted uppercase">Total Cost</span>
                  <span className="font-mono text-sm text-arena-blue">${totalCost.toFixed(2)}</span>
                </div>
                <div className="h-px bg-arena-border" />
                {providerCosts.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between text-sm">
                    <span className="text-arena-muted capitalize">{p.provider}</span>
                    <span className="font-mono text-arena-text">${p.cost.toFixed(2)}</span>
                  </div>
                ))}
                {providerCosts.length === 0 && <div className="text-sm text-arena-muted">No usage yet.</div>}
                {aiUsage.length > 0 && (
                  <>
                    <div className="h-px bg-arena-border" />
                    <div className="text-xs text-arena-muted uppercase">By Model</div>
                    {aiUsage.map((u) => (
                      <div key={u.model} className="flex items-center justify-between text-xs">
                        <span className="text-arena-muted font-mono">{u.model}</span>
                        <span className="font-mono text-arena-text">${u.cost.toFixed(4)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Panel>
            <Panel>
              <PanelHeader title="Tool Activity" subtitle="Gateway-mediated external calls" />
              <div className="p-4 space-y-2">
                {toolUsage.slice(0, 8).map((u) => {
                  const provider = u.tool.split(".")[0];
                  const providerTone: Record<string, string> = {
                    github: "violet",
                    terminal: "blue",
                    supabase: "green",
                    railway: "amber",
                    firebase: "cyan",
                    stellar: "cyan",
                  };
                  return (
                    <div key={u.tool} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge tone={(providerTone[provider] ?? "default") as any}>{provider}</Badge>
                        <span className="text-arena-muted font-mono text-xs">{u.tool}</span>
                      </div>
                      <span className="font-mono text-arena-text">{u.calls}</span>
                    </div>
                  );
                })}
                {toolUsage.length === 0 && <div className="text-sm text-arena-muted">No tool calls yet.</div>}
                {toolUsage.length > 8 && <div className="text-xs text-arena-muted">+{toolUsage.length - 8} more</div>}
              </div>
            </Panel>
          </div>
        </div>

        <Panel>
          <PanelHeader title="Activity Center" subtitle="Real-time event stream across agents, tools, payments and Stellar" />
          <div className="p-2">
            <ActivityFeed mission={undefined} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function aggregateModels(missions: { modelsUsed: string[]; costUsd: number }[]) {
  const map = new Map<string, number>();
  for (const m of missions) for (const model of m.modelsUsed) map.set(model, (map.get(model) ?? 0) + m.costUsd);
  const entries = Array.from(map.entries()).map(([model, cost]) => ({ model, cost }));
  entries.sort((a, b) => b.cost - a.cost);
  return entries;
}

function aggregateProviderCosts(missions: { modelsUsed: string[]; costUsd: number }[]) {
  const map = new Map<string, number>();
  for (const m of missions) {
    const costPerModel = m.costUsd / Math.max(m.modelsUsed.length, 1);
    for (const model of m.modelsUsed) {
      const provider = model.split("-")[0]; // extract provider name
      map.set(provider, (map.get(provider) ?? 0) + costPerModel);
    }
  }
  return Array.from(map.entries()).map(([provider, cost]) => ({ provider, cost })).sort((a, b) => b.cost - a.cost);
}

function aggregateTools(missions: { toolsUsed: string[] }[]) {
  const map = new Map<string, number>();
  for (const m of missions) for (const t of m.toolsUsed) map.set(t, (map.get(t) ?? 0) + 1);
  return Array.from(map.entries()).map(([tool, calls]) => ({ tool, calls })).sort((a, b) => b.calls - a.calls);
}

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
