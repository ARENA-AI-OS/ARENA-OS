"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PaymentRequest {
  service: string;
  purpose: string;
  amountXlm: number;
  network: string;
  missionId: string;
  reason: string;
  remainingBudget?: number;
}

interface Props {
  payment: PaymentRequest;
  onApproved?: () => void;
  onDenied?: () => void;
}

export function PaymentApprovalModal({ payment, onApproved, onDenied }: Props) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [denying, setDenying] = useState(false);
  const [result, setResult] = useState<"approved" | "denied" | null>(null);

  async function approve() {
    setApproving(true);
    try {
      const res = await fetch(`/api/v1/missions/${payment.missionId}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        setResult("approved");
        onApproved?.();
        router.refresh();
      }
    } catch {
      // Error handled
    }
    setApproving(false);
  }

  async function deny() {
    setDenying(true);
    try {
      const res = await fetch(`/api/v1/missions/${payment.missionId}/deny`, {
        method: "POST",
      });
      if (res.ok) {
        setResult("denied");
        onDenied?.();
        router.refresh();
      }
    } catch {
      // Error handled
    }
    setDenying(false);
  }

  if (result === "approved") {
    return (
      <div className="rounded-xl border border-arena-green/30 bg-arena-green/5 p-5">
        <div className="text-sm font-semibold text-arena-green mb-2">Payment Approved</div>
        <div className="text-xs text-arena-muted">
          {payment.amountXlm} XLM will be sent to {payment.service}. Mission will resume.
        </div>
      </div>
    );
  }

  if (result === "denied") {
    return (
      <div className="rounded-xl border border-arena-red/30 bg-arena-red/5 p-5">
        <div className="text-sm font-semibold text-arena-red mb-2">Payment Denied</div>
        <div className="text-xs text-arena-muted">
          Payment to {payment.service} was denied. Mission will continue without this API call.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-arena-amber/40 bg-arena-amber/5 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-arena-amber">Payment Approval Required</div>
          <div className="text-xs text-arena-muted mt-1">x402 policy requires approval for this transaction</div>
        </div>
        <div className="rounded-full bg-arena-amber/15 px-3 py-1">
          <span className="text-xs font-mono text-arena-amber">APPROVAL NEEDED</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">Service</div>
          <div className="text-sm text-arena-text font-mono mt-1">{payment.service}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">Amount</div>
          <div className="text-sm text-arena-green font-mono mt-1">{payment.amountXlm} XLM</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">Purpose</div>
          <div className="text-xs text-arena-text mt-1">{payment.purpose}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">Network</div>
          <div className="text-xs text-arena-text font-mono mt-1">{payment.network}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-arena-muted">Mission</div>
          <div className="text-xs text-arena-text font-mono mt-1">{payment.missionId}</div>
        </div>
        {payment.remainingBudget !== undefined && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-arena-muted">Remaining Budget</div>
            <div className="text-xs text-arena-text font-mono mt-1">{payment.remainingBudget} XLM</div>
          </div>
        )}
      </div>

      <div className="text-xs text-arena-muted mb-4 p-3 rounded-lg bg-arena-bg/60 border border-arena-border">
        <span className="text-arena-amber font-medium">Policy reason:</span> {payment.reason}
      </div>

      <div className="flex gap-3">
        <button
          onClick={deny}
          disabled={approving || denying}
          className="flex-1 rounded-md border border-arena-red/40 bg-arena-red/10 px-4 py-2.5 text-sm font-medium text-arena-red hover:bg-arena-red/20 disabled:opacity-50 transition-colors"
        >
          {denying ? "Denying…" : "DENY PAYMENT"}
        </button>
        <button
          onClick={approve}
          disabled={approving || denying}
          className="flex-1 rounded-md bg-arena-green px-4 py-2.5 text-sm font-medium text-arena-bg hover:bg-arena-green/90 disabled:opacity-50 transition-colors"
        >
          {approving ? "Approving…" : "APPROVE & EXECUTE"}
        </button>
      </div>

      <div className="mt-3 text-[10px] text-arena-muted text-center">
        Approving will execute a real Stellar {payment.network} payment of {payment.amountXlm} XLM
      </div>
    </div>
  );
}
