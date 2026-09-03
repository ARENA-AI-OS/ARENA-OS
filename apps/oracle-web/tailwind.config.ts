import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#151A2E",
        present: "#E3A548",
        "healthy-future": "#4FA98C",
        risk: "#C9594A",
      },
      fontFamily: {
        oracle: ["var(--font-newsreader)", "serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
