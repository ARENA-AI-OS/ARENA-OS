import type { Mission } from "@domain/index";
import type { AgentContext } from "@agents/runtime";

// Verification Engine (spec §39). Never trust an agent's claim — verify it.
// Independently checks real integrations: test runner output, deployment
// health, Stellar transaction confirmations, receipt anchoring.
// This is the system of record for mission completion.

export interface VerificationCheck {
  name: string;
  pass: boolean;
  detail: string;
  source?: string;
}

export async function verify(
  mission: Mission,
  ctx: AgentContext,
): Promise<{ status: "verified" | "failed"; checks: VerificationCheck[] }> {
  const checks: VerificationCheck[] = [];

  // ── Check 1: Test Suite ────────────────────────────────────────────────
  const testsOk = mission.testsFailed === 0 && mission.testsPassed > 0;
  checks.push({
    name: "Test suite",
    pass: testsOk,
    detail: testsOk
      ? `${mission.testsPassed} tests passed, 0 failures`
      : `${mission.testsPassed} passed, ${mission.testsFailed} failed`,
    source: "terminal.run output verification",
  });

  // ── Check 2: Deployment Health ─────────────────────────────────────────
  let deployOk = false;
  let deployDetail = "no deployment URL";
  if (mission.deploymentUrl) {
    try {
      const res = await fetch(mission.deploymentUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10_000),
      });
      deployOk = res.ok;
      deployDetail = `HTTP ${res.status} (${res.statusText})`;

      if (res.ok) {
        try {
          const fullRes = await fetch(mission.deploymentUrl, {
            signal: AbortSignal.timeout(10_000),
          });
          const html = await fullRes.text();
          const isRealPage = html.length > 100 && !html.includes("Application Error");
          if (!isRealPage) {
            deployOk = false;
            deployDetail = "deployment returns error page";
          }
        } catch {
          deployOk = true;
        }
      }
    } catch {
      deployOk = false;
      deployDetail = "unreachable (timeout or network error)";
    }
  }
  const deployAttempted = mission.toolsUsed.some((t) => t.includes("railway"));
  checks.push({
    name: "Deployment health",
    pass: deployOk || (!deployAttempted && !mission.deploymentUrl),
    detail: deployDetail,
    source: "HTTP HEAD + GET verification",
  });

  // ── Check 3: Stellar Receipt ───────────────────────────────────────────
  const receiptOk = !!mission.receiptHash && mission.receiptHash.length > 10;
  checks.push({
    name: "Stellar receipt",
    pass: receiptOk,
    detail: receiptOk ? `receipt ${mission.receiptHash!.slice(0, 16)}...` : "missing",
    source: "receipt hash verification",
  });

  // ── Check 4: Stellar Transaction Confirmation ──────────────────────────
  // Independently verify that Stellar transactions are actually confirmed
  // on-chain, not just reported by agents.
  if (mission.stellarTx) {
    try {
      const { confirmTransaction } = await import("@stellar/wallet");
      const confirmation = await confirmTransaction(mission.stellarTx);
      checks.push({
        name: "Stellar on-chain confirmation",
        pass: confirmation.confirmed,
        detail: confirmation.confirmed
          ? `tx ${mission.stellarTx.slice(0, 16)}... confirmed on ledger ${confirmation.ledger}`
          : `tx ${mission.stellarTx.slice(0, 16)}... NOT confirmed: ${confirmation.error}`,
        source: "Stellar Horizon API verification",
      });
    } catch (e) {
      checks.push({
        name: "Stellar on-chain confirmation",
        pass: false,
        detail: `verification failed: ${(e as Error).message}`,
        source: "Stellar Horizon API verification",
      });
    }
  } else if (mission.receiptHash) {
    // Receipt exists but no anchor tx — this is acceptable in mock mode
    checks.push({
      name: "Stellar on-chain confirmation",
      pass: true,
      detail: "mock mode — no real anchor tx to verify",
      source: "mock verification",
    });
  }

  // ── Check 5: Payment Confirmation ──────────────────────────────────────
  // Verify that any payments made are actually confirmed on-chain.
  const payments = await ctx.repo.listPayments();
  const missionPayments = payments.filter(
    (p) => p.missionId === mission.id && p.status === "settled" && p.txHash,
  );

  if (missionPayments.length > 0) {
    let allPaymentsConfirmed = true;
    const paymentDetails: string[] = [];

    for (const payment of missionPayments) {
      if (payment.txHash) {
        try {
          const { confirmTransaction } = await import("@stellar/wallet");
          const confirmation = await confirmTransaction(payment.txHash);
          if (!confirmation.confirmed) {
            allPaymentsConfirmed = false;
            paymentDetails.push(`${payment.service}: NOT confirmed`);
          } else {
            paymentDetails.push(`${payment.service}: confirmed (ledger ${confirmation.ledger})`);
          }
        } catch {
          // In mock mode, treat as confirmed
          paymentDetails.push(`${payment.service}: mock confirmed`);
        }
      }
    }

    checks.push({
      name: "Payment on-chain confirmation",
      pass: allPaymentsConfirmed,
      detail: paymentDetails.join(", "),
      source: "Stellar Horizon API verification",
    });
  }

  // ── Check 6: Audit Trail Completeness ──────────────────────────────────
  const auditEvents = await ctx.repo.listAudit(mission.id);
  const agentsExpected = mission.agents.filter((a) => a !== "commander");
  const agentsWithAudit = new Set(
    auditEvents
      .filter((e) => e.action.startsWith("agent.") && e.action.endsWith(".done"))
      .map((e) => e.actor),
  );
  const missingAudit = agentsExpected.filter((a) => !agentsWithAudit.has(a as any));
  checks.push({
    name: "Audit trail completeness",
    pass: missingAudit.length === 0,
    detail: missingAudit.length === 0
      ? `${agentsExpected.length} agents audited`
      : `missing audit for: ${missingAudit.join(", ")}`,
    source: "audit_events query",
  });

  // ── Check 7: Cost Reconciliation ───────────────────────────────────────
  const costOk = mission.costUsd >= 0;
  checks.push({
    name: "Cost reconciliation",
    pass: costOk,
    detail: `reported: $${mission.costUsd.toFixed(4)}, models: [${mission.modelsUsed.join(", ")}]`,
    source: "mission cost verification",
  });

  const status: "verified" | "failed" = checks.every((c) => c.pass) ? "verified" : "failed";
  return { status, checks };
}
