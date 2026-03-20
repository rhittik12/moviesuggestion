import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#09090b",
        panel: "#11131a",
        line: "#232634",
        highlight: "#e50914",
        muted: "#9ca3af"
      },
      boxShadow: {
        glow: "0 24px 60px rgba(229, 9, 20, 0.18)"
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top, rgba(229, 9, 20, 0.18), transparent 35%), linear-gradient(180deg, rgba(9, 9, 11, 0.15), rgba(9, 9, 11, 0.95) 72%)"
      }
    }
  },
  plugins: []
};

export default config;
