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
      router.push("/");
      router.refresh();
    } else {
      setError("Invalid credentials");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-arena-grid px-4">
      <form onSubmit={submit} className="glass glow-border rounded-2xl p-8 w-full max-w-sm space-y-5">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            <span className="text-gradient">ARENA</span> OS
          </div>
          <p className="text-sm text-arena-muted mt-1">Personal AI Operating System</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-arena-muted">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md bg-arena-bg/60 border border-arena-border px-3 py-2 text-sm text-arena-text focus:outline-none focus:border-arena-blue/60" />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-arena-muted">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md bg-arena-bg/60 border border-arena-border px-3 py-2 text-sm text-arena-text focus:outline-none focus:border-arena-blue/60" />
        </div>
        {error && <div className="text-sm text-arena-red">{error}</div>}
        <button disabled={busy} className="w-full rounded-md bg-arena-blue px-4 py-2 text-sm font-medium text-white hover:bg-arena-blue/90 disabled:opacity-50">
          {busy ? "Signing in…" : "Enter Workspace"}
        </button>
        <p className="text-[11px] text-arena-muted font-mono">demo: dev@arena.os / arena-dev</p>
      </form>
    </div>
  );
}
