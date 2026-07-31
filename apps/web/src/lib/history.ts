export const HISTORY_STORAGE_KEY = "ragab.dev.history";
export const HISTORY_MAX = 200;

export function loadHistory(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .slice(-HISTORY_MAX);
  } catch {
    return [];
  }
}

export function persistHistory(history: string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(history.slice(-HISTORY_MAX)),
    );
  } catch {
    // quota / private mode — ignore
  }
}

/** Append a command; skips empty and consecutive duplicates. */
export function appendHistory(history: string[], command: string): string[] {
  const cmd = command.trim();
  if (!cmd) return history;
  if (history[history.length - 1] === cmd) return history;
  return [...history, cmd].slice(-HISTORY_MAX);
}
