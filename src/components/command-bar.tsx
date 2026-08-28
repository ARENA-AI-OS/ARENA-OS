"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  projects: { id: string; name: string }[];
  providers: { provider: string; label: string; connected: boolean }[];
}

export function CommandBar({ projects, providers }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [modelRole, setModelRole] = useState("auto");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!text.trim() || running) return;
    setRunning(true);
    setError(null);
    // Light intent parsing: if the user mentions spending XLM, enable paid API.
    const spendMatch = text.match(/(\d+(?:\.\d+)?)\s*XLM/i);
    const allowPaidApi = !!spendMatch;
    const budgetXlm = spendMatch ? Number(spendMatch[1]) : 5;
    try {
      const res = await fetch("/api/v1/missions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: text.slice(0, 80),
          description: text,
          projectId: projectId || undefined,
          allowPaidApi,
          budgetXlm,
          paidAmountXlm: allowPaidApi ? Math.min(0.25, budgetXlm) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "mission failed");
      router.push(`/missions/${data.mission.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setRunning(false);
    }
  }

  return (
    <div className="glass rounded-xl glow-border p-4">
      <label className="text-[11px] uppercase tracking-wider text-arena-muted">What do you want Arena to accomplish?</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Fix issue #42 and deploy a preview…  /  Spend up to 1 XLM on an external analysis API…"
        className="mt-2 w-full resize-none rounded-lg bg-arena-bg/60 border border-arena-border px-3 py-3 text-sm text-arena-text placeholder:text-arena-muted/60 focus:outline-none focus:border-arena-blue/60"
        rows={3}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-md bg-arena-bg/60 border border-arena-border px-2 py-1.5 text-xs text-arena-text"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={modelRole}
          onChange={(e) => setModelRole(e.target.value)}
          className="rounded-md bg-arena-bg/60 border border-arena-border px-2 py-1.5 text-xs text-arena-text"
        >
          <option value="auto">Auto model routing</option>
          {providers.map((p) => (
            <option key={p.provider} value={p.provider} disabled={!p.connected}>
              Force: {p.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={run}
          disabled={running}
          className="rounded-md bg-arena-blue px-4 py-2 text-sm font-medium text-white hover:bg-arena-blue/90 disabled:opacity-50"
        >
          {running ? "Running mission…" : "RUN MISSION"}
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-arena-red">{error}</div>}
    </div>
  );
}
