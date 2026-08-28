import type { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-xl ${className}`}>{children}</div>;
}

export function PanelHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-arena-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-arena-text">{title}</h2>
        {subtitle && <p className="text-xs text-arena-muted mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "blue" | "green" | "amber" | "red" | "violet" | "cyan" }) {
  const tones: Record<string, string> = {
    default: "bg-white/5 text-arena-muted",
    blue: "bg-arena-blue/15 text-arena-blue",
    green: "bg-arena-green/15 text-arena-green",
    amber: "bg-arena-amber/15 text-arena-amber",
    red: "bg-arena-red/15 text-arena-red",
    violet: "bg-arena-violet/15 text-arena-violet",
    cyan: "bg-arena-cyan/15 text-arena-cyan",
  };
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono ${tones[tone]}`}>{children}</span>;
}

export function StatusDot({ tone = "blue" }: { tone?: "blue" | "green" | "amber" | "red" | "violet" | "cyan" | "muted" }) {
  const map: Record<string, string> = {
    blue: "bg-arena-blue",
    green: "bg-arena-green",
    amber: "bg-arena-amber",
    red: "bg-arena-red",
    violet: "bg-arena-violet",
    cyan: "bg-arena-cyan",
    muted: "bg-arena-muted",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[tone]} animate-pulseGlow`} />;
}

export function Stat({ label, value, sub, tone = "default" }: { label: string; value: ReactNode; sub?: string; tone?: string }) {
  const toneColor: Record<string, string> = {
    default: "text-arena-text",
    blue: "text-arena-blue",
    green: "text-arena-green",
    amber: "text-arena-amber",
    violet: "text-arena-violet",
    cyan: "text-arena-cyan",
    red: "text-arena-red",
  };
  return (
    <Panel className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-arena-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneColor[tone] || "text-arena-text"}`}>{value}</div>
      {sub && <div className="text-xs text-arena-muted mt-0.5">{sub}</div>}
    </Panel>
  );
}

export const STATUS_TONE: Record<string, "blue" | "green" | "amber" | "red" | "violet" | "cyan" | "muted"> = {
  planning: "violet",
  research: "blue",
  coding: "blue",
  testing: "cyan",
  deployment: "amber",
  verification: "cyan",
  awaiting_approval: "amber",
  completed: "green",
  verified: "green",
  failed: "red",
};

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between px-6 pt-8 pb-5 border-b border-arena-border">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-arena-muted mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
