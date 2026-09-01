import Link from "next/link";
import { getRepository } from "@db/index";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  web3: "Web3",
  ai: "AI Tooling",
  "full-stack": "Full-Stack",
  devtools: "Developer Tools",
  infra: "Infrastructure",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  web3: "text-arena-violet border-arena-violet/30",
  ai: "text-arena-blue border-arena-blue/30",
  "full-stack": "text-arena-cyan border-arena-cyan/30",
  devtools: "text-amber-400 border-amber-400/30",
  infra: "text-emerald-400 border-emerald-400/30",
  other: "text-arena-muted border-arena-border",
};

export default async function ExhibitionPage() {
  const repo = getRepository();
  const ws = await repo.ensureSeedWorkspace();
  const projects = await repo.listExhibitionProjects(ws.id, true);

  return (
    <div className="min-h-screen bg-arena-bg">
      {/* Header */}
      <header className="border-b border-arena-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            <span className="text-gradient">Arena</span>{" "}
            <span className="text-arena-text">OS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-arena-muted hover:text-arena-text transition-colors"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-arena-blue/10 border border-arena-blue/20 text-arena-blue text-sm hover:bg-arena-blue/20 transition-colors"
            >
              Open Command Center →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arena-violet/10 border border-arena-violet/20 text-arena-violet text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-arena-violet" />
          Exhibition
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          <span className="text-gradient">Built with Arena OS</span>
        </h1>
        <p className="text-lg text-arena-muted max-w-2xl mx-auto">
          Real projects, real missions, real on-chain receipts. Every entry
          below was planned, executed, or shipped by Arena&apos;s autonomous
          agents.
        </p>
      </section>

      {/* Category filter (server-rendered, static) */}
      <section className="max-w-6xl mx-auto px-6 pb-6">
        <div className="flex items-center gap-2 text-xs font-mono text-arena-muted">
          <span>Filter:</span>
          {["all", "web3", "ai", "full-stack", "devtools", "infra"].map(
            (cat) => (
              <span
                key={cat}
                className="px-2 py-1 rounded border border-arena-border hover:border-arena-blue/30 hover:text-arena-text transition-colors cursor-default"
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
              </span>
            )
          )}
        </div>
      </section>

      {/* Projects grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-3xl mb-4">⬡</div>
            <h2 className="text-lg font-semibold text-arena-text mb-2">
              No featured projects yet
            </h2>
            <p className="text-sm text-arena-muted max-w-md mx-auto">
              Projects appear here once they&apos;re marked as featured from
              the admin Settings panel.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group p-6 rounded-xl bg-arena-panel/50 border border-arena-border hover:border-arena-blue/20 transition-all"
              >
                {/* Category badge */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                      CATEGORY_COLORS[project.category] ||
                      CATEGORY_COLORS.other
                    }`}
                  >
                    {CATEGORY_LABELS[project.category] || project.category}
                  </span>
                  {project.stellarTx && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-400/30">
                      ◷ on-chain
                    </span>
                  )}
                </div>

                {/* Title & description */}
                <h3 className="text-lg font-semibold text-arena-text mb-2 group-hover:text-arena-blue transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-arena-muted leading-relaxed mb-4">
                  {project.description}
                </p>

                {/* Tech stack */}
                {project.techStack && project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded bg-arena-blue/5 border border-arena-blue/10 text-[10px] font-mono text-arena-blue/80"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Arena involvement */}
                {project.arenaInvolvement && (
                  <div className="p-3 rounded-lg bg-arena-bg/50 border border-arena-border mb-4">
                    <div className="text-[10px] font-mono text-arena-muted uppercase tracking-wider mb-1">
                      Arena OS Involvement
                    </div>
                    <p className="text-xs text-arena-muted leading-relaxed">
                      {project.arenaInvolvement}
                    </p>
                  </div>
                )}

                {/* Links */}
                <div className="flex items-center gap-3">
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-arena-muted hover:text-arena-blue transition-colors font-mono"
                    >
                      ↗ Repository
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-arena-muted hover:text-arena-blue transition-colors font-mono"
                    >
                      ↗ Live
                    </a>
                  )}
                  {project.receiptHash && (
                    <span className="text-[10px] font-mono text-emerald-400/60 ml-auto truncate max-w-[180px]">
                      receipt: {project.receiptHash.slice(0, 16)}…
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-arena-border py-8 text-center">
        <div className="text-xs text-arena-muted">
          Arena OS — Personal AI Operating System
          <span className="mx-2">·</span>
          <Link href="/" className="hover:text-arena-text transition-colors">
            Home
          </Link>
          <span className="mx-2">·</span>
          <Link
            href="/login"
            className="hover:text-arena-text transition-colors"
          >
            Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
