import { getRepository } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, STATUS_TONE } from "@/components/ui";
import Link from "next/link";
import { MissionsFilter } from "@/components/missions-filter";

export const dynamic = "force-dynamic";

export default async function MissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  let missions = await repo.listMissions(ws.id);

  if (params.status) {
    missions = missions.filter((m) => m.status === params.status);
  }

  const allMissions = await repo.listMissions(ws.id);
  const counts = {
    all: allMissions.length,
    active: allMissions.filter((m) => !["completed", "verified", "failed"].includes(m.status)).length,
    completed: allMissions.filter((m) => ["completed", "verified"].includes(m.status)).length,
    failed: allMissions.filter((m) => m.status === "failed").length,
    awaiting: allMissions.filter((m) => m.status === "awaiting_approval").length,
  };

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Missions" subtitle="Every meaningful request becomes a verifiable mission." />
      <div className="px-4 md:px-6 py-4 md:py-6 space-y-4">
        <MissionsFilter activeFilter={params.status} counts={counts} />
        <Panel>
          <PanelHeader title="Mission Log" subtitle={`${missions.length} total`} />
          <div className="divide-y divide-arena-border">
            {missions.map((m) => (
              <Link key={m.id} href={`/missions/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5">
                <StatusDot tone={STATUS_TONE[m.status] ?? "muted"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-arena-text truncate">{m.title}</div>
                  <div className="text-xs text-arena-muted font-mono">{m.id} · {new Date(m.createdAt).toLocaleString()}</div>
                </div>
                <div className="hidden md:flex gap-1">
                  {m.agents.map((a) => (
                    <Badge key={a} tone="violet">{a}</Badge>
                  ))}
                </div>
                <Badge tone={STATUS_TONE[m.status] ?? "default"}>{m.status}</Badge>
              </Link>
            ))}
            {missions.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No missions match this filter.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
