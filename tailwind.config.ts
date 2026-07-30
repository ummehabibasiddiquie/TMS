import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tms: {
          bg: "#0b0f1a",
          card: "#1a2234",
          accent: "#3b82f6",
          muted: "#94a3b8",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
  safelist: [
    "bg-red-100",
    "text-red-700",
    "text-red-800",
    "border-red-400",
    "ring-red-200",
    "bg-orange-100",
    "text-orange-700",
    "text-orange-900",
    "border-orange-400",
    "bg-blue-100",
    "text-blue-700",
    "text-blue-800",
    "border-blue-400",
    "bg-emerald-100",
    "text-emerald-700",
    "text-emerald-800",
    "border-emerald-400",
  ],
};
export default config;
