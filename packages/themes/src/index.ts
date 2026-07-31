import {
  DEFAULT_THEME,
  type ThemeName,
  type ThemeTokens,
  palettes,
  themeNames,
} from "./palettes";

export {
  DEFAULT_THEME,
  palettes,
  themeNames,
  type ThemeName,
  type ThemeTokens,
};

/** CSS custom property names used by the design system. */
export const TOKEN_KEYS = [
  "bg",
  "panel",
  "fg",
  "dim",
  "muted",
  "bright",
  "accent",
  "love",
  "gold",
  "foam",
  "pine",
  "border",
  "cursor",
  "err",
  "ok",
  "scan",
  "vignette",
] as const;

export type TokenKey = (typeof TOKEN_KEYS)[number];

export const THEME_STORAGE_KEY = "ragab.dev.theme";

/** Map a loose user string to a known theme name (exact → prefix → includes). */
export function resolveThemeName(input: string | null | undefined): ThemeName | null {
  if (!input) return null;
  const q = input.toLowerCase().trim().replace(/\s+/g, "-");
  if (q in palettes) return q as ThemeName;
  const start = themeNames.find((n) => n.startsWith(q));
  if (start) return start;
  const inc = themeNames.find((n) => n.includes(q));
  return inc ?? null;
}

export function getTheme(name: ThemeName = DEFAULT_THEME): ThemeTokens {
  return palettes[name] ?? palettes[DEFAULT_THEME];
}

/** Build a style object of `--token` CSS variables for a palette. */
export function themeToCssVars(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of TOKEN_KEYS) {
    vars[`--${key}`] = tokens[key];
  }
  return vars;
}

/** Apply palette tokens to an element (defaults to documentElement). */
export function applyTheme(
  name: ThemeName,
  target: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null,
): ThemeName {
  if (!target) return name;
  const tokens = getTheme(name);
  for (const key of TOKEN_KEYS) {
    target.style.setProperty(`--${key}`, tokens[key]);
  }
  target.dataset.theme = name;
  return name;
}

export function pickRandomTheme(exclude?: ThemeName): ThemeName {
  if (themeNames.length <= 1) return themeNames[0] ?? DEFAULT_THEME;
  let pick: ThemeName = DEFAULT_THEME;
  do {
    pick = themeNames[Math.floor(Math.random() * themeNames.length)]!;
  } while (pick === exclude);
  return pick;
}

export function loadStoredTheme(): ThemeName {
  if (typeof localStorage === "undefined") return DEFAULT_THEME;
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  return resolveThemeName(raw) ?? DEFAULT_THEME;
}

export function persistTheme(name: ThemeName): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, name);
}
