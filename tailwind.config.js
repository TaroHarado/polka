module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fg:"var(--fg)", muted:"var(--muted)", border:"var(--border)",
        surface:"var(--surface)", success:"var(--success)", warn:"var(--warn)",
        error:"var(--error)", buy:"var(--buy)", sell:"var(--sell)", accent:"var(--accent)"
      },
      fontFamily: { mono: ["ui-monospace","SFMono-Regular","Menlo","monospace"] }
    },
  },
  plugins: [],
};
