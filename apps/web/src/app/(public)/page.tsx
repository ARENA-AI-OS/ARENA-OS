import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-arena-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-arena-grid opacity-30" />
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arena-blue/10 border border-arena-blue/20 text-arena-blue text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-arena-blue animate-pulse" />
            v0.1.0 — Active Development
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-gradient">Arena</span>{" "}
            <span className="text-arena-text">OS</span>
          </h1>
          <p className="text-xl md:text-2xl text-arena-muted max-w-2xl mx-auto mb-4">
            One workspace. Every AI. Every tool. One autonomous developer operating system.
          </p>
          <p className="text-sm text-arena-muted/70 max-w-xl mx-auto mb-10">
            Arena OS orchestrates multiple AI models, specialized agents, developer toolchains,
            and a native Stellar/x402 payment layer — all behind a single command center.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg bg-arena-blue text-white font-medium text-sm hover:bg-arena-blue/90 transition-colors"
            >
              Open Command Center →
            </Link>
            <Link
              href="/exhibition"
              className="px-6 py-3 rounded-lg border border-arena-border text-arena-muted hover:text-arena-text hover:bg-white/5 transition-colors text-sm"
            >
              View Exhibition
            </Link>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-xs font-semibold text-arena-muted uppercase tracking-wider mb-8 text-center">What Arena OS Does</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "🧠", title: "Multi-Model AI", desc: "OpenAI, Gemini, Claude — routed by task type with automatic failover. Model-agnostic by design." },
            { icon: "🤖", title: "Autonomous Agents", desc: "Commander, Research, Code, QA, Deployment, Stellar — each with scoped permissions and real tool access." },
            { icon: "🔗", title: "Full Toolchain", desc: "GitHub, Supabase, Firebase, Railway, Render, Vercel — every integration flows through a single audited gateway." },
            { icon: "💳", title: "Stellar/x402 Payments", desc: "Native Web3 micropayments for paid APIs. Policy-enforced spending with on-chain receipts." },
            { icon: "✅", title: "Independent Verification", desc: "Never trusts agent claims. Tests, deployments, and payments are verified independently." },
            { icon: "🔒", title: "Security-First", desc: "Encrypted secrets, capability-based permissions, full audit trail. Nothing leaves the server." },
          ].map((item) => (
            <div key={item.title} className="p-5 rounded-lg bg-arena-panel/50 border border-arena-border hover:border-arena-blue/20 transition-colors">
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="text-sm font-semibold text-arena-text mb-1">{item.title}</h3>
              <p className="text-xs text-arena-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-arena-border">
        <h2 className="text-xs font-semibold text-arena-muted uppercase tracking-wider mb-8 text-center">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0 justify-between">
          {[
            { step: "01", label: "You describe a task", desc: "Natural language in the Command Center" },
            { step: "02", label: "Arena plans it", desc: "Commander breaks it into a task graph" },
            { step: "03", label: "Agents execute", desc: "Each agent uses its scoped tools" },
            { step: "04", label: "Everything is verified", desc: "Independent checks, never agent claims" },
            { step: "05", label: "You stay in control", desc: "Approve deployments, review changes" },
          ].map((item, i) => (
            <div key={item.step} className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 rounded-full bg-arena-blue/10 border border-arena-blue/30 flex items-center justify-center text-arena-blue font-mono text-xs font-bold mb-2">
                {item.step}
              </div>
              <div className="text-sm font-medium text-arena-text mb-0.5">{item.label}</div>
              <div className="text-[11px] text-arena-muted">{item.desc}</div>
              {i < 4 && <div className="hidden md:block w-8 h-px bg-arena-border mt-5 ml-8" />}
            </div>
          ))}
        </div>
      </section>

      {/* Why it's different */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-arena-border">
        <h2 className="text-xs font-semibold text-arena-muted uppercase tracking-wider mb-8 text-center">Why It&apos;s Different</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: "Model-Agnostic", desc: "No vendor lock-in. Swap OpenAI for Gemini or Claude without changing a line of your workflow." },
            { title: "Tool-Agnostic", desc: "Add any API via the Custom API Registry. GitHub today, your internal API tomorrow." },
            { title: "Verifiable", desc: "The Verification Engine independently confirms every claim — tests pass, deployments succeed, payments settle." },
            { title: "Web3-Native", desc: "Stellar/x402 payments with on-chain receipts. Your spending is auditable on a public blockchain." },
            { title: "Security-First", desc: "Agents get least-privilege capabilities. Secrets never leave the server. Every action is logged." },
            { title: "Single Developer", desc: "Built for one person who needs the power of a full team. Not a SaaS — your OS." },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="w-1 rounded-full bg-gradient-to-b from-arena-blue to-arena-violet shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-arena-text mb-0.5">{item.title}</h3>
                <p className="text-xs text-arena-muted leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-arena-border text-center">
        <h2 className="text-2xl font-bold text-arena-text mb-3">See what&apos;s been built</h2>
        <p className="text-sm text-arena-muted mb-8">Real projects, real missions, real on-chain receipts.</p>
        <Link
          href="/exhibition"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-arena-panel border border-arena-border text-arena-text hover:border-arena-blue/30 transition-colors text-sm"
        >
          View Exhibition →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-arena-border py-8 text-center">
        <div className="text-xs text-arena-muted">
          Arena OS — Personal AI Operating System
          <span className="mx-2">·</span>
          <Link href="/login" className="hover:text-arena-text transition-colors">Login</Link>
          <span className="mx-2">·</span>
          <Link href="/exhibition" className="hover:text-arena-text transition-colors">Exhibition</Link>
        </div>
      </footer>
    </div>
  );
}
