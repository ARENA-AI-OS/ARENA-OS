import type { Mission } from "@domain/index";
import type { AgentContext } from "@agents/runtime";

// Verification Engine (spec §39). Never trust an agent's claim — verify it.
export interface VerificationCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export async function verify(mission: Mission, _ctx: AgentContext): Promise<{ status: "verified" | "failed"; checks: VerificationCheck[] }> {
  const checks: VerificationCheck[] = [];

  const testsOk = mission.testsFailed === 0 && mission.testsPassed > 0;
  checks.push({ name: "Test suite", pass: testsOk, detail: `${mission.testsPassed} passed / ${mission.testsFailed} failed` });

  let deployOk = false;
  let deployDetail = "no deployment url";
  if (mission.deploymentUrl) {
    try {
      const res = await fetch(mission.deploymentUrl, { method: "HEAD" });
      deployOk = res.ok;
      deployDetail = `HTTP ${res.status}`;
    } catch {
      deployOk = false;
      deployDetail = "unreachable (offline sandbox)";
    }
  }
  // In an offline sandbox an unreachable preview is not a hard failure.
  checks.push({ name: "Deployment health", pass: deployOk || !mission.deploymentUrl, detail: deployDetail });

  const receiptOk = !!mission.receiptHash;
  checks.push({ name: "Stellar receipt", pass: receiptOk, detail: receiptOk ? mission.receiptHash! : "missing" });

  const status: "verified" | "failed" = checks.every((c) => c.pass) ? "verified" : "failed";
  return { status, checks };
}
