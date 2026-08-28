// Canonical receipt hashing (spec §28). The full mission is never stored
// on-chain; only a verifiable digest is anchored.
import { sha256Hex as nodeSha256 } from "@core/crypto";

export async function sha256Hex(input: string): Promise<string> {
  return nodeSha256(input);
}

// Build a stable canonical digest of a mission for anchoring.
export function canonicalMissionDigest(m: {
  id: string;
  title: string;
  filesChanged: number;
  testsPassed: number;
  testsFailed: number;
  costUsd: number;
  paymentsXlm: number;
}): string {
  const canonical = JSON.stringify({
    id: m.id,
    title: m.title,
    filesChanged: m.filesChanged,
    testsPassed: m.testsPassed,
    testsFailed: m.testsFailed,
    costUsd: m.costUsd,
    paymentsXlm: m.paymentsXlm,
  });
  return canonical;
}
