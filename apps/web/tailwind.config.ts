import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: "#0A0B0D",
          panel: "#14171A",
          panel2: "#101316",
          inset: "#0C0F11",
          border: "#26302B",
          "border-hover": "#32E87540",
          text: "#E8ECEA",
          secondary: "#8C9691",
          muted: "#5E6863",
          green: "#32E875",
          "green-dim": "#174D32",
          "green-glow": "#32E87520",
          red: "#C94A4A",
          "red-dim": "#3D1A1A",
        },
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 12px -4px #32E87540, inset 0 0 0 1px #32E87530",
        "glow-red": "0 0 12px -4px #C94A4A40, inset 0 0 0 1px #C94A4A30",
        panel: "0 1px 3px rgba(0,0,0,0.3)",
      },
      borderRadius: {
        panel: "8px",
        btn: "6px",
      },
      animation: {
        pulse: "arena-pulse 1.2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.3s ease-out",
      },
      keyframes: {
        "arena-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
