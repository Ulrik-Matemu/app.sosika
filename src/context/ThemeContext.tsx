import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type ThemeMode = "system" | "light" | "dark";
export type SurfaceStyle = "glass" | "solid";

/**
 * Storage keys. The inline boot script in index.html reads these same two
 * strings before first paint — keep them in sync or light mode flashes dark.
 */
export const THEME_KEY = "sosika_theme";
export const SURFACE_KEY = "sosika_surface";

const THEME_COLORS: Record<"light" | "dark", string> = {
  dark: "#09090B",
  light: "#FFFFFF",
};

interface ThemeContextValue {
  /** What the user chose. */
  mode: ThemeMode;
  /** What "system" actually resolved to — always light or dark. */
  resolved: "light" | "dark";
  surface: SurfaceStyle;
  setMode: (mode: ThemeMode) => void;
  setSurface: (surface: SurfaceStyle) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const prefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

const readStored = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    // Private mode, blocked site data — fall back rather than throw.
    return fallback;
  }
};

/**
 * Owns the app's appearance. "system" is resolved here in JS and written to
 * <html data-theme> as a concrete value, so the CSS only ever has to define
 * two themes rather than duplicate each one inside a media query.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() =>
    readStored(THEME_KEY, ["system", "light", "dark"] as const, "dark")
  );
  const [surface, setSurfaceState] = useState<SurfaceStyle>(() =>
    readStored(SURFACE_KEY, ["glass", "solid"] as const, "glass")
  );
  const [systemDark, setSystemDark] = useState(prefersDark);

  // Follow the OS while the user is on "system".
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.surface = surface;
    // Lets the browser render native controls and scrollbars to match.
    root.style.colorScheme = resolved;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLORS[resolved];
  }, [resolved, surface]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // A preference that can't persist is still worth applying this session.
    }
  }, []);

  const setSurface = useCallback((next: SurfaceStyle) => {
    setSurfaceState(next);
    try {
      localStorage.setItem(SURFACE_KEY, next);
    } catch {
      // As above.
    }
  }, []);

  const value = useMemo(
    () => ({ mode, resolved, surface, setMode, setSurface }),
    [mode, resolved, surface, setMode, setSurface]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
