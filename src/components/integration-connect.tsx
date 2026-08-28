"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = ["github", "supabase", "firebase", "railway", "stellar"];

export function IntegrationConnect() {
  const router = useRouter();
  const [type, setType] = useState("github");
  const [busy, setBusy] = useState(false);
  async function connect() {
    setBusy(true);
    await fetch("/api/v1/integrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, name: type[0].toUpperCase() + type.slice(1) }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="flex items-center gap-2">
      <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md bg-arena-bg/60 border border-arena-border px-2 py-1.5 text-xs text-arena-text">
        {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button onClick={connect} disabled={busy} className="rounded-md bg-arena-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
        {busy ? "Connecting…" : "Connect"}
      </button>
    </div>
  );
}
