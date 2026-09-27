"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_THEME_CHOICE,
  themeColorScheme,
  isThemeChoice,
  resolveThemeChoice,
  THEMES,
  type ThemeChoice,
  type ThemeId,
  type ThemeDefinition,
} from "@/lib/theme/themes";
import { applyAccent, getStoredAccent } from "@/lib/theme/appearance";

const STORAGE_KEY = "disband:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  /** What the user picked, which may be "auto". */
  theme: ThemeChoice;
  /** The palette actually on screen. */
  resolvedTheme: ThemeId;
  themes: ThemeDefinition[];
  setTheme: (theme: ThemeChoice) => void;

  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function prefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return true;
  }
}

// data-theme picks the palette; data-appearance (light/dark) drives the
// derived layer in tokens.css — shadows, glass tint, system colours — so
// every light theme gets light materials without listing them all.
function applyTheme(choice: ThemeChoice): ThemeId {
  const resolved = resolveThemeChoice(choice, prefersDark());
  const root = document.documentElement;
  const mode = themeColorScheme(resolved);
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-appearance", mode);
  root.style.colorScheme = mode;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(DEFAULT_THEME_CHOICE);
  const [resolvedTheme, setResolvedTheme] = useState<ThemeId>("dark");

  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { /* The current theme works without storage. */ }
    const choice = isThemeChoice(stored) ? stored : DEFAULT_THEME_CHOICE;
    setThemeState(choice);
    setResolvedTheme(applyTheme(choice));
    applyAccent(getStoredAccent());
  }, []);

  // Follow the OS while on Automatic, like the system appearance setting.
  useEffect(() => {
    if (theme !== "auto") return;
    let mql: MediaQueryList;
    try { mql = window.matchMedia(DARK_QUERY); } catch { return; }
    const onChange = () => setResolvedTheme(applyTheme("auto"));
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    setResolvedTheme(applyTheme(next));
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* Session-only preference. */ }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const index = THEMES.findIndex((t) => t.id === current);
      const next = THEMES[(index + 1) % THEMES.length].id;
      setResolvedTheme(applyTheme(next));
      try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* Session-only preference. */ }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, themes: THEMES, setTheme, cycleTheme }),
    [theme, resolvedTheme, setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}
