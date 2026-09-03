import { useEffect, useState } from "react";
import { signRawDigest } from "./wallet";
import type { Balance, FeeSplit } from "./types";

export interface OracleWidgetProps {
  /** Origin of an Oracle-contract backend — apps/oracle-web, or your own implementation of the same routes. No trailing slash. */
  apiBaseUrl: string;
  /** Merged into every fetch call. Use this to attach your own auth (e.g. `{ credentials: "include" }` or a bearer header). */
  fetchOptions?: RequestInit;
  /** Called after a recommendation converts into signed proposals — hook your own analytics/attribution here. */
  onMakeItReal?: (result: { netProposalId: string; feeProposalId: string | null; split: FeeSplit }) => void;
  currency?: string;
}

interface QueuedProposal {
  id: string;
  kind: "net" | "fee";
  status: string;
  signed: boolean;
}

async function api<T>(base: string, path: string, opts: RequestInit, extra?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...extra,
    ...opts,
    headers: { "Content-Type": "application/json", ...extra?.headers, ...opts.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error ?? data));
  return data as T;
}

/**
 * Drop-in widget: shows a real balance, takes a spend amount, and — only
 * on explicit approval — executes it as two real BMONI transactions (the
 * user's transfer, plus Oracle's performance fee). See the package README
 * for the backend contract this expects and the custody caveat on the
 * PIN-encrypted in-browser key (./wallet.ts).
 */
export function OracleWidget({ apiBaseUrl, fetchOptions, onMakeItReal, currency = "CNGN" }: OracleWidgetProps) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [amount, setAmount] = useState(50000);
  const [destAddress, setDestAddress] = useState("");
  const [pin, setPin] = useState("");
  const [queue, setQueue] = useState<QueuedProposal[] | null>(null);
  const [split, setSplit] = useState<FeeSplit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ balances: Balance[] }>(apiBaseUrl, "/api/balances", { method: "GET" }, fetchOptions)
      .then((d) => setBalance(d.balances.find((b) => b.currency === currency) ?? d.balances[0] ?? null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  const activeProposal = queue?.find((p) => !p.signed) ?? null;
  const allSigned = queue !== null && queue.every((p) => p.signed);

  async function createRecommendation() {
    setError(null);
    if (!/^0x[0-9a-fA-F]{40}$/.test(destAddress)) {
      setError("Enter a valid destination address.");
      return;
    }
    setBusy(true);
    try {
      const data = await api<{
        netProposal: { id: string; status: string };
        feeProposal: { id: string; status: string } | null;
        split: FeeSplit;
      }>(
        apiBaseUrl,
        "/api/proposals/recommend",
        { method: "POST", body: JSON.stringify({ toAddress: destAddress, amount, currency }) },
        fetchOptions,
      );
      setSplit(data.split);
      const items: QueuedProposal[] = [{ id: data.netProposal.id, kind: "net", status: data.netProposal.status, signed: false }];
      if (data.feeProposal) items.push({ id: data.feeProposal.id, kind: "fee", status: data.feeProposal.status, signed: false });
      setQueue(items);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function approveAndSignActive() {
    if (!activeProposal) return;
    setError(null);
    setBusy(true);
    try {
      await api(apiBaseUrl, `/api/proposals/${activeProposal.id}/approve`, { method: "POST" }, fetchOptions);
      const payload = await api<{ signingPayloadHash: string }>(
        apiBaseUrl,
        `/api/proposals/${activeProposal.id}/sign-payload`,
        { method: "GET" },
        fetchOptions,
      );
      if (!pin) throw new Error("Enter the wallet PIN to sign.");
      const signature = await signRawDigest(pin, payload.signingPayloadHash);
      const signed = await api<{ proposal: { status: string } }>(
        apiBaseUrl,
        `/api/proposals/${activeProposal.id}/sign`,
        { method: "POST", body: JSON.stringify({ signature }) },
        fetchOptions,
      );
      setQueue((q) => (q ?? []).map((p) => (p.id === activeProposal.id ? { ...p, status: signed.proposal.status, signed: true } : p)));
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (allSigned && queue && split) {
      onMakeItReal?.({
        netProposalId: queue.find((p) => p.kind === "net")!.id,
        feeProposalId: queue.find((p) => p.kind === "fee")?.id ?? null,
        split,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSigned]);

  return (
    <div style={{ fontFamily: "monospace", border: "1px solid #333", borderRadius: 8, padding: 16, maxWidth: 360 }}>
      <p style={{ margin: 0, opacity: 0.6, fontSize: 12 }}>Balance</p>
      <p style={{ margin: "2px 0 12px", fontSize: 20 }}>{balance ? `${balance.balance} ${balance.currency}` : "loading…"}</p>

      {!queue && (
        <>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: "100%", marginBottom: 8, padding: 6 }}
          />
          <input
            placeholder="Destination 0x…"
            value={destAddress}
            onChange={(e) => setDestAddress(e.target.value)}
            style={{ width: "100%", marginBottom: 8, padding: 6 }}
          />
          <button disabled={busy} onClick={createRecommendation} style={{ width: "100%", padding: 8 }}>
            {busy ? "Working…" : "Propose"}
          </button>
        </>
      )}

      {queue && split && (
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          Net: {split.netAmount} · Fee ({split.feeBps / 100}%): {split.feeAmount}
        </p>
      )}

      {activeProposal && (
        <>
          <p style={{ fontSize: 12 }}>
            [{activeProposal.kind}] {activeProposal.status}
          </p>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ width: "100%", marginBottom: 8, padding: 6 }}
          />
          <button disabled={busy} onClick={approveAndSignActive} style={{ width: "100%", padding: 8 }}>
            {busy ? "Working…" : `Approve & sign [${activeProposal.kind}]`}
          </button>
        </>
      )}

      {allSigned && <p style={{ fontSize: 12, color: "#4FA98C" }}>Both proposals signed.</p>}
      {error && <p style={{ fontSize: 12, color: "#C9594A" }}>{error}</p>}
    </div>
  );
}
