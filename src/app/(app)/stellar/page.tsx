import { getRepository } from "@db/index";
import { walletState } from "@stellar/wallet";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StellarPage() {
  const repo = getRepository();
  const wallet = await walletState();
  const txs = await repo.listStellarTx();
  const payments = await repo.listPayments();

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Stellar" subtitle="Native Web3 layer: wallet, receipt anchoring, x402 settlement." />
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Network" value={wallet.network} tone="violet" />
          <Stat label="Configured" value={wallet.configured ? "Yes" : "No (mock)"} tone={wallet.configured ? "green" : "amber"} />
          <Stat label="Anchors" value={txs.length} tone="green" />
          <Stat label="Balance" value={wallet.balanceXlm !== undefined ? `${wallet.balanceXlm} XLM` : "—"} />
        </div>

        <Panel>
          <PanelHeader title="Wallet" subtitle="Public key only — secret never exposed to the browser or models." />
          <div className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <StatusDot tone={wallet.configured ? "green" : "amber"} />
              <span className="font-mono text-xs text-arena-text break-all">{wallet.publicKey}</span>
            </div>
            {!wallet.configured && <div className="text-xs text-arena-muted">Set STELLAR_SECRET_KEY to enable real testnet anchoring. Until then, anchors are simulated.</div>}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Receipt Anchors & Payments" subtitle="On-chain evidence for missions" />
          <div className="divide-y divide-arena-border">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <StatusDot tone={t.status === "confirmed" ? "green" : "amber"} />
                <div className="flex-1">
                  <div className="text-sm text-arena-text font-mono">{t.kind}</div>
                  <div className="text-xs text-arena-muted font-mono break-all">{t.txHash}</div>
                </div>
                <Badge tone="violet">{t.network}</Badge>
              </div>
            ))}
            {txs.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No anchors yet.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
