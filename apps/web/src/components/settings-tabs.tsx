"use client";

import { useState, type ReactNode } from "react";

const TABS = ["SYSTEM", "API KEYS", "PERMISSIONS", "EXHIBITION"];

export function SettingsTabs({ children }: { children: ReactNode[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-arena-border">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className={`px-4 py-2 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors border-b-2 -mb-px ${
              active === i
                ? "text-arena-green border-arena-green"
                : "text-arena-muted border-transparent hover:text-arena-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>{children[active]}</div>
    </div>
  );
}
