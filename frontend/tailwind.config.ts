import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Baloo 2'", "system-ui", "sans-serif"],
        sans: ["'Poppins'", "system-ui", "sans-serif"],
      },
      colors: {
        // Warm, appetite-friendly coral-orange — the primary "fun" color.
        brand: {
          50: "#fff3ec",
          100: "#ffe2cf",
          200: "#ffc59c",
          300: "#ffa066",
          400: "#ff7a3d",
          500: "#ff5a1f",
          600: "#e8420c",
          700: "#c1330a",
        },
        // Playful teal accent for contrast highlights (badges, links, decorative bits).
        accent: {
          50: "#e6fbf8",
          100: "#c2f5ec",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
      },
      boxShadow: {
        pop: "0 6px 0 0 rgba(0,0,0,0.08)",
        card: "0 2px 10px -2px rgba(0,0,0,0.08), 0 8px 24px -8px rgba(255,90,31,0.15)",
      },
      borderRadius: {
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
