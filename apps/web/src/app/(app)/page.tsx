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
  const toolUsage = aggregateTools(missions);
  const todayPayments = payments.filter((p) => isToday(p.createdAt)).reduce((s, p) => s + p.amountXlm, 0);

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Command Center" subtitle="One workspace. Every AI. Every tool. One autonomous developer OS." />

      <div className="px-4 md:px-6 py-4 md:py-6 space-y-6">
        <CommandBar projects={projects.map((p) => ({ id: p.id, name: p.name }))} providers={providers} />

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Stat label="Active Missions" value={active.length} sub={`${completed.length} completed`} tone="blue" />
          <Stat label="Awaiting Approval" value={awaiting.length} sub={awaiting.length ? "needs your decision" : "all clear"} tone="amber" />
          <Stat label="Payments Today" value={`${todayPayments.toFixed(2)} XLM`} sub={`${payments.length} total`} tone="green" />
          <Stat label="Stellar Anchors" value={stellar.length} sub="receipts on-chain" tone="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mission status list */}
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

          {/* Side panels */}
          <div className="space-y-6">
            <Panel>
              <PanelHeader title="AI Usage" subtitle="Awaiting Prompt 4 integration" />
              <div className="p-4 space-y-2">
                {aiUsage.length > 0 ? aiUsage.map((u) => (
                  <div key={u.model} className="flex items-center justify-between text-sm">
                    <span className="text-arena-muted">{u.model}</span>
                    <span className="font-mono text-arena-text">${u.cost.toFixed(2)}</span>
                  </div>
                )) : (
                  <div className="text-sm text-arena-muted">No AI usage yet. Connect providers in Settings.</div>
                )}
              </div>
            </Panel>
            <Panel>
              <PanelHeader title="Tool Activity" subtitle="Awaiting Prompt 5 integration" />
              <div className="p-4 space-y-2">
                {toolUsage.length > 0 ? toolUsage.map((u) => (
                  <div key={u.tool} className="flex items-center justify-between text-sm">
                    <span className="text-arena-muted font-mono text-xs">{u.tool}</span>
                    <span className="font-mono text-arena-text">{u.calls}</span>
                  </div>
                )) : (
                  <div className="text-sm text-arena-muted">No tool calls yet.</div>
                )}
              </div>
            </Panel>
          </div>
        </div>

        {/* Activity stream */}
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
  return Array.from(map.entries()).map(([model, cost]) => ({ model, cost }));
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
