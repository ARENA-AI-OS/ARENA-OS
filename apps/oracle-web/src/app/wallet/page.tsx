"use client";

import { useEffect, useState } from "react";
import { signRawDigest } from "@/lib/wallet-client";

interface Balance {
  smartWalletId: string;
  currency: string;
  balance: string;
  error: string | null;
}

interface DepositAccount {
  id: string;
  accountName: string;
  bankName: string;
  currency: string;
  accountNumber: string;
  bankCode: string;
  depositMessage?: string;
}

interface Bank {
  bankName: string;
  bankCode: string;
}

interface Tx {
  amount: string;
  currency: string;
  createdAt: string;
  direction?: string;
}

type Tab = "deposit" | "withdraw" | "history";

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>("deposit");
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [depositAccounts, setDepositAccounts] = useState<DepositAccount[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);

  // withdraw flow state
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [verified, setVerified] = useState<{ accountName: string; bankName: string } | null>(null);
  const [withdrawalAccountId, setWithdrawalAccountId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState(10000);
  const [proposal, setProposal] = useState<{ id: string; status: string } | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/balances")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBalances(d?.balances ?? null))
      .catch(() => {});
    fetch("/api/wallet/deposit-account")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDepositAccounts(d?.accounts ?? []))
      .catch(() => {});
    fetch("/api/transactions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTransactions(d?.transactions ?? []))
      .catch(() => {});
    fetch("/api/wallet/banks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBanks(d?.banks ?? []))
      .catch(() => {});
  }, []);

  async function verifyAccount() {
    setError(null);
    setVerified(null);
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, bankCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      setVerified({ accountName: data.accountName, bankName: data.bankName });
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function registerWithdrawalAccount() {
    if (!verified) return;
    setError(null);
    setBusy(true);
    try {
      const bank = banks.find((b) => b.bankCode === bankCode);
      const res = await fetch("/api/wallet/withdrawal-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber,
          bankCode,
          bankName: bank?.bankName ?? verified.bankName,
          accountHolderName: verified.accountName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      setWithdrawalAccountId(data.id);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function createWithdrawal() {
    if (!withdrawalAccountId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankAccountId: withdrawalAccountId, amount: withdrawAmount.toFixed(2) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      setProposal({ id: data.data.proposalId, status: data.data.status });
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function approveAndSign() {
    if (!proposal) return;
    setError(null);
    setBusy(true);
    try {
      await fetch(`/api/proposals/${proposal.id}/approve`, { method: "POST" });
      const payloadRes = await fetch(`/api/proposals/${proposal.id}/sign-payload`);
      const payload = await payloadRes.json();
      if (!payloadRes.ok) throw new Error(JSON.stringify(payload.error ?? payload));
      if (!pin) throw new Error("Enter your wallet PIN to sign.");
      const signature = await signRawDigest(pin, payload.signingPayloadHash);
      const signRes = await fetch(`/api/proposals/${proposal.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(JSON.stringify(signData.error ?? signData));
      setProposal({ id: proposal.id, status: signData.proposal.status });
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const ngnBalance = balances?.find((b) => b.currency === "NGN" || b.currency === "CNGN");

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-oracle text-3xl">Wallet</h1>
        <span className="badge-real">Live BMONI sandbox</span>
      </div>

      <div className="mb-8">
        <p className="text-white/50 font-mono text-xs">Balance</p>
        <p className="text-3xl font-mono text-present">
          {ngnBalance ? `₦${Number(ngnBalance.balance).toLocaleString()}` : "—"}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded border border-risk/50 bg-risk/10 p-3 font-mono text-sm text-risk">{error}</div>
      )}

      <div className="mb-6 flex gap-2 font-mono text-xs">
        {(["deposit", "withdraw", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1.5 ${tab === t ? "bg-present text-base" : "border border-white/20 text-white/60"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "deposit" && (
        <section className="space-y-4">
          {depositAccounts.length === 0 && <p className="font-mono text-sm text-white/50">No deposit account yet.</p>}
          {depositAccounts.map((acc) => (
            <div key={acc.id} className="rounded border border-white/10 p-4 font-mono text-sm">
              <p className="text-white/50 text-xs">Bank</p>
              <p>{acc.bankName}</p>
              <p className="mt-2 text-white/50 text-xs">Account number</p>
              <p>{acc.accountNumber}</p>
              <p className="mt-2 text-white/50 text-xs">Account name</p>
              <p>{acc.accountName}</p>
              {acc.depositMessage && (
                <>
                  <p className="mt-2 text-risk text-xs">
                    Shared account — include this exact reference on your transfer, or the deposit can&apos;t be matched to your wallet:
                  </p>
                  <p className="text-risk">{acc.depositMessage}</p>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      {tab === "withdraw" && (
        <section className="space-y-4">
          {!withdrawalAccountId && (
            <>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full rounded border border-white/20 bg-base px-3 py-2 font-mono text-sm"
              >
                <option value="">Select bank…</option>
                {banks.map((b) => (
                  <option key={b.bankCode} value={b.bankCode}>
                    {b.bankName}
                  </option>
                ))}
              </select>
              <input
                placeholder="10-digit NUBAN"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
              />
              <button
                disabled={busy || !bankCode || accountNumber.length !== 10}
                onClick={verifyAccount}
                className="rounded bg-present px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
              >
                Verify account
              </button>
              {verified && (
                <div className="rounded border border-healthy-future/40 p-3 font-mono text-sm">
                  <p>{verified.accountName}</p>
                  <p className="text-white/50 text-xs">{verified.bankName}</p>
                  <button
                    disabled={busy}
                    onClick={registerWithdrawalAccount}
                    className="mt-2 rounded bg-healthy-future px-3 py-1.5 font-mono text-xs text-base"
                  >
                    Save this account
                  </button>
                </div>
              )}
            </>
          )}

          {withdrawalAccountId && !proposal && (
            <>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                className="w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
              />
              <button
                disabled={busy}
                onClick={createWithdrawal}
                className="rounded bg-present px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
              >
                Withdraw ₦{withdrawAmount.toLocaleString()}
              </button>
            </>
          )}

          {proposal && (
            <div className="space-y-3">
              <p className="font-mono text-sm">
                Proposal {proposal.id} — {proposal.status}
              </p>
              <input
                type="password"
                placeholder="Wallet PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full rounded border border-white/20 bg-transparent px-3 py-2 font-mono text-sm"
              />
              <button
                disabled={busy}
                onClick={approveAndSign}
                className="rounded bg-healthy-future px-4 py-2 font-mono text-sm text-base disabled:opacity-40"
              >
                Approve & sign
              </button>
            </div>
          )}
        </section>
      )}

      {tab === "history" && (
        <section className="space-y-2 font-mono text-sm">
          {transactions.length === 0 && <p className="text-white/50">No transactions yet.</p>}
          {transactions.map((t, i) => (
            <div key={i} className="flex justify-between border-b border-white/10 py-2">
              <span>{new Date(t.createdAt).toLocaleString()}</span>
              <span>
                {t.amount} {t.currency}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
