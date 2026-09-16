export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--brand-primary, #1F4E79)",
          secondary: "var(--brand-secondary, #2E75B6)",
          accent: "var(--brand-accent, #5BA3D9)",
          background: "var(--brand-background, #D6E4F0)",
          success: "var(--brand-success, #1A7A4A)",
          error: "var(--brand-error, #C0392B)",
        },
      },
      fontFamily: {
        brand: ["var(--brand-font, 'Segoe UI')", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
