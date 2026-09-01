import type { ReactNode } from "react";

/* ─── Panel ─── */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-arena-panel border border-arena-border rounded-lg ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Panel Header ─── */
export function PanelHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-arena-border px-4 py-3">
      <div>
        <h2 className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase text-arena-muted">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-arena-secondary mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

/* ─── Badge / Status Pill ─── */
export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?:
    | "default"
    | "green"
    | "red"
    | "amber"
    | "muted"
    | "blue"
    | "violet"
    | "cyan";
}) {
  const tones: Record<string, string> = {
    default: "bg-white/5 text-arena-muted",
    muted: "bg-white/5 text-arena-muted",
    blue: "bg-blue-500/15 text-blue-400",
    green: "bg-arena-green/10 text-arena-green",
    amber: "bg-yellow-500/15 text-yellow-400",
    red: "bg-arena-red/15 text-arena-red",
    violet: "bg-purple-500/15 text-purple-400",
    cyan: "bg-cyan-500/15 text-cyan-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ─── Status Dot ─── */
export function StatusDot({
  tone = "green",
  pulse = false,
}: {
  tone?: "green" | "red" | "amber" | "muted" | "blue";
  pulse?: boolean;
}) {
  const map: Record<string, string> = {
    green: "bg-arena-green",
    red: "bg-arena-red",
    amber: "bg-yellow-400",
    muted: "bg-arena-muted",
    blue: "bg-blue-400",
  };
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${map[tone]} ${pulse ? "animate-pulse" : ""}`}
    />
  );
}

/* ─── Metric Card ─── */
export function MetricCard({
  label,
  value,
  sub,
  tone = "default",
  sparkline,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "default" | "green" | "red" | "amber";
  sparkline?: ReactNode;
}) {
  const toneColor: Record<string, string> = {
    default: "text-arena-text",
    green: "text-arena-green",
    red: "text-arena-red",
    amber: "text-yellow-400",
  };
  return (
    <div className="bg-arena-panel border border-arena-border rounded-lg px-4 py-3 flex flex-col justify-between">
      <div className="arena-label mb-1">{label}</div>
      <div className="flex items-end justify-between">
        <div className={`font-mono text-xl font-semibold ${toneColor[tone]}`}>
          {value}
        </div>
        {sparkline && <div className="opacity-50">{sparkline}</div>}
      </div>
      {sub && (
        <div className="font-mono text-[10px] text-arena-muted mt-1">
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─── Stat (legacy compat) ─── */
export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: string;
}) {
  return <MetricCard label={label} value={value} sub={sub} tone={tone as "default"} />;
}

/* ─── Status tone map ─── */
export const STATUS_TONE: Record<
  string,
  "green" | "red" | "amber" | "muted" | "blue"
> = {
  planning: "blue",
  research: "blue",
  coding: "green",
  testing: "amber",
  deployment: "amber",
  verification: "blue",
  awaiting_approval: "amber",
  completed: "green",
  verified: "green",
  failed: "red",
};

/* ─── Page Header ─── */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between px-6 pt-6 pb-4 border-b border-arena-border">
      <div>
        <h1 className="font-mono text-[10px] font-medium tracking-[0.1em] uppercase text-arena-muted">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-arena-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

/* ─── Button ─── */
export function Button({
  children,
  variant = "primary",
  size = "sm",
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "xs" | "sm" | "md";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-arena-green/15 text-arena-green border border-arena-green/30 hover:bg-arena-green/25",
    secondary:
      "bg-white/5 text-arena-secondary border border-arena-border hover:bg-white/10 hover:text-arena-text",
    danger:
      "bg-arena-red/15 text-arena-red border border-arena-red/30 hover:bg-arena-red/25",
    ghost:
      "bg-transparent text-arena-muted border border-transparent hover:bg-white/5 hover:text-arena-text",
  };
  const sizes: Record<string, string> = {
    xs: "px-2 py-1 text-[10px]",
    sm: "px-3 py-1.5 text-[11px]",
    md: "px-4 py-2 text-xs",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-mono font-medium rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ─── Input ─── */
export function Input({
  placeholder,
  value,
  onChange,
  className = "",
  mono = false,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
  mono?: boolean;
}) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full bg-arena-inset border border-arena-border rounded-md px-3 py-2 text-xs text-arena-text placeholder:text-arena-muted/50 focus:outline-none focus:border-arena-green/40 transition-colors ${mono ? "font-mono" : ""} ${className}`}
    />
  );
}

/* ─── Select ─── */
export function Select({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-arena-inset border border-arena-border rounded-md px-3 py-2 text-xs text-arena-text focus:outline-none focus:border-arena-green/40 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
