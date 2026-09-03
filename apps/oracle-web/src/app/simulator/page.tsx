"use client";

import { useEffect, useMemo, useState } from "react";
import { signRawDigest } from "@/lib/wallet-client";

interface Balance {
  smartWalletId: string;
  currency: string;
  balance: string;
  error: string | null;
}

interface BmoniTransaction {
  amount: string;
  currency: string;
  createdAt: string;
  direction?: string;
}

type Action = "nothing" | "spend" | "save";

const DAYS = 90;
const BRANCH_COLOR: Record<Action, string> = {
  nothing: "var(--color-present)",
  save: "var(--color-healthy-future)",
  spend: "var(--color-risk)",
};
const BRANCH_LABEL: Record<Action, string> = {
  nothing: "Do nothing",
  save: "Save it",
  spend: "Spend it",
};

function projectBalance(
  startBalance: number,
  dailyBurn: number,
  action: Action,
  decisionAmount: number,
  day: number,
): number {
  let balance = startBalance;
  if (action === "spend") balance -= decisionAmount; // one-time hit at day 0
  if (action === "save") balance += 0; // saved amount stays put; burn still applies below
  const effectiveDailyBurn = action === "save" ? dailyBurn * 0.7 : dailyBurn; // saving assumes trimmed spend
  return balance - effectiveDailyBurn * day;
}

function runwayDays(startBalance: number, dailyBurn: number): number {
  if (dailyBurn <= 0) return Infinity;
  return Math.max(0, Math.floor(startBalance / dailyBurn));
}

function riskLevel(runway: number): { label: string; color: string } {
  if (runway > 60) return { label: "low risk", color: "var(--color-healthy-future)" };
  if (runway > 20) return { label: "moderate risk", color: "var(--color-present)" };
  return { label: "high risk", color: "var(--color-risk)" };
}

export default function SimulatorPage() {
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [balanceSource, setBalanceSource] = useState<"real" | "unloaded">("unloaded");
  const [transactions, setTransactions] = useState<BmoniTransaction[]>([]);
  const [hasSession, setHasSession] = useState(false);
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);

  const [decisionAmount, setDecisionAmount] = useState(180000);
  const [day, setDay] = useState(30);
  const [stressIncomeDown, setStressIncomeDown] = useState(false);
  const [stressUnexpectedExpense, setStressUnexpectedExpense] = useState(false);
  const [stressRentUp, setStressRentUp] = useState(false);
  const [blackSwan, setBlackSwan] = useState(false);
  const [manualBurnEstimate, setManualBurnEstimate] = useState(60000);

  // "Make it real" flow state
  const [destAddress, setDestAddress] = useState("");
  const [pin, setPin] = useState("");
  interface QueuedProposal {
    id: string;
    kind: "net" | "fee";
    amount: string;
    status: string;
    signed: boolean;
  }
  const [queue, setQueue] = useState<QueuedProposal[] | null>(null);
  const [feeSplit, setFeeSplit] = useState<{ grossAmount: number; feeAmount: number; netAmount: number; feeBps: number } | null>(null);
  const [txBusy, setTxBusy] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txLog, setTxLog] = useState<string[]>([]);

  const pushTxLog = (m: string) => setTxLog((l) => [...l.slice(-9), m]);

  useEffect(() => {
    fetch("/api/onboard/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.session?.smartWalletAddress) {
          setHasSession(true);
          setSmartWalletAddress(d.session.smartWalletAddress);
        }
      });
    fetch("/api/balances")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.balances) {
          setBalances(d.balances);
          setBalanceSource("real");
        }
      })
      .catch(() => {});
    fetch("/api/transactions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTransactions(d?.transactions ?? []))
      .catch(() => {});
  }, []);

  const realBalance = useMemo(() => {
    const ngn = balances?.find((b) => b.currency === "NGN" || b.currency === "CNGN");
    return ngn ? Number(ngn.balance) : null;
  }, [balances]);

  const realDailyBurn = useMemo(() => {
    if (transactions.length === 0) return null;
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recent = transactions.filter((t) => new Date(t.createdAt).getTime() >= thirtyDaysAgo);
    if (recent.length === 0) return null;
    const total = recent.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    return total / 30;
  }, [transactions]);

  const startBalance = realBalance ?? 0;
  let dailyBurn = (realDailyBurn ?? manualBurnEstimate / 30);
  if (stressIncomeDown) dailyBurn *= 1.3;
  if (stressRentUp) dailyBurn *= 1.2;

  const shockAmount = stressUnexpectedExpense ? 70000 : 0;
  const shockDay = 15;
  const blackSwanDay = 45;
  const blackSwanHit = blackSwan ? startBalance * 0.4 : 0;

  function balanceAt(action: Action, d: number): number {
    let bal = projectBalance(startBalance, dailyBurn, action, decisionAmount, d);
    if (stressUnexpectedExpense && d >= shockDay) bal -= shockAmount;
    if (blackSwan && d >= blackSwanDay) bal -= blackSwanHit;
    return bal;
  }

  const branches = useMemo<Action[]>(() => ["nothing", "save", "spend"], []);
  const series = branches.map((action) => ({
    action,
    points: Array.from({ length: DAYS + 1 }, (_, d) => balanceAt(action, d)),
  }));

  const maxAbs = Math.max(1, ...series.flatMap((s) => s.points.map((p) => Math.abs(p))));

  function pathFor(points: number[]): string {
    const w = 600;
    const h = 200;
    const midY = h / 2;
    return points
      .map((p, i) => {
        const x = (i / DAYS) * w;
        const y = midY - (p / maxAbs) * (midY - 10);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const recommendation = useMemo(() => {
    const runways = branches.map((a) => ({
      action: a,
      runway: runwayDays(startBalance, a === "save" ? dailyBurn * 0.7 : dailyBurn),
    }));
    const spendRunway = runways.find((r) => r.action === "spend")!.runway;
    if (spendRunway < 20) return "save" as Action;
    return "nothing" as Action;
  }, [startBalance, dailyBurn, branches]);

  // --- "Make it real" flow: monetized via src/lib/fees.ts — see README's
  // "Oracle Embed" section for the pitch. Creates TWO real proposals (net
  // + fee) through /api/proposals/recommend, then walks the user through
  // approve+sign for each in turn, one PIN entry covering both.

  async function createRecommendation() {
    setTxError(null);
    if (!/^0x[0-9a-fA-F]{40}$/.test(destAddress)) {
      setTxError("Enter a valid 0x… destination address.");
      return;
    }
    setTxBusy(true);
    try {
      const res = await fetch("/api/proposals/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAddress: destAddress,
          amount: decisionAmount,
          currency: "CNGN",
          description: "Oracle simulator — spend decision",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      setFeeSplit(data.split);
      const items: QueuedProposal[] = [
        { id: data.netProposal.id, kind: "net", amount: data.netProposal.amount, status: data.netProposal.status, signed: false },
      ];
      if (data.feeProposal) {
        items.push({ id: data.feeProposal.id, kind: "fee", amount: data.feeProposal.amount, status: data.feeProposal.status, signed: false });
      }
      setQueue(items);
      pushTxLog(`Created ${items.length} proposal(s): net ₦${data.split.netAmount.toLocaleString()}, fee ₦${data.split.feeAmount.toLocaleString()} (${data.split.feeBps / 100}%)`);
    } catch (e) {
      setTxError(String((e as Error).message));
    } finally {
      setTxBusy(false);
    }
  }

  const activeProposal = queue?.find((p) => !p.signed) ?? null;
  const allSigned = queue !== null && queue.every((p) => p.signed);

  async function approveAndSignActive() {
    if (!activeProposal) return;
    setTxError(null);
    setTxBusy(true);
    try {
      const approveRes = await fetch(`/api/proposals/${activeProposal.id}/approve`, { method: "POST" });
      const approveData = await approveRes.json();
      if (!approveRes.ok) throw new Error(JSON.stringify(approveData.error ?? approveData));
      pushTxLog(`[${activeProposal.kind}] approved. currentApprovals=${approveData.proposal.currentApprovals}`);

      const payloadRes = await fetch(`/api/proposals/${activeProposal.id}/sign-payload`);
      const payload = await payloadRes.json();
      if (!payloadRes.ok) throw new Error(JSON.stringify(payload.error ?? payload));

      if (!pin) throw new Error("Enter your wallet PIN to sign.");
      const signature = await signRawDigest(pin, payload.signingPayloadHash);
      pushTxLog(`[${activeProposal.kind}] signed raw digest client-side (no EIP-191 prefix).`);

      const signRes = await fetch(`/api/proposals/${activeProposal.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(JSON.stringify(signData.error ?? signData));
      pushTxLog(`[${activeProposal.kind}] submitted. status=${signData.proposal.status}`);

      setQueue((q) =>
        (q ?? []).map((p) => (p.id === activeProposal.id ? { ...p, status: signData.proposal.status, signed: true } : p)),
      );

      // Signature acceptance is not completion: live testing showed status
      // can stay PENDING_* even after both approval and signature are
      // recorded, settling asynchronously. Poll instead of assuming
      // COMPLETED from the /sign response.
      await pollProposalStatus(activeProposal.id, activeProposal.kind);
    } catch (e) {
      setTxError(String((e as Error).message));
    } finally {
      setTxBusy(false);
    }
  }

  async function pollProposalStatus(id: string, kind: "net" | "fee") {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/proposals/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
        pushTxLog(`[${kind}] polled status: ${data.proposal.status}`);
        setQueue((q) => (q ?? []).map((p) => (p.id === id ? { ...p, status: data.proposal.status } : p)));
        if (data.proposal.status === "COMPLETED" || data.proposal.status === "FAILED" || data.proposal.status === "REJECTED") {
          return;
        }
      } catch (e) {
        pushTxLog(`[${kind}] poll error: ${String((e as Error).message)}`);
        return;
      }
    }
    pushTxLog(`[${kind}] still pending after 10 polls — check back later or inspect the proposal directly.`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-16 text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20px 30px, white, transparent), radial-gradient(1px 1px at 120px 90px, white, transparent), radial-gradient(1px 1px at 220px 40px, white, transparent), radial-gradient(1px 1px at 340px 160px, white, transparent), radial-gradient(1px 1px at 60px 200px, white, transparent)",
          backgroundSize: "400px 220px",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-oracle text-4xl italic">Oracle</h1>
          <span className={balanceSource === "real" ? "badge-real" : "badge-mock"}>
            {balanceSource === "real" ? "Live BMONI balance" : "No wallet session — loading…"}
          </span>
        </div>

        {!hasSession && (
          <div className="mb-8 rounded border border-present/40 bg-present/5 p-4 font-mono text-sm text-present">
            No onboarded wallet in this session. <a className="underline" href="/onboard">Onboard first</a> to see
            a real balance here instead of ₦0.
          </div>
        )}

        <div className="mb-10 grid grid-cols-3 gap-4 font-mono text-sm">
          <div>
            <p className="text-white/50">Balance</p>
            <p className="text-2xl text-present">
              ₦{startBalance.toLocaleString()} {balanceSource !== "real" && <span className="text-xs text-risk">(0 — no session)</span>}
            </p>
          </div>
          <div>
            <p className="text-white/50">Monthly burn</p>
            {realDailyBurn ? (
              <p className="text-2xl">₦{Math.round(realDailyBurn * 30).toLocaleString()} <span className="badge-real ml-1 align-middle">real, from tx history</span></p>
            ) : (
              <div>
                <input
                  type="number"
                  value={manualBurnEstimate}
                  onChange={(e) => setManualBurnEstimate(Number(e.target.value))}
                  className="w-32 rounded border border-white/20 bg-transparent px-2 py-1"
                />
                <span className="badge-mock ml-1 align-middle">your estimate — no tx history yet</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-white/50">Oracle recommends</p>
            <p className="text-2xl" style={{ color: BRANCH_COLOR[recommendation] }}>
              {BRANCH_LABEL[recommendation]}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-oracle text-lg italic">
            What if you spent ₦{decisionAmount.toLocaleString()}?
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(400000, startBalance)}
            step={5000}
            value={decisionAmount}
            onChange={(e) => setDecisionAmount(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <svg viewBox="0 0 600 200" className="mb-4 w-full rounded border border-white/10 bg-black/20">
          {series.map((s) => (
            <path key={s.action} d={pathFor(s.points)} fill="none" stroke={BRANCH_COLOR[s.action]} strokeWidth={2} />
          ))}
          <line
            x1={(day / DAYS) * 600}
            y1={0}
            x2={(day / DAYS) * 600}
            y2={200}
            stroke="white"
            strokeOpacity={0.3}
            strokeDasharray="4 4"
          />
        </svg>

        <div className="mb-8">
          <label className="mb-2 block font-mono text-xs text-white/50">Day {day} of 90</label>
          <input
            type="range"
            min={0}
            max={DAYS}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-10 grid grid-cols-3 gap-4">
          {branches.map((action) => {
            const bal = balanceAt(action, day);
            const rw = runwayDays(startBalance, action === "save" ? dailyBurn * 0.7 : dailyBurn);
            const risk = riskLevel(rw);
            return (
              <div key={action} className="rounded border border-white/10 p-4">
                <p className="font-mono text-xs uppercase tracking-wider" style={{ color: BRANCH_COLOR[action] }}>
                  {BRANCH_LABEL[action]}
                </p>
                <p className="mt-1 text-xl font-mono">₦{Math.round(bal).toLocaleString()}</p>
                <p className="mt-1 font-mono text-xs text-white/50">
                  Runway: {rw === Infinity ? "∞" : `${rw}d`}
                </p>
                <p className="font-mono text-xs" style={{ color: risk.color }}>
                  {risk.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mb-10 flex flex-wrap gap-3 font-mono text-xs">
          <button
            onClick={() => setStressIncomeDown((v) => !v)}
            className={`rounded border px-3 py-1.5 ${stressIncomeDown ? "border-risk bg-risk/20 text-risk" : "border-white/20 text-white/60"}`}
          >
            Income −30%
          </button>
          <button
            onClick={() => setStressUnexpectedExpense((v) => !v)}
            className={`rounded border px-3 py-1.5 ${stressUnexpectedExpense ? "border-risk bg-risk/20 text-risk" : "border-white/20 text-white/60"}`}
          >
            Unexpected ₦70,000 expense (day {shockDay})
          </button>
          <button
            onClick={() => setStressRentUp((v) => !v)}
            className={`rounded border px-3 py-1.5 ${stressRentUp ? "border-risk bg-risk/20 text-risk" : "border-white/20 text-white/60"}`}
          >
            Rent +20%
          </button>
          <button
            onClick={() => setBlackSwan((v) => !v)}
            className={`rounded border px-3 py-1.5 ${blackSwan ? "border-risk bg-risk/40 text-risk" : "border-white/20 text-white/60"}`}
          >
            🦢 Black Swan (day {blackSwanDay}, −40% shock)
          </button>
        </div>

        <div className="rounded border border-present/30 bg-black/30 p-6">
          <h2 className="mb-1 font-oracle text-2xl italic">Make it real</h2>
          <p className="mb-4 font-mono text-xs text-white/50">
            Executes the &quot;spend ₦{decisionAmount.toLocaleString()}&quot; branch as two real
            signed BMONI transactions — your net transfer, and Oracle&apos;s performance fee
            (charged only here, only now — nothing is charged for advice you don&apos;t act on).
            Nothing executes without your explicit approval on each.
          </p>

          {!smartWalletAddress && (
            <p className="badge-missing">No smart wallet — onboard first.</p>
          )}

          {smartWalletAddress && !queue && (
            <div className="space-y-3">
              <input
                placeholder="Destination address (0x…)"
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
                className="w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
              />
              <button
                disabled={txBusy}
                onClick={createRecommendation}
                className="rounded bg-present px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
              >
                {txBusy ? "Creating…" : `Propose: send ₦${decisionAmount.toLocaleString()}`}
              </button>
            </div>
          )}

          {queue && feeSplit && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded border border-white/10 p-3 font-mono text-xs">
              <div>
                <p className="text-white/40">To recipient</p>
                <p className="text-present">₦{feeSplit.netAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/40">Oracle fee ({feeSplit.feeBps / 100}%)</p>
                <p className="text-risk">₦{feeSplit.feeAmount.toLocaleString()}</p>
              </div>
            </div>
          )}

          {activeProposal && (
            <div className="space-y-3">
              <p className="font-mono text-sm">
                [{activeProposal.kind}] Proposal <span className="text-present">{activeProposal.id}</span> — ₦
                {activeProposal.amount} — status <span className="text-present">{activeProposal.status}</span>
              </p>
              <input
                type="password"
                placeholder="Wallet PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
              />
              <button
                disabled={txBusy}
                onClick={approveAndSignActive}
                className="rounded bg-healthy-future px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
              >
                {txBusy ? "Working…" : `Approve & sign [${activeProposal.kind}]`}
              </button>
            </div>
          )}

          {allSigned && (
            <div className="space-y-2">
              <p className="font-mono text-sm text-healthy-future">
                Both proposals signed and submitted. Settlement is asynchronous — refresh the
                balance above once BMONI executes them on-chain.
              </p>
              {queue!.map((p) => (
                <p key={p.id} className="font-mono text-xs text-white/50">
                  [{p.kind}] {p.id} — {p.status}
                </p>
              ))}
              <button
                disabled={txBusy}
                onClick={() => queue!.forEach((p) => pollProposalStatus(p.id, p.kind))}
                className="rounded border border-white/30 px-3 py-1.5 font-mono text-xs text-white disabled:opacity-40"
              >
                Check status again
              </button>
            </div>
          )}

          {txError && <p className="mt-3 font-mono text-xs text-risk">{txError}</p>}

          <ul className="mt-4 space-y-1 font-mono text-[11px] text-white/40">
            {txLog.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
