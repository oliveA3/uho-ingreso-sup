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
  color_primario: "--brand-primary",
  color_secundario: "--brand-secondary",
  color_acento: "--brand-accent",
  color_fondo: "--brand-background",
  color_exito: "--brand-success",
  color_error: "--brand-error",
  tipografia: "--brand-font",
};

function applyThemeToDocument(theme) {
  const root = document.documentElement.style;
  Object.entries(CSS_VARIABLE_MAP).forEach(([field, cssVariable]) => {
    root.setProperty(cssVariable, theme[field] || DEFAULT_THEME[field]);
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
