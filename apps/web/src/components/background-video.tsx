"use client";

/**
 * Full-bleed ambient background video for the hero section, with a dark
 * overlay so hero text stays legible over it. Muted + playsInline is
 * required for autoplay to actually work in Safari/iOS; loop keeps it
 * running — background.mp4's content (steady ambient particles/circuit
 * motion, no hard narrative arc) was picked specifically because it loops
 * without a jarring cut.
 */
export function BackgroundVideo() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="h-full w-full object-cover opacity-60"
      >
        <source src="/api/media/background.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-arena-bg/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-arena-bg/40 to-arena-bg" />
    </div>
  );
}
