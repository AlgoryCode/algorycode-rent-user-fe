"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type RentTheme = "dark" | "light";

type ThemeContextValue = {
  theme: RentTheme;
  setTheme: (t: RentTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "rent-theme";

function readStoredTheme(): RentTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as RentTheme | null;
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyDom(theme: RentTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<RentTheme>("dark");

  /* İlk boyama öncesi: script ile aynı kaynak (localStorage) — FOUC ve toggle senkronu */
  useLayoutEffect(() => {
    const t = readStoredTheme();
    setThemeState(t);
    applyDom(t);
  }, []);

  const setTheme = useCallback((t: RentTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    applyDom(t);
    window.dispatchEvent(new CustomEvent("rent-theme", { detail: t }));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: RentTheme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyDom(next);
      window.dispatchEvent(new CustomEvent("rent-theme", { detail: next }));
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      if (e.newValue === "light" || e.newValue === "dark") {
        setThemeState(e.newValue);
        applyDom(e.newValue);
      }
    };
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent<RentTheme>).detail;
      if (d === "light" || d === "dark") setThemeState(d);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("rent-theme", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rent-theme", onCustom as EventListener);
    };
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
