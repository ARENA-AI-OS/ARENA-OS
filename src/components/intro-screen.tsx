"use client";

import { useState, useEffect, useRef } from "react";

export function IntroScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("arena-intro-seen");
    if (!hasSeenIntro) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    if (fading) return;
    setFading(true);
    localStorage.setItem("arena-intro-seen", "1");
    setTimeout(() => setVisible(false), 1200);
  };

  const handleVideoEnd = () => {
    dismiss();
  };

  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-[1200ms] ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-transform duration-[1200ms] ease-out ${
          fading ? "scale-100" : "scale-[1.05]"
        }`}
        src="/intro.mp4"
        onEnded={handleVideoEnd}
      />

      {/* Controls */}
      <div className="absolute top-6 right-6 flex gap-3">
        {/* Mute toggle */}
        <button
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.muted = !muted;
            }
            setMuted(!muted);
          }}
          className="px-4 py-2 text-sm font-mono text-arena-muted hover:text-arena-text border border-arena-border hover:border-arena-muted rounded-lg transition-all duration-200 bg-black/40 backdrop-blur-sm"
        >
          {muted ? "🔇 Unmute" : "🔊 Mute"}
        </button>
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="px-5 py-2 text-sm font-mono text-arena-muted hover:text-arena-text border border-arena-border hover:border-arena-muted rounded-lg transition-all duration-200 bg-black/40 backdrop-blur-sm"
        >
          Skip →
        </button>
      </div>
    </div>
  );
}
