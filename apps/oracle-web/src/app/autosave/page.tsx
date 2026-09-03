"use client";

import { useEffect, useState } from "react";
import { signRawDigest } from "@/lib/wallet-client";

interface Rule {
  rule_type: "percentage" | "roundup";
  param: number;
  destination_address: string;
}

interface Pending {
  id: string;
  proposal_id: string;
  trigger_deposit_amount: string;
  save_amount: string;
  created_at: string;
}

export default function AutoSavePage() {
  const [rule, setRule] = useState<Rule | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [ruleType, setRuleType] = useState<"percentage" | "roundup">("percentage");
  const [param, setParam] = useState(1000); // 10% in bps
  const [destAddress, setDestAddress] = useState("");
  const [simulateAmount, setSimulateAmount] = useState(50000);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const pushLog = (m: string) => setLog((l) => [...l.slice(-9), m]);

  function refresh() {
    fetch("/api/autosave/rule")
      .then((r) => r.json())
      .then((d) => setRule(d.rule));
    fetch("/api/autosave/pending")
      .then((r) => r.json())
      .then((d) => setPending(d.pending ?? []));
  }

  useEffect(refresh, []);

  async function saveRule() {
    setError(null);
    if (!/^0x[0-9a-fA-F]{40}$/.test(destAddress)) {
      setError("Enter a valid destination address.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/autosave/rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleType, param, destinationAddress: destAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      refresh();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function simulateDeposit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/autosave/simulate-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: simulateAmount.toFixed(2) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      if (data.triggered) {
        pushLog(`Simulated deposit ₦${simulateAmount.toLocaleString()} → staged save of ₦${data.saveAmount.toLocaleString()}`);
      } else {
        pushLog(`Simulated deposit — nothing staged (${data.reason})`);
      }
      refresh();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending(item: Pending) {
    setError(null);
    setBusy(true);
    try {
      const payloadRes = await fetch(`/api/proposals/${item.proposal_id}/sign-payload`);
      const payload = await payloadRes.json();
      if (!payloadRes.ok) throw new Error(JSON.stringify(payload.error ?? payload));
      if (!pin) throw new Error("Enter your wallet PIN to sign.");
      const signature = await signRawDigest(pin, payload.signingPayloadHash);
      const signRes = await fetch(`/api/proposals/${item.proposal_id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(JSON.stringify(signData.error ?? signData));
      await fetch(`/api/autosave/confirm/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "signed" }),
      });
      pushLog(`Confirmed ₦${item.save_amount} save. status=${signData.proposal.status}`);
      refresh();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function dismissPending(item: Pending) {
    setBusy(true);
    try {
      await fetch(`/api/autosave/confirm/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-oracle text-3xl">Auto-save</h1>
        <span className="badge-real">Live BMONI sandbox</span>
      </div>

      <div className="mb-8 rounded border border-present/40 bg-present/5 p-3 font-mono text-xs text-present">
        A gap BMONI&apos;s own platform doesn&apos;t fill: no standing/recurring savings
        mechanism. This creates and approves a real transfer proposal automatically the moment a
        deposit lands — you only need to tap Confirm and enter your PIN, not build the transaction
        yourself.
      </div>

      <div className="mb-6 rounded border border-risk/30 p-3 font-mono text-xs text-risk">
        Real automation stops at your signature — see the README. BMONI has no unattended-signing
        primitive that doesn&apos;t mean sharing one operator key across every user&apos;s wallet,
        which we deliberately didn&apos;t build. See autosave.ts.
      </div>

      {error && (
        <div className="mb-6 rounded border border-risk/50 bg-risk/10 p-3 font-mono text-sm text-risk">{error}</div>
      )}

      <section className="mb-10 space-y-4">
        <h2 className="font-oracle text-xl italic">Rule</h2>
        {rule && (
          <p className="font-mono text-xs text-healthy-future">
            Active: {rule.rule_type === "percentage" ? `${rule.param / 100}% of every deposit` : `round up to ₦${rule.param}`} →{" "}
            {rule.destination_address}
          </p>
        )}
        <select
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as "percentage" | "roundup")}
          className="w-full rounded border border-white/20 bg-base px-3 py-2 font-mono text-sm"
        >
          <option value="percentage">Percentage of every deposit</option>
          <option value="roundup">Round up to nearest N</option>
        </select>
        <input
          type="number"
          value={param}
          onChange={(e) => setParam(Number(e.target.value))}
          placeholder={ruleType === "percentage" ? "Basis points (1000 = 10%)" : "Round up to (e.g. 1000)"}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
        />
        <input
          placeholder="Vault destination address (0x…)"
          value={destAddress}
          onChange={(e) => setDestAddress(e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
        />
        <button
          disabled={busy}
          onClick={saveRule}
          className="rounded bg-present px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
        >
          Save rule
        </button>
      </section>

      <section className="mb-10 space-y-3 rounded border border-white/10 p-4">
        <p className="font-mono text-xs text-white/50">
          Test only — see /api/autosave/simulate-deposit&apos;s docstring. Stands in for a real
          BMONI employee.deposit.completed webhook, which needs a public URL this dev server
          doesn&apos;t have.
        </p>
        <input
          type="number"
          value={simulateAmount}
          onChange={(e) => setSimulateAmount(Number(e.target.value))}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
        />
        <button
          disabled={busy || !rule}
          onClick={simulateDeposit}
          className="rounded border border-present px-3 py-1.5 font-mono text-xs text-present disabled:opacity-40"
        >
          Simulate a ₦{simulateAmount.toLocaleString()} deposit
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="font-oracle text-xl italic">Pending confirmations</h2>
        {pending.length === 0 && <p className="font-mono text-sm text-white/50">Nothing waiting.</p>}
        {pending.map((p) => (
          <div key={p.id} className="rounded border border-white/10 p-4">
            <p className="font-mono text-sm">
              ₦{p.save_amount} save from a ₦{p.trigger_deposit_amount} deposit — proposal {p.proposal_id}
            </p>
            <input
              type="password"
              placeholder="Wallet PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="mt-2 w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button
                disabled={busy}
                onClick={() => confirmPending(p)}
                className="rounded bg-healthy-future px-3 py-1.5 font-mono text-xs text-base disabled:opacity-40"
              >
                Confirm & sign
              </button>
              <button
                disabled={busy}
                onClick={() => dismissPending(p)}
                className="rounded border border-white/30 px-3 py-1.5 font-mono text-xs text-white disabled:opacity-40"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-12 border-t border-white/10 pt-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-white/40">Log</p>
        <ul className="space-y-1 font-mono text-xs text-white/50">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
