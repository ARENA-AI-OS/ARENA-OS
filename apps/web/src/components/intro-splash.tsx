"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "arena-os-intro-seen";
const FADE_MS = 400;

/**
 * One-time brand intro: plays intro.mp4 (the full "ARENA OS" logo reveal)
 * full-screen before the marketing page underneath it. Muted for
 * autoplay to actually work cross-browser — this is a visual sting, not
 * something that needs sound. Gated on sessionStorage so a visitor
 * clicking around the site doesn't get replayed the splash on every
 * navigation, only once per session. Always skippable — never blocks
 * someone who's already seen it or doesn't want to wait.
 */
export function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);
  }, []);

  function dismiss() {
    if (dismissing) return;
    setDismissing(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Storage can throw in private-browsing contexts — not worth blocking the dismiss over.
    }
    setTimeout(() => setVisible(false), FADE_MS);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity"
      style={{ opacity: dismissing ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <video
        autoPlay
        muted
        playsInline
        onEnded={dismiss}
        className="h-full w-full object-contain sm:h-auto sm:max-h-[90vh] sm:w-auto"
      >
        <source src="/api/media/intro.mp4" type="video/mp4" />
      </video>
      <button
        onClick={dismiss}
        className="absolute bottom-6 right-6 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/70 transition-colors hover:border-white/40 hover:text-white"
      >
        Skip
      </button>
    </div>
  );
}
