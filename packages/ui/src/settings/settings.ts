export const SETTINGS_STORAGE_KEY = "ragab.dev.settings";

export type ShellSettings = {
  /** Vim-like normal/insert modes on the prompt. */
  vim: boolean;
  /** Ghost auto-suggestion while typing. */
  suggest: boolean;
  /** Copy selection in the output pane automatically. */
  autoCopy: boolean;
  /** Haptic vibration for actions, navigation, and typing. */
  haptics: boolean;
  /** Sound level for haptic clicks, 0-100 (scales vibration strength too). */
  volume: number;
};

export const DEFAULT_SETTINGS: ShellSettings = {
  vim: false,
  suggest: true,
  autoCopy: true,
  haptics: true,
  volume: 50,
};

export function loadSettings(): ShellSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ShellSettings>;
    const out = { ...DEFAULT_SETTINGS, ...parsed };
    // Guard against corrupted storage (e.g. hand-edited volume)
    if (!Number.isFinite(out.volume)) out.volume = DEFAULT_SETTINGS.volume;
    return out;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(settings: ShellSettings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  // Stamp on <html> so a tiny post-body script / CSS can mirror without React
  try {
    const root = document.documentElement;
    root.dataset.vim = settings.vim ? "1" : "0";
    root.dataset.suggest = settings.suggest ? "1" : "0";
    root.dataset.autocopy = settings.autoCopy ? "1" : "0";
    root.dataset.haptics = settings.haptics ? "1" : "0";
  } catch {
    /* ignore */
  }
}
