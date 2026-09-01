"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("dev@arena.os");
  const [password, setPassword] = useState("arena-dev");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/command-center");
      router.refresh();
    } else {
      setError("Invalid credentials");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-arena-bg px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-arena-inset border border-arena-border flex items-center justify-center">
              <span className="text-arena-green font-mono text-lg font-bold">
                A
              </span>
            </div>
          </div>
          <h1 className="font-mono text-[13px] font-semibold tracking-[0.2em] uppercase">
            <span className="text-arena-text">ARENA</span>{" "}
            <span className="text-arena-green">OS</span>
          </h1>
          <p className="font-mono text-[10px] text-arena-muted mt-1 tracking-[0.1em] uppercase">
            AI Agent Mission Control
          </p>
        </div>

        {/* Login form */}
        <form
          onSubmit={submit}
          className="bg-arena-panel border border-arena-border rounded-lg p-6 space-y-4"
        >
          <div className="space-y-2">
            <label className="arena-label text-[9px]">EMAIL</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-arena-inset border border-arena-border rounded-md px-3 py-2 text-[12px] font-mono text-arena-text focus:outline-none focus:border-arena-green/40 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="arena-label text-[9px]">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-arena-inset border border-arena-border rounded-md px-3 py-2 text-[12px] font-mono text-arena-text focus:outline-none focus:border-arena-green/40 transition-colors"
            />
          </div>

          {error && (
            <div className="font-mono text-[10px] text-arena-red">{error}</div>
          )}

          <button
            disabled={busy}
            className="w-full rounded-md bg-arena-green/15 text-arena-green border border-arena-green/30 px-4 py-2.5 font-mono text-[11px] font-medium hover:bg-arena-green/25 disabled:opacity-40 transition-colors"
          >
            {busy ? "AUTHENTICATING…" : "▶ ENTER WORKSPACE"}
          </button>

          <p className="font-mono text-[9px] text-arena-muted text-center">
            demo: dev@arena.os / arena-dev
          </p>
        </form>
      </div>
    </div>
  );
}
