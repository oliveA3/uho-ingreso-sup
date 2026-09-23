import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchSuperAdminConfig } from "../api/branding.service";

const DEFAULT_THEME = {
  nombre_sistema: "IngresoSUP",
  logo_url: "",
  tipografia: "Segoe UI",
  color_primario: "#1F4E79",
  color_secundario: "#2E75B6",
  color_acento: "#5BA3D9",
  color_fondo: "#D6E4F0",
  color_exito: "#1A7A4A",
  color_error: "#C0392B",
};

const CSS_VARIABLE_MAP = {
  color_primario: "--color-primario",
  color_secundario: "--color-secundario",
  color_acento: "--color-acento",
  color_fondo: "--color-fondo",
  color_exito: "--color-exito",
  color_error: "--color-error",
  tipografia: "--brand-font",
};

const DARK_TEXT = "#0F172A";
const LIGHT_TEXT = "#FFFFFF";

function channelToLinear(value) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.replace(/./g, "$&$&") : normalized;
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16));
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

function contrastRatio(first, second) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Elige texto claro u oscuro, el que dé mayor contraste (WCAG) sobre el color de fondo dado. */
export function readableTextColor(background) {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(background || "")) return LIGHT_TEXT;
  return contrastRatio(background, LIGHT_TEXT) >= contrastRatio(background, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT;
}

function applyThemeToDocument(theme) {
  const root = document.documentElement.style;
  Object.entries(CSS_VARIABLE_MAP).forEach(([field, cssVariable]) => {
    const value = theme[field] || DEFAULT_THEME[field];
    root.setProperty(cssVariable, value);
    if (field.startsWith("color_")) root.setProperty(`${cssVariable}-texto`, readableTextColor(value));
  });

  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  if (theme.logo_url) {
    favicon.href = theme.logo_url;
  } else {
    favicon.removeAttribute("href");
  }
}

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  loading: true,
  refreshTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  const refreshTheme = useCallback(async () => {
    try {
      const data = await fetchSuperAdminConfig();
      const nextTheme = { ...DEFAULT_THEME, ...data.config };
      setTheme(nextTheme);
      applyThemeToDocument(nextTheme);
      return nextTheme;
    } catch {
      applyThemeToDocument(DEFAULT_THEME);
      return DEFAULT_THEME;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTheme();
  }, [refreshTheme]);

  const value = useMemo(() => ({ theme, loading, refreshTheme }), [theme, loading, refreshTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Alias kept for readability at call sites that only care about branding data.
export const useBranding = useTheme;
