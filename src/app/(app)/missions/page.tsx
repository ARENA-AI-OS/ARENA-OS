import { getRepository } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, STATUS_TONE } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const missions = await repo.listMissions(ws.id);

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Missions" subtitle="Every meaningful request becomes a verifiable mission." />
      <div className="px-6 py-6">
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
            {missions.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No missions yet.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
