/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // NexusKit design tokens (see app/globals.css for the CSS variables)
        ink: "rgb(var(--ink) / <alpha-value>)",
        // Always-dark text for bright buttons and badges (same in light and dark mode)
        night: "#0D1120",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          strong: "rgb(var(--brand-strong) / <alpha-value>)",
        },
        pass: "rgb(var(--pass) / <alpha-value>)",
        mint: "rgb(var(--mint) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-myanmar)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "var(--font-myanmar)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        pass: "1.25rem",
      },
      keyframes: {
        "slide-up": { from: { transform: "translateY(12px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "drawer-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "sheet-in": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        bump: { "0%,100%": { transform: "scale(1)" }, "40%": { transform: "scale(1.25)" } },
      },
      animation: {
        "slide-up": "slide-up .35s cubic-bezier(.2,.8,.2,1) both",
        "fade-in": "fade-in .2s ease-out both",
        "drawer-in": "drawer-in .3s cubic-bezier(.2,.8,.2,1) both",
        "sheet-in": "sheet-in .3s cubic-bezier(.2,.8,.2,1) both",
        bump: "bump .4s ease-out",
      },
    },
  },
  plugins: [],
};
