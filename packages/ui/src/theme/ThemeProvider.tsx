import {
  DEFAULT_THEME,
  applyTheme,
  loadStoredTheme,
  persistTheme,
  pickRandomTheme,
  resolveThemeName,
  type ThemeName,
  themeNames,
} from "@ragab/themes";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cx } from "../lib/cx";

type ThemeContextValue = {
  /** Committed theme (persisted). During list preview, still the last committed name. */
  theme: ThemeName;
  /** Currently visible theme (preview or committed). */
  activeTheme: ThemeName;
  themes: readonly ThemeName[];
  setTheme: (name: string) => ThemeName | null;
  /** Apply palette temporarily without persisting. */
  previewTheme: (name: string) => ThemeName | null;
  /** Restore last committed theme (after leaving a preview list). */
  cancelPreview: () => void;
  randomTheme: () => ThemeName;
  resetTheme: () => ThemeName;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  children: ReactNode;
  /** Initial theme (defaults to rose-pine on SSR — storage applied after mount). */
  initialTheme?: ThemeName;
  /** Persist selection to localStorage. */
  persist?: boolean;
  /** Flash overlay on intentional switch (not on boot restore). */
  flash?: boolean;
};

export function ThemeProvider({
  children,
  initialTheme,
  persist = true,
  flash = true,
}: ThemeProviderProps) {
  // SSR + first client render MUST match (always default/prop). Reading
  // localStorage/boot script here caused hydration mismatches (rose-pine vs terafox).
  const ssrTheme = initialTheme ?? DEFAULT_THEME;
  const [theme, setThemeState] = useState<ThemeName>(ssrTheme);
  const [activeTheme, setActiveTheme] = useState<ThemeName>(ssrTheme);
  const [flashOn, setFlashOn] = useState(false);
  const committedRef = useRef<ThemeName>(ssrTheme);
  const previewingRef = useRef(false);
  const didBoot = useRef(false);

  // Before paint: restore stored theme into React state (colors already set by
  // the blocking <head> script + [data-theme] CSS — this only syncs the badge).
  useLayoutEffect(() => {
    if (didBoot.current) return;
    didBoot.current = true;

    const next = initialTheme ?? loadStoredTheme();
    applyTheme(next);
    if (persist) persistTheme(next);
    setThemeState(next);
    setActiveTheme(next);
    committedRef.current = next;
  }, [initialTheme, persist]);

  const flashOnce = useCallback(() => {
    if (!flash) return;
    setFlashOn(true);
    requestAnimationFrame(() => {
      window.setTimeout(() => setFlashOn(false), 80);
    });
  }, [flash]);

  const setTheme = useCallback(
    (name: string) => {
      const resolved = resolveThemeName(name);
      if (!resolved) return null;
      applyTheme(resolved);
      setThemeState(resolved);
      setActiveTheme(resolved);
      committedRef.current = resolved;
      previewingRef.current = false;
      if (persist) persistTheme(resolved);
      flashOnce();
      return resolved;
    },
    [persist, flashOnce],
  );

  const previewTheme = useCallback((name: string) => {
    const resolved = resolveThemeName(name);
    if (!resolved) return null;
    applyTheme(resolved);
    setActiveTheme(resolved);
    previewingRef.current = true;
    return resolved;
  }, []);

  const cancelPreview = useCallback(() => {
    if (!previewingRef.current) return;
    const committed = committedRef.current;
    applyTheme(committed);
    setActiveTheme(committed);
    previewingRef.current = false;
  }, []);

  const randomTheme = useCallback(() => {
    const next = pickRandomTheme(committedRef.current);
    setTheme(next);
    return next;
  }, [setTheme]);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
    return DEFAULT_THEME;
  }, [setTheme]);

  const value = useMemo(
    () => ({
      theme,
      activeTheme,
      themes: themeNames,
      setTheme,
      previewTheme,
      cancelPreview,
      randomTheme,
      resetTheme,
    }),
    [
      theme,
      activeTheme,
      setTheme,
      previewTheme,
      cancelPreview,
      randomTheme,
      resetTheme,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>
      {flash ? (
        <div
          className={cx("ragab-theme-flash", flashOn && "ragab-theme-flash--on")}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
