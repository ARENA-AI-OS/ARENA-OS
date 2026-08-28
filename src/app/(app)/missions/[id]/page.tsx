import { getRepository } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat, STATUS_TONE } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";
import { ApproveButton } from "@/components/approve-button";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const mission = await repo.getMission(id);
  if (!mission) notFound();

  const pending = mission.pendingPayment as any;
  const tasks = mission.tasks ?? [];

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader
        title={mission.title}
        subtitle={mission.id}
        right={<Badge tone={STATUS_TONE[mission.status] ?? "default"}>{mission.status}</Badge>}
      />

      <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {mission.status === "awaiting_approval" && pending && (
            <Panel className="p-5 border-arena-amber/40">
              <div className="text-sm font-semibold text-arena-amber mb-2">Payment Request</div>
              <div className="text-sm text-arena-text">Service: <span className="font-mono">{pending.service}</span></div>
              <div className="text-sm text-arena-text">Purpose: {pending.purpose}</div>
              <div className="text-sm text-arena-text">Amount: <span className="font-mono text-arena-green">{pending.amountXlm} {pending.network === "testnet" ? "XLM (testnet)" : "XLM"}</span></div>
              <div className="text-xs text-arena-muted mt-1">{pending.reason}</div>
              <ApproveButton missionId={mission.id} />
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Task Graph" subtitle="Planned and executed steps" />
            <div className="divide-y divide-arena-border">
              {tasks.length === 0 && <StepRow stage="commander" title={mission.title} status={mission.status === "failed" ? "failed" : "done"} />}
              {tasks.map((t) => (
                <StepRow key={t.id} stage={t.type} title={t.title} status={t.status} agent={t.agentRole} />
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Audit Trail" subtitle="Every important action is recorded" />
            <div className="p-2">
              <ActivityFeed mission={mission.id} />
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="AI Cost" value={`$${mission.costUsd.toFixed(2)}`} tone="blue" />
            <Stat label="Payments" value={`${mission.paymentsXlm.toFixed(2)} XLM`} tone="green" />
            <Stat label="Files Changed" value={mission.filesChanged} />
            <Stat label="Tests" value={`${mission.testsPassed}/${mission.testsFailed}`} sub="pass/fail" tone={mission.testsFailed ? "red" : "green"} />
          </div>

          <Panel>
            <PanelHeader title="Mission Evidence" />
            <div className="p-4 space-y-3 text-sm">
              <Row label="Verification" value={<Badge tone={mission.verificationStatus === "verified" ? "green" : mission.verificationStatus === "failed" ? "red" : "amber"}>{mission.verificationStatus}</Badge>} />
              <Row label="Deployment" value={mission.deploymentUrl ? <a className="text-arena-blue break-all" href={mission.deploymentUrl}>{mission.deploymentUrl}</a> : <span className="text-arena-muted">—</span>} />
              <Row label="Receipt Hash" value={mission.receiptHash ? <span className="font-mono text-xs text-arena-violet break-all">{mission.receiptHash}</span> : <span className="text-arena-muted">—</span>} />
              <Row label="Stellar Tx" value={mission.stellarTx ? <span className="font-mono text-xs text-arena-green break-all">{mission.stellarTx}</span> : <span className="text-arena-muted">—</span>} />
              <Row label="Models" value={<span className="font-mono text-xs">{mission.modelsUsed.join(", ") || "—"}</span>} />
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
      <div className="flex-1">
        <div className="text-sm text-arena-text">{title}</div>
        <div className="text-xs text-arena-muted font-mono">{stage}{agent ? ` · ${agent}` : ""}</div>
      </div>
      <span className="text-xs text-arena-muted font-mono">{status}</span>
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
