export type UiMode = "terminal" | "browse";

export const UI_MODE_STORAGE_KEY = "ragab.dev.uiMode";

export function isCoarseOrNarrow(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  return coarse || narrow;
}

/** Explicit stored choice, else browse on every device. */
export function resolveUiMode(stored: string | null): UiMode {
  if (stored === "terminal" || stored === "browse") return stored;
  return "browse";
}

export function loadUiMode(): UiMode {
  try {
    return resolveUiMode(localStorage.getItem(UI_MODE_STORAGE_KEY));
  } catch {
    return resolveUiMode(null);
  }
}

export function persistUiMode(mode: UiMode): void {
  try {
    localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function externalHref(value: string): string {
  return value.startsWith("http") ? value : `https://${value}`;
}
