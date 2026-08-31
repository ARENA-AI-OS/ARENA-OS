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
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
        placeholder="Fix issue #42 and deploy a preview…\nSpend up to 1 XLM on an external analysis API…\n\nTip: Cmd/Ctrl+Enter to run"
        className="mt-2 w-full resize-none rounded-lg bg-arena-bg/60 border border-arena-border px-3 py-3 text-sm text-arena-text placeholder:text-arena-muted/60 focus:outline-none focus:border-arena-blue/60 font-mono"
        rows={3}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Project selector - functional */}
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-md bg-arena-bg/60 border border-arena-border px-2 py-1.5 text-xs text-arena-text"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {/* Coming soon: Model routing selector */}
        <button
          disabled
          title="Coming in Prompt 4: AI model routing"
          className="rounded-md bg-arena-bg/30 border border-arena-border/50 px-2 py-1.5 text-xs text-arena-muted/50 cursor-not-allowed"
        >
          Model: Auto ✦
        </button>
        {/* Coming soon: Agent selection */}
        <button
          disabled
          title="Coming in Prompt 4: Agent selection"
          className="rounded-md bg-arena-bg/30 border border-arena-border/50 px-2 py-1.5 text-xs text-arena-muted/50 cursor-not-allowed"
        >
          Agent: Auto ✦
        </button>
        {/* Coming soon: Slash commands */}
        <button
          disabled
          title="Coming in Prompt 4: Slash commands"
          className="rounded-md bg-arena-bg/30 border border-arena-border/50 px-2 py-1.5 text-xs text-arena-muted/50 cursor-not-allowed"
        >
          /commands ✦
        </button>
        <div className="flex-1" />
        <button
          onClick={run}
          disabled={running || !text.trim()}
          className="rounded-md bg-arena-blue px-4 py-2 text-sm font-medium text-white hover:bg-arena-blue/90 disabled:opacity-40 transition-opacity"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running…
            </span>
          ) : "RUN MISSION"}
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-arena-red">{error}</div>}
    </div>
  );
}
