import { getRepository } from "@db/index";
import { defaultPolicy, calculateDailySpend } from "@stellar/x402";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const repo = getRepository();
  const payments = await repo.listPayments();
  const policy = defaultPolicy();
  const total = payments.reduce((s, p) => s + p.amountXlm, 0);
  const dailySpend = calculateDailySpend(payments);
  const todayPayments = payments.filter((p) => p.createdAt.startsWith(new Date().toISOString().split("T")[0]));
  const todayTotal = todayPayments.reduce((s, p) => s + p.amountXlm, 0);

  // Group by mission
  const byMission = new Map<string, { service: string; amountXlm: number; status: string; txHash?: string }[]>();
  for (const p of payments) {
    const key = p.missionId || "unknown";
    if (!byMission.has(key)) byMission.set(key, []);
    byMission.get(key)!.push(p);
  }

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Payments" subtitle="x402 payments with policy enforcement, Stellar settlement, and on-chain verification." />
      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Spent" value={`${total.toFixed(2)} XLM`} tone="green" />
          <Stat label="Today" value={`${todayTotal.toFixed(2)} XLM`} sub={`${todayPayments.length} txns`} tone="cyan" />
          <Stat label="Daily Limit" value={`${policy.perDayXlm} XLM`} sub={`${(policy.perDayXlm - dailySpend).toFixed(2)} remaining`} tone="blue" />
          <Stat label="Transactions" value={payments.length} tone="violet" />
        </div>

        {/* Payment Policy */}
        <Panel>
          <PanelHeader title="Payment Policy" subtitle="Hard limits enforced by the Tool Gateway — agents cannot spend outside policy" />
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <PolicyItem label="Per Request" limit={`${policy.perRequestXlm} XLM`} current={`${dailySpend.toFixed(2)} XLM today`} />
              <PolicyItem label="Per Mission" limit={`${policy.perMissionXlm} XLM`} current="budget per mission" />
              <PolicyItem label="Daily Limit" limit={`${policy.perDayXlm} XLM`} current={`${dailySpend.toFixed(2)} XLM used`} />
              <PolicyItem label="Approval Threshold" limit={`${policy.approvalThresholdXlm} XLM`} current="above needs approval" />
              <PolicyItem label="Asset" limit={policy.asset} current={policy.network} />
              <PolicyItem label="Auto-Approve" limit={`≤ ${policy.approvalThresholdXlm} XLM`} current="within threshold" />
            </div>
            <div className="mt-4 text-xs text-arena-muted p-3 rounded-lg bg-arena-bg/60 border border-arena-border">
              <span className="text-arena-blue font-medium">Policy enforcement:</span> Every payment request passes through the Payment Policy Engine in the Tool Gateway. Denied requests are blocked at the infrastructure level — this is not a soft warning.
            </div>
          </div>
        </Panel>

        {/* Today's Spend */}
        {todayPayments.length > 0 && (
          <Panel>
            <PanelHeader title="Today's Spend" subtitle={`${todayPayments.length} transactions`} />
            <div className="divide-y divide-arena-border">
              {todayPayments.map((p) => (
                <PaymentRow key={p.id} payment={p} />
              ))}
            </div>
          </Panel>
        )}

        {/* Spend by Mission */}
        {byMission.size > 0 && (
          <Panel>
            <PanelHeader title="Spend by Mission" subtitle="Payment breakdown per mission" />
            <div className="divide-y divide-arena-border">
              {Array.from(byMission.entries()).map(([missionId, items]) => {
                const missionTotal = items.reduce((s, p) => s + p.amountXlm, 0);
                return (
                  <div key={missionId} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-arena-text font-mono">{missionId}</span>
                      <span className="text-sm font-mono text-arena-green">{missionTotal.toFixed(2)} XLM</span>
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <div key={item.service} className="flex items-center gap-2 text-xs">
                          <Badge tone={item.status === "settled" ? "green" : "amber"}>{item.status}</Badge>
                          <span className="text-arena-muted">{item.service}</span>
                          <span className="text-arena-text font-mono">{item.amountXlm} XLM</span>
                          {item.txHash && (
                            <span className="text-arena-muted font-mono truncate max-w-[120px]">tx:{item.txHash.slice(0, 12)}...</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Full Ledger */}
        <Panel>
          <PanelHeader title="Payment Ledger" subtitle="All transactions with Stellar confirmation status" />
          <div className="divide-y divide-arena-border">
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
            {payments.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No payments yet.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PaymentRow({ payment: p }: { payment: any }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <StatusDot tone={p.status === "settled" ? "green" : p.status === "denied" ? "red" : "amber"} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-arena-text">{p.service}</span>
          <Badge tone={p.status === "settled" ? "green" : "amber"}>{p.status}</Badge>
        </div>
        <div className="text-xs text-arena-muted font-mono mt-0.5">{p.purpose} · {p.network}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono text-arena-green">{p.amountXlm} XLM</div>
        {p.txHash && (
          <div className="text-[10px] text-arena-muted font-mono mt-0.5 break-all">
            tx: {p.txHash.slice(0, 16)}...
          </div>
        )}
        {p.settledAt && (
          <div className="text-[10px] text-arena-muted mt-0.5">
            {new Date(p.settledAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

function PolicyItem({ label, limit, current }: { label: string; limit: string; current: string }) {
  return (
    <div className="rounded-lg bg-arena-bg/60 border border-arena-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-arena-muted">{label}</div>
      <div className="text-sm font-mono text-arena-text mt-1">{limit}</div>
      <div className="text-[10px] text-arena-muted mt-0.5">{current}</div>
    </div>
  );
}
