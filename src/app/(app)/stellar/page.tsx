import { getRepository } from "@db/index";
import { walletState, transactionHistory } from "@stellar/wallet";
import { Panel, PanelHeader, Badge, StatusDot, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StellarPage() {
  const repo = getRepository();
  const wallet = await walletState();
  const txHistory = await transactionHistory(10);
  const txs = await repo.listStellarTx();
  const payments = await repo.listPayments();
  const receipts = payments.filter((p) => p.receiptHash);

  const confirmedCount = txs.filter((t) => t.status === "confirmed").length;

  return (
    <div className="bg-arena-grid min-h-screen">
      <PageHeader title="Stellar" subtitle="Native Web3 layer: wallet, receipt anchoring, x402 settlement, on-chain verification." />
      <div className="px-6 py-6 space-y-6">
        {/* Wallet Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Network" value={wallet.network} tone="violet" />
          <Stat label="Status" value={wallet.configured ? "Connected" : "Mock Mode"} tone={wallet.configured ? "green" : "amber"} />
          <Stat label="Balance" value={wallet.balanceXlm !== undefined ? `${wallet.balanceXlm.toFixed(2)} XLM` : "—"} tone="cyan" />
          <Stat label="Anchors" value={`${confirmedCount}/${txs.length}`} sub="confirmed" tone="green" />
        </div>

        {/* Wallet Details */}
        <Panel>
          <PanelHeader title="Wallet" subtitle="Public key only — secret never exposed to browser or models" />
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <StatusDot tone={wallet.configured ? "green" : "amber"} />
              <div className="flex-1">
                <div className="text-xs text-arena-muted">Public Key</div>
                <div className="font-mono text-xs text-arena-text break-all mt-1">{wallet.publicKey}</div>
              </div>
            </div>
            {wallet.sequenceNumber && (
              <div className="flex items-center gap-3">
                <StatusDot tone="blue" />
                <div className="flex-1">
                  <div className="text-xs text-arena-muted">Sequence Number</div>
                  <div className="font-mono text-xs text-arena-text mt-1">{wallet.sequenceNumber}</div>
                </div>
              </div>
            )}
            {!wallet.configured && (
              <div className="text-xs text-arena-muted p-3 rounded-lg bg-arena-bg/60 border border-arena-border">
                Set <code className="text-arena-blue">STELLAR_SECRET_KEY</code> to enable real testnet anchoring and payments. Until then, all Stellar operations are simulated.
              </div>
            )}
          </div>
        </Panel>

        {/* Transaction History */}
        <Panel>
          <PanelHeader title="Transaction History" subtitle="Recent Stellar transactions" />
          <div className="divide-y divide-arena-border">
            {txHistory.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                <StatusDot tone={tx.successful ? "green" : "red"} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-arena-text font-mono">{tx.type}</span>
                    {tx.amount && <Badge tone="cyan">{tx.amount} XLM</Badge>}
                  </div>
                  <div className="text-xs text-arena-muted font-mono break-all mt-0.5">{tx.hash}</div>
                </div>
                <div className="text-right">
                  {tx.ledger && <div className="text-[10px] text-arena-muted">Ledger {tx.ledger}</div>}
                  <div className="text-[10px] text-arena-muted">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {txHistory.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No transactions yet.</div>}
          </div>
        </Panel>

        {/* Receipt Anchors */}
        <Panel>
          <PanelHeader title="Receipt Anchors" subtitle="Mission receipts anchored on Stellar" />
          <div className="divide-y divide-arena-border">
            {txs.map((t) => {
              const mission = t.missionId ? "Mission " + t.missionId : "Unknown";
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <StatusDot tone={t.status === "confirmed" ? "green" : "amber"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-arena-text">{t.kind}</span>
                      <Badge tone="violet">{t.network}</Badge>
                    </div>
                    <div className="text-xs text-arena-muted font-mono break-all mt-0.5">{t.txHash}</div>
                    {t.receiptHash && (
                      <div className="text-[10px] text-arena-muted font-mono mt-0.5">
                        receipt: {t.receiptHash.slice(0, 20)}...
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge tone={t.status === "confirmed" ? "green" : "amber"}>{t.status}</Badge>
                    <div className="text-[10px] text-arena-muted mt-1">{mission}</div>
                  </div>
                </div>
              );
            })}
            {txs.length === 0 && <div className="px-5 py-8 text-sm text-arena-muted">No receipt anchors yet.</div>}
          </div>
        </Panel>

        {/* x402 Payments */}
        <Panel>
          <PanelHeader title="x402 Payments" subtitle="Stellar-based payments for external API access" />
          <div className="divide-y divide-arena-border">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <StatusDot tone={p.status === "settled" ? "green" : p.status === "denied" ? "red" : "amber"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-arena-text">{p.service}</div>
                  <div className="text-xs text-arena-muted font-mono">{p.purpose}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-arena-green">{p.amountXlm} XLM</div>
                  <Badge tone={p.status === "settled" ? "green" : "amber"}>{p.status}</Badge>
                  {p.txHash && (
                    <div className="text-[10px] text-arena-muted font-mono mt-0.5 break-all">
                      tx: {p.txHash.slice(0, 16)}...
                    </div>
                  )}
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
