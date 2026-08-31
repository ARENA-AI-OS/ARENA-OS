"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SECTIONS = [
  { href: "/", label: "Command Center", icon: "◈" },
  { href: "/missions", label: "Missions", icon: "▣" },
  { href: "/agents", label: "Agents", icon: "✦" },
  { href: "/models", label: "Models", icon: "◉" },
  { href: "/tools", label: "Tools", icon: "⚙" },
  { href: "/integrations", label: "Integrations", icon: "⧉" },
  { href: "/stellar", label: "Stellar", icon: "✷" },
  { href: "/payments", label: "Payments", icon: "$" },
  { href: "/activity", label: "Activity", icon: "∿" },
  { href: "/settings", label: "Settings", icon: "⚒" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  if (pathname === "/login") return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden glass rounded-lg p-2 text-arena-muted hover:text-arena-text"
        aria-label="Toggle menu"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-arena-border bg-arena-panel/95 glass transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 md:flex`}
      >
        <div className="px-5 py-5 border-b border-arena-border">
          <div className="text-lg font-semibold tracking-tight">
            <span className="text-gradient">ARENA</span> OS
          </div>
          <div className="text-[11px] text-arena-muted mt-1 font-mono">personal AI OS</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {SECTIONS.map((s) => {
            const active = pathname === s.href || (s.href !== "/" && pathname.startsWith(s.href));
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-arena-blue/10 text-arena-text glow-border" : "text-arena-muted hover:text-arena-text hover:bg-white/5"
                }`}
              >
                <span className="text-arena-blue/80 w-4 text-center">{s.icon}</span>
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-arena-border">
          <button
            onClick={logout}
            className="w-full rounded-md px-3 py-2 text-sm text-arena-muted hover:text-arena-text hover:bg-white/5 text-left"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
