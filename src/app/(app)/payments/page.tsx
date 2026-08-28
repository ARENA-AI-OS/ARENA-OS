import { getRepository } from "@db/index";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const repo = getRepository();
  const payments = await repo.listPayments();
  const total = payments.reduce((s, p) => s + p.amountXlm, 0);

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Payments" subtitle="x402 payments with policy enforcement and full reconciliation." />
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="Total Spent" value={`${total.toFixed(2)} XLM`} tone="green" />
          <Stat label="Transactions" value={payments.length} />
          <Stat label="Policy" value="active" tone="blue" />
        </div>
        <Panel>
          <PanelHeader title="Payment Ledger" />
          <div className="divide-y divide-arena-border">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <StatusDot tone={p.status === "settled" ? "green" : p.status === "denied" ? "red" : "amber"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-arena-text">{p.service}</div>
                  <div className="text-xs text-arena-muted font-mono">{p.purpose} · {p.network}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-arena-green">{p.amountXlm} XLM</div>
                  <Badge tone={p.status === "settled" ? "green" : "amber"}>{p.status}</Badge>
                </div>
              </div>
            ))}
            {payments.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No payments yet.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
