"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApproveButton({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function approve() {
    setBusy(true);
    await fetch(`/api/v1/missions/${missionId}/approve`, { method: "POST" });
    router.refresh();
  }
  return (
    <div className="mt-3 flex gap-2">
      <button onClick={approve} disabled={busy} className="rounded-md bg-arena-green px-4 py-2 text-sm font-medium text-arena-bg disabled:opacity-50">
        {busy ? "Approving…" : "APPROVE PAYMENT"}
      </button>
    </div>
  );
}
