export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--color-primario, #1F4E79)",
          secondary: "var(--color-secundario, #2E75B6)",
          accent: "var(--color-acento, #5BA3D9)",
          background: "var(--color-fondo, #D6E4F0)",
          success: "var(--color-exito, #1A7A4A)",
          error: "var(--color-error, #C0392B)",
        },
      },
      fontFamily: {
        brand: ["var(--brand-font, 'Segoe UI')", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
