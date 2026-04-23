import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#F0F5F1",
          100: "#D8E5DB",
          200: "#B2CCBA",
          300: "#83AD8F",
          400: "#578E6A",
          500: "#2F6E4C",
          600: "#23573B",
          700: "#1B4631",
          800: "#16372C",
          900: "#0F281F",
        },
        sage: {
          400: "#9BAF9F",
          500: "#7A9080",
          600: "#5F7566",
        },
        mint: {
          100: "#F0F7F1",
          200: "#E8F0EA",
          300: "#D5E5D9",
        },
        cream: {
          50: "#FCF8F1",
          100: "#FAF4EA",
          200: "#F5EDD9",
          300: "#EEE2C8",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#F5F2EC",
          border: "#E5DDD0",
        },
        success: {
          DEFAULT: "#3E8B5C",
          fg: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#C68E3E",
          fg: "#FFFFFF",
        },
        danger: {
          DEFAULT: "#B14B4B",
          fg: "#FFFFFF",
        },
        info: {
          DEFAULT: "#4A7A9F",
          fg: "#FFFFFF",
        },
      },
      borderRadius: {
        none: "0",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,55,44,0.04), 0 2px 8px rgba(22,55,44,0.06)",
        cardHover: "0 2px 4px rgba(22,55,44,0.06), 0 8px 24px rgba(22,55,44,0.08)",
        popover: "0 10px 40px rgba(22,55,44,0.12)",
        input: "0 1px 2px rgba(22,55,44,0.04)",
        focus: "0 0 0 3px rgba(47,110,76,0.15)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "40px" }],
        "5xl": ["48px", { lineHeight: "1.1em" }],
      },
    },
  },
  plugins: [typography],
};

export default config;