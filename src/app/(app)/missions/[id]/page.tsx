import { getRepository } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat, STATUS_TONE } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";
import { ApproveButton } from "@/components/approve-button";
import { PaymentApprovalModal } from "@/components/payment-approval-modal";
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
          {/* Payment Approval Request */}
          {mission.status === "awaiting_approval" && pending && (
            <PaymentApprovalModal
              payment={{
                service: pending.service,
                purpose: pending.purpose,
                amountXlm: pending.amountXlm,
                network: pending.network,
                missionId: mission.id,
                reason: pending.reason,
                remainingBudget: pending.remainingBudget,
              }}
            />
          )}

          {/* Deploy Approval Request */}
          {mission.status === "deployment" && tasks.some(t => t.type === "deploy" && t.status === "pending") && (
            <DeployApprovalPanel mission={mission} />
          )}

          {/* Task Graph */}
          <Panel>
            <PanelHeader title="Task Graph" subtitle="Planned and executed steps" />
            <div className="divide-y divide-arena-border">
              {tasks.length === 0 && <StepRow stage="commander" title={mission.title} status={mission.status === "failed" ? "failed" : "done"} />}
              {tasks.map((t) => (
                <StepRow key={t.id} stage={t.type} title={t.title} status={t.status} agent={t.agentRole} result={t.result} />
              ))}
            </div>
          </Panel>

          {/* Tool Activity */}
          <ToolActivityPanel missionId={mission.id} toolsUsed={mission.toolsUsed} />

          {/* Audit Trail */}
          <Panel>
            <PanelHeader title="Audit Trail" subtitle="Every important action is recorded" />
            <div className="p-2">
              <ActivityFeed mission={mission.id} />
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Stat label="AI Cost" value={`$${mission.costUsd.toFixed(2)}`} tone="blue" />
            <Stat label="Payments" value={`${mission.paymentsXlm.toFixed(2)} XLM`} tone="green" />
            <Stat label="Files Changed" value={mission.filesChanged} />
            <Stat label="Tests" value={`${mission.testsPassed}/${mission.testsFailed}`} sub="pass/fail" tone={mission.testsFailed ? "red" : "green"} />
          </div>

          {/* Verification */}
          <Panel>
            <PanelHeader title="Verification" subtitle="Independent checks (not agent self-report)" />
            <div className="p-4 space-y-3 text-sm">
              <Row label="Status" value={<Badge tone={mission.verificationStatus === "verified" ? "green" : mission.verificationStatus === "failed" ? "red" : "amber"}>{mission.verificationStatus}</Badge>} />
              <Row label="Tests" value={
                <span className={mission.testsFailed > 0 ? "text-arena-red" : "text-arena-green"}>
                  {mission.testsPassed} passed, {mission.testsFailed} failed
                </span>
              } />
              <Row label="Deployment" value={mission.deploymentUrl
                ? <a className="text-arena-blue break-all text-xs" href={mission.deploymentUrl} target="_blank" rel="noopener noreferrer">{mission.deploymentUrl}</a>
                : <span className="text-arena-muted">—</span>
              } />
              <Row label="Receipt Hash" value={mission.receiptHash
                ? <span className="font-mono text-xs text-arena-violet break-all">{mission.receiptHash}</span>
                : <span className="text-arena-muted">—</span>
              } />
              <Row label="Stellar Tx" value={mission.stellarTx
                ? <span className="font-mono text-xs text-arena-green break-all">{mission.stellarTx}</span>
                : <span className="text-arena-muted">—</span>
              } />
              <Row label="Budget" value={
                <span className="font-mono text-xs text-arena-text">
                  {mission.paymentsXlm.toFixed(2)} / {mission.budgetXlm ?? 5} XLM
                </span>
              } />
            </div>
          </Panel>

          {/* Models & Tools */}
          <Panel>
            <PanelHeader title="Execution Details" />
            <div className="p-4 space-y-3 text-sm">
              <Row label="Models" value={
                <div className="flex flex-wrap gap-1 justify-end">
                  {mission.modelsUsed.length > 0
                    ? mission.modelsUsed.map((m) => <Badge key={m} tone="violet">{m}</Badge>)
                    : <span className="text-arena-muted">—</span>
                  }
                </div>
              } />
              <Row label="Tools" value={
                <div className="flex flex-wrap gap-1 justify-end">
                  {mission.toolsUsed.length > 0
                    ? mission.toolsUsed.map((t) => <Badge key={t} tone="cyan">{t.split(".")[0]}</Badge>)
                    : <span className="text-arena-muted">—</span>
                  }
                </div>
              } />
              <Row label="Agents" value={
                <div className="flex flex-wrap gap-1 justify-end">
                  {mission.agents.length > 0
                    ? mission.agents.map((a) => <Badge key={a} tone="blue">{a}</Badge>)
                    : <span className="text-arena-muted">—</span>
                  }
                </div>
              } />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// Deploy Approval Panel — production deploys require explicit user approval
function DeployApprovalPanel({ mission }: { mission: any }) {
  return (
    <Panel className="p-5 border-arena-amber/40">
      <div className="text-sm font-semibold text-arena-amber mb-2">Deploy Approval Required</div>
      <div className="text-xs text-arena-muted mb-3">
        Production deployments require explicit user approval. Preview deployments proceed automatically.
      </div>
      <div className="text-sm text-arena-text">
        Mission: <span className="font-mono">{mission.id}</span>
      </div>
      <div className="flex gap-2 mt-3">
        <ApproveButton missionId={mission.id} />
      </div>
    </Panel>
  );
}

// Tool Activity Panel — shows which tools were used and their status
function ToolActivityPanel({ missionId, toolsUsed }: { missionId: string; toolsUsed: string[] }) {
  if (toolsUsed.length === 0) return null;

  return (
    <Panel>
      <PanelHeader title="Tool Activity" subtitle="Gateway-mediated external calls" />
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {toolsUsed.map((tool) => {
            const provider = tool.split(".")[0];
            return (
              <div key={tool} className="flex items-center gap-2 rounded-lg bg-arena-bg/60 border border-arena-border px-3 py-2">
                <StatusDot tone="blue" />
                <div className="min-w-0">
                  <div className="text-xs font-mono text-arena-text truncate">{tool}</div>
                  <div className="text-[10px] text-arena-muted">{provider}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function StepRow({ stage, title, status, agent, result }: {
  stage: string;
  title: string;
  status: string;
  agent?: string;
  result?: any;
}) {
  const tone = status === "done" ? "green" : status === "failed" ? "red" : status === "running" ? "amber" : "muted";
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <StatusDot tone={tone as any} />
      <div className="flex-1">
        <div className="text-sm text-arena-text">{title}</div>
        <div className="text-xs text-arena-muted font-mono">{stage}{agent ? ` · ${agent}` : ""}</div>
      </div>
      <div className="text-right">
        <span className="text-xs text-arena-muted font-mono">{status}</span>
        {result?.mock && <Badge tone="amber">mock</Badge>}
      </div>
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
