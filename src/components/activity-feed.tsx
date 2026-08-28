"use client";

import { useEffect, useState } from "react";
import { StatusDot } from "@/components/ui";

interface Item {
  id: string;
  at: string;
  kind: string;
  actor: string;
  action: string;
  missionId?: string;
}

const ACTOR_TONE: Record<string, "blue" | "green" | "amber" | "red" | "violet" | "cyan" | "muted"> = {
  commander: "violet",
  research: "blue",
  code: "blue",
  qa: "cyan",
  deployment: "amber",
  stellar: "green",
  user: "muted",
  system: "muted",
};

export function ActivityFeed({ mission }: { mission?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const qs = mission ? `?mission=${mission}` : "";
      const res = await fetch(`/api/v1/activity${qs}`);
      const data = await res.json();
      if (active) {
        setItems(data.activity ?? []);
        setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [mission]);

  if (loading) return <div className="px-4 py-6 text-sm text-arena-muted">Loading activity…</div>;

  return (
    <div className="max-h-80 overflow-y-auto divide-y divide-arena-border">
      {items.map((i) => (
        <div key={i.id} className="flex items-center gap-3 px-3 py-2 text-sm">
          <StatusDot tone={ACTOR_TONE[i.actor] ?? "muted"} />
          <span className="text-xs text-arena-muted font-mono w-16 shrink-0">{fmtTime(i.at)}</span>
          <span className="text-arena-text">{i.action}</span>
          <span className="ml-auto text-xs text-arena-muted font-mono">{i.actor}</span>
        </div>
      ))}
      {items.length === 0 && <div className="px-4 py-6 text-sm text-arena-muted">No activity yet.</div>}
    </div>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
