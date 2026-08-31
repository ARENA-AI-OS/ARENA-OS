import { getRepository } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat, STATUS_TONE } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";
import { ApproveButton } from "@/components/approve-button";
import { notFound } from "next/navigation";
import type { MissionStatus } from "@domain/index";

export const dynamic = "force-dynamic";

const PHASE_ORDER: { key: MissionStatus; label: string; icon: string }[] = [
  { key: "planning", label: "Planning", icon: "◇" },
  { key: "research", label: "Research", icon: "◈" },
  { key: "coding", label: "Coding", icon: "✦" },
  { key: "testing", label: "Testing", icon: "◉" },
  { key: "deployment", label: "Deployment", icon: "⧉" },
  { key: "verification", label: "Verification", icon: "✷" },
];

function phaseIndex(status: MissionStatus): number {
  const idx = PHASE_ORDER.findIndex((p) => p.key === status);
  return idx >= 0 ? idx : -1;
}

export default async function MissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const mission = await repo.getMission(id);
  if (!mission) notFound();

  const pending = mission.pendingPayment as any;
  const tasks = mission.tasks ?? [];
  const currentIdx = phaseIndex(mission.status);
  const isTerminal = ["completed", "verified", "failed"].includes(mission.status);

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader
        title={mission.title}
        subtitle={mission.id}
        right={<Badge tone={STATUS_TONE[mission.status] ?? "default"}>{mission.status}</Badge>}
      />

      <div className="px-4 md:px-6 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Phase progress bar */}
          <Panel className="p-4 md:p-5">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {PHASE_ORDER.map((phase, i) => {
                const isActive = i === currentIdx;
                const isDone = i < currentIdx || isTerminal;
                const tone = isDone ? "green" : isActive ? "blue" : "muted";
                return (
                  <div key={phase.key} className="flex items-center gap-1.5 shrink-0">
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono transition-colors ${
                      isActive ? "bg-arena-blue/15 text-arena-blue" :
                      isDone ? "bg-arena-green/10 text-arena-green" :
                      "bg-white/5 text-arena-muted"
                    }`}>
                      <StatusDot tone={tone as any} />
                      <span className="hidden sm:inline">{phase.label}</span>
                      <span className="sm:hidden">{phase.icon}</span>
                    </div>
                    {i < PHASE_ORDER.length - 1 && (
                      <div className={`w-4 h-px ${isDone ? "bg-arena-green/40" : "bg-arena-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Payment approval request */}
          {mission.status === "awaiting_approval" && pending && (
            <Panel className="p-5 border-amber-400/30">
              <div className="text-sm font-semibold text-amber-400 mb-2">⏳ Payment Approval Required</div>
              <div className="space-y-1 text-sm text-arena-text">
                <div>Service: <span className="font-mono">{pending.service}</span></div>
                <div>Purpose: {pending.purpose}</div>
                <div>Amount: <span className="font-mono text-arena-green">{pending.amountXlm} XLM</span></div>
                <div className="text-xs text-arena-muted mt-1">{pending.reason}</div>
              </div>
              <div className="mt-3">
                <ApproveButton missionId={mission.id} />
              </div>
            </Panel>
          )}

          {/* Task graph */}
          <Panel>
            <PanelHeader title="Task Graph" subtitle="Planned and executed steps" />
            <div className="divide-y divide-arena-border">
              {tasks.length === 0 && (
                <StepRow stage="commander" title={mission.title} status={mission.status === "failed" ? "failed" : "done"} />
              )}
              {tasks.map((t) => (
                <StepRow key={t.id} stage={t.type} title={t.title} status={t.status} agent={t.agentRole} />
              ))}
            </div>
          </Panel>

          {/* Audit trail */}
          <Panel>
            <PanelHeader title="Audit Trail" subtitle="Every important action is recorded" />
            <div className="p-2">
              <ActivityFeed mission={mission.id} />
            </div>
          </Panel>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Stat label="AI Cost" value={`$${mission.costUsd.toFixed(2)}`} tone="blue" />
            <Stat label="Payments" value={`${mission.paymentsXlm.toFixed(2)} XLM`} tone="green" />
            <Stat label="Files Changed" value={mission.filesChanged} />
            <Stat label="Tests" value={`${mission.testsPassed}/${mission.testsFailed}`} sub="pass/fail" tone={mission.testsFailed ? "red" : "green"} />
          </div>

          <Panel>
            <PanelHeader title="Mission Evidence" />
            <div className="p-4 space-y-3 text-sm">
              <Row label="Verification" value={
                <Badge tone={mission.verificationStatus === "verified" ? "green" : mission.verificationStatus === "failed" ? "red" : "amber"}>
                  {mission.verificationStatus}
                </Badge>
              } />
              <Row label="Deployment" value={
                mission.deploymentUrl
                  ? <a className="text-arena-blue break-all text-xs" href={mission.deploymentUrl} target="_blank" rel="noopener noreferrer">{mission.deploymentUrl}</a>
                  : <span className="text-arena-muted">—</span>
              } />
              <Row label="Receipt" value={
                mission.receiptHash
                  ? <span className="font-mono text-xs text-arena-violet break-all">{mission.receiptHash}</span>
                  : <span className="text-arena-muted">—</span>
              } />
              <Row label="Stellar Tx" value={
                mission.stellarTx
                  ? <span className="font-mono text-xs text-arena-green break-all">{mission.stellarTx}</span>
                  : <span className="text-arena-muted">—</span>
              } />
              <Row label="Models" value={
                <span className="font-mono text-xs">{mission.modelsUsed.join(", ") || "—"}</span>
              } />
              <Row label="Tools" value={
                <div className="flex flex-wrap gap-1 justify-end">
                  {mission.toolsUsed.map((t) => <Badge key={t} tone="cyan">{t}</Badge>)}
                  {mission.toolsUsed.length === 0 && <span className="text-arena-muted">—</span>}
                </div>
              } />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StepRow({ stage, title, status, agent }: { stage: string; title: string; status: string; agent?: string }) {
  const tone = status === "done" ? "green" : status === "failed" ? "red" : status === "running" ? "amber" : "muted";
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <StatusDot tone={tone as any} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-arena-text truncate">{title}</div>
        <div className="text-xs text-arena-muted font-mono">{stage}{agent ? ` · ${agent}` : ""}</div>
      </div>
      <Badge tone={tone as any}>{status}</Badge>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-arena-muted shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
