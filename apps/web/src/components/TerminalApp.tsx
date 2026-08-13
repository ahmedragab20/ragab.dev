import {
  CompletionMenu,
  DEFAULT_SETTINGS,
  Hint,
  Line,
  Output,
  OutputText,
  PromptRow,
  Shell,
  ThemeProvider,
  Titlebar,
  ToastProvider,
  loadSettings,
  persistSettings,
  useTheme,
  useToast,
  type CompletionItem,
  type ShellSettings,
  type TextTone,
} from "@ragab/ui";
import { DEFAULT_THEME, themeNames, type ThemeName } from "@ragab/themes";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";

/** Prose/MDX/shiki only when a post is open — keeps the home shell lean. */
const TerminalProse = lazy(() =>
  import("@ragab/ui/prose").then((m) => ({ default: m.TerminalProse })),
);
import { site } from "../data/site";
import { appendHistory, loadHistory, persistHistory } from "../lib/history";
import { useHaptics } from "../lib/haptics";
import {
  applyCompletion,
  applySuggestion,
  getCompletions,
  getSuggestion,
  tokenizeInput,
  type CompletionResult,
} from "../lib/suggest";
import { announce, focusEl } from "../lib/a11y";
import { isCoarseOrNarrow, loadUiMode, persistUiMode, type UiMode } from "../lib/uiMode";
import { BrowseApp } from "./BrowseApp";

export type ContentItem = {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  excerpt?: string;
  tags?: string[];
  pinned?: boolean;
  /** MD/MDX body — omit on home to keep the island props small. */
  body?: string;
};

export type TerminalBoot = { mode: "home" } | { mode: "blogs" } | { mode: "blog"; slug: string };

export type TerminalAppProps = {
  blogs: ContentItem[];
  announcements: ContentItem[];
  boot?: TerminalBoot;
};

type TerminalInnerProps = TerminalAppProps & {
  onOpenBrowse: () => void;
};

type TextEntry = {
  kind: "text";
  id: number;
  text: string;
  tone?: TextTone;
  /** Run this command when the line is clicked / Enter. */
  action?: string;
  /** Open this URL when the line is clicked. */
  href?: string;
  /** Colorful shell prompt echo */
  echo?: boolean;
  /** Theme name to preview on focus (commit only on Enter/click via action). */
  themePreview?: string;
  /** Interactive volume row — ArrowLeft/ArrowRight adjust the sound level. */
  volume?: boolean;
};

type ProseEntry = {
  kind: "prose";
  id: number;
  title: string;
  date: string;
  tags?: string[];
  slug: string;
  source: string;
  bare?: boolean;
};

type OutEntry = TextEntry | ProseEntry;
type TextDraft = Omit<TextEntry, "id" | "kind"> & { kind?: "text" };
type ProseDraft = Omit<ProseEntry, "id" | "kind"> & { kind: "prose" };
type Draft = TextDraft | ProseDraft;

/** IDs are index-based within a batch so SSR and client hydrate identically;
 *  the live counter continues past the boot batch (see push). */
function materialize(entries: Draft[], startId: number): OutEntry[] {
  return entries.map((e, i) => {
    const id = startId + i;
    if (e.kind === "prose") return { ...e, id };
    return {
      kind: "text" as const,
      id,
      text: e.text ?? "",
      tone: e.tone,
      action: e.action,
      href: e.href,
      echo: e.echo,
      themePreview: e.themePreview,
      volume: e.volume,
    };
  });
}

function PromptEcho({ cmd }: { cmd: string }) {
  return (
    <div className="ragab-echo">
      <span className="ragab-echo__user">guest</span>
      <span className="ragab-echo__at">@</span>
      <span className="ragab-echo__host">ragab.dev</span>
      <span className="ragab-echo__sep">:</span>
      <span className="ragab-echo__dir">~</span>
      <span className="ragab-echo__sep">$ </span>
      <span className="ragab-echo__cmd">{cmd}</span>
    </div>
  );
}

const DOCK_COMMANDS = [
  { label: "about", cmd: "whoami" },
  { label: "projects", cmd: "projects" },
  { label: "writing", cmd: "blogs" },
  { label: "contact", cmd: "contact" },
  { label: "themes", cmd: "theme list" },
  { label: "help", cmd: "help" },
] as const;

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest("input, textarea, select, [contenteditable='true']"));
}

/** Boot buffer shared by SSR first paint + client (DEFAULT_THEME for hydration match). */
function buildBootLines(boot: TerminalBoot, blogs: ContentItem[], themeName: string): Draft[] {
  if (boot.mode === "home") {
    const writing =
      blogs.length > 0 ? `notes on ai + web (${blogs.length})` : "notes on ai + web · soon";
    return [
      { text: "whoami", echo: true },
      { text: site.name, tone: "bright" },
      {
        text: `${site.role} · ${site.location} · ● ${site.status}`,
        tone: "gold",
      },
      { text: "" },
      ...site.bio.map((l) => ({ text: l, tone: "foam" as const })),
      { text: "" },
      { text: "▸ about      who i am, what i do", action: "whoami" },
      {
        text: `▸ projects   selected work (${site.projects.length})`,
        action: "projects",
      },
      { text: `▸ writing    ${writing}`, action: "blogs" },
      {
        text: "▸ contact    email · github · x · linkedin",
        action: "contact",
      },
      { text: "▸ browse     page view (default)", action: "browse" },
      { text: "" },
      {
        text: `theme: ${themeName}  ·  ${themeNames.length} palettes`,
        tone: "dim",
      },
      {
        text: "tip: type browse for the page view · Tab completes · tour for a walkthrough",
        tone: "accent",
      },
      { text: "" },
    ];
  }
  if (boot.mode === "blogs") {
    return [{ text: "blogs", echo: true }, ...listBlogs(blogs), { text: "" }];
  }
  return [{ text: `blog ${boot.slug}`, echo: true }, ...readBlog(boot.slug, blogs), { text: "" }];
}

function TerminalInner({
  blogs,
  announcements,
  boot = { mode: "home" },
  onOpenBrowse,
}: TerminalInnerProps) {
  const { theme, activeTheme, setTheme, previewTheme, cancelPreview, randomTheme, resetTheme } =
    useTheme();
  const { toast } = useToast();

  // Defaults only for SSR + first client paint — localStorage after mount
  // (avoids hydration mismatch when stored settings e.g. vim:true differ)
  const [settings, setSettingsState] = useState<ShellSettings>(DEFAULT_SETTINGS);
  const haptics = useHaptics(settings);
  // SSR the boot banner so LCP is real content (not an empty log).
  // Name uses DEFAULT_THEME for SSR/hydrate match; colors come from CSS/boot script.
  const [lines, setLines] = useState<OutEntry[]>(() =>
    materialize(buildBootLines(boot, blogs, DEFAULT_THEME), 0),
  );
  /** Runtime batches continue from here; boot ids are 0..lines.length-1. */
  const nextLineId = useRef(lines.length);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [vimMode, setVimMode] = useState<"insert" | "normal">("insert");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuResult, setMenuResult] = useState<CompletionResult | null>(null);
  const histIdx = useRef(-1);
  const draft = useRef("");
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastCopy = useRef("");
  const [storageReady, setStorageReady] = useState(false);
  /** Boot / SSR lines stay still; only command output after mount animates (LCP). */
  const bootMaxId = useRef(lines.reduce((m, l) => Math.max(m, l.id), 0));
  const shouldAnimate = useCallback((id: number) => id > bootMaxId.current, []);

  // Before paint: restore prefs so vim/hint don't flash defaults → stored
  useLayoutEffect(() => {
    setSettingsState(loadSettings());
    setHistory(loadHistory());
    setStorageReady(true);
  }, []);

  // Keep history in localStorage (↑↓ across sessions); only after hydrate
  useEffect(() => {
    if (!storageReady) return;
    persistHistory(history);
  }, [history, storageReady]);

  const updateSettings = useCallback(
    (patch: Partial<ShellSettings>, quiet = false) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...patch };
        persistSettings(next);
        if (!quiet) {
          const key = Object.keys(patch)[0] as keyof ShellSettings | undefined;
          if (key) {
            toast("settings", {
              detail:
                key === "volume"
                  ? `volume: ${next.volume}%`
                  : `${key}: ${next[key] ? "on" : "off"}`,
              tone: "ok",
            });
          }
        }
        return next;
      });
    },
    [toast],
  );

  const suggestCtx = useMemo(
    () => ({
      blogs: blogs.map((b) => ({
        slug: b.slug,
        title: b.title,
        date: b.date,
      })),
    }),
    [blogs],
  );

  const suggestion = useMemo(() => {
    if (!settings.suggest || menuOpen) return "";
    return getSuggestion(value, suggestCtx);
  }, [value, suggestCtx, settings.suggest, menuOpen]);

  const openCompletions = useCallback(
    (forValue = value) => {
      const result = getCompletions(forValue, suggestCtx);
      if (!result || result.items.length === 0) {
        setMenuOpen(false);
        setMenuResult(null);
        toast("no matches", { tone: "warn", ms: 1400 });
        haptics.warn();
        return false;
      }
      setMenuResult(result);
      setMenuIndex(0);
      setMenuOpen(true);
      haptics.select();
      return true;
    },
    [value, suggestCtx, toast, haptics],
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuResult(null);
    setMenuIndex(0);
  }, []);

  const focusPrompt = useCallback(() => {
    cancelPreview();
    focusEl(inputRef.current);
  }, [cancelPreview]);

  const push = useCallback((entries: Draft[]) => {
    const mat = materialize(entries, nextLineId.current);
    nextLineId.current += mat.length;
    setLines((prev) => [...prev, ...mat]);
    return mat;
  }, []);

  /** Options from the most recent list command (after last echo). */
  const getLatestOptions = useCallback((): HTMLElement[] => {
    const root = outputRef.current;
    if (!root) return [];
    const echoes = root.querySelectorAll(".ragab-echo");
    const lastEcho = echoes[echoes.length - 1] ?? null;
    const all = [...root.querySelectorAll<HTMLElement>("[data-ragab-option]")];
    if (!lastEcho) return all;
    return all.filter(
      (el) => !!(lastEcho.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  }, []);

  const previewFromEl = useCallback(
    (el: HTMLElement | null | undefined) => {
      const name = el?.dataset.themePreview;
      if (name) previewTheme(name);
      else cancelPreview();
    },
    [previewTheme, cancelPreview],
  );

  /** Focus first clickable option in a just-rendered list (settings / blogs / themes). */
  const focusFirstOption = useCallback(
    (entries: OutEntry[]) => {
      const first = entries.find((e) => e.kind === "text" && (e.action || e.href));
      if (!first || first.kind !== "text") return;
      // Wait for DOM paint after setState
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = outputRef.current?.querySelector<HTMLElement>(
            `[data-ragab-option="${first.id}"]`,
          );
          el?.focus();
          el?.scrollIntoView({ block: "nearest" });
          previewFromEl(el);
        });
      });
    },
    [previewFromEl],
  );

  /** From the prompt: jump back into the latest option list (first item). */
  const focusLatestList = useCallback((): boolean => {
    const options = getLatestOptions();
    if (!options.length) return false;
    const el = options[0]!;
    el.focus();
    haptics.select();
    el.scrollIntoView({ block: "nearest" });
    previewFromEl(el);
    return true;
  }, [getLatestOptions, previewFromEl, haptics]);

  const onOptionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const options = getLatestOptions();
      if (!options.length) return;

      const current = e.currentTarget;
      const idx = options.indexOf(current);
      if (idx < 0) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        e.stopPropagation();
        // Wrap past the last item → first
        const next = options[(idx + 1) % options.length];
        next?.focus();
        next?.scrollIntoView({ block: "nearest" });
        previewFromEl(next);
        haptics.select();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        if (idx <= 0) {
          focusPrompt(); // restores committed theme
          return;
        }
        const prev = options[idx - 1];
        prev?.focus();
        prev?.scrollIntoView({ block: "nearest" });
        previewFromEl(prev);
        haptics.select();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // Volume rows scrub the sound level left/right with immediate audio
        if (!current.hasAttribute("data-ragab-volume")) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = e.key === "ArrowRight" ? 10 : -10;
        const next = Math.max(0, Math.min(100, settings.volume + delta));
        if (next === settings.volume) return;
        updateSettings({ volume: next }, true);
        haptics.fireAt("light", next / 100);
        // Patch every volume row in place so the label tracks the level
        setLines((prev) =>
          prev.map((l) =>
            l.kind === "text" && l.volume
              ? { ...l, text: volumeRowText(next), action: volumeRowAction(next) }
              : l,
          ),
        );
        return;
      }
      if (e.key === "Escape" || e.key === "q") {
        e.preventDefault();
        e.stopPropagation();
        focusPrompt(); // cancelPreview inside
      }
      if (e.key === "Enter" || e.key === " ") {
        // Native button activation is disrupted by the global type-to-focus
        // handler (it moves focus to the prompt on Enter) — fire it directly.
        e.preventDefault();
        e.stopPropagation();
        current.click();
        return;
      }
    },
    [focusPrompt, getLatestOptions, previewFromEl, settings, updateSettings, haptics, setLines],
  );

  const onOptionFocus = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      previewFromEl(e.currentTarget);
    },
    [previewFromEl],
  );

  const onOptionBlur = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      const next = e.relatedTarget as HTMLElement | null;
      // Still inside the option list → keep preview of the newly focused item
      if (next?.hasAttribute("data-ragab-option")) return;
      // Left the list without committing
      cancelPreview();
    },
    [cancelPreview],
  );

  const scroll = useCallback(() => {
    requestAnimationFrame(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scroll();
  }, [lines, scroll]);

  // Focus prompt after mount on fine pointers only — coarse (iOS) would
  // open the keyboard + trigger zoom and make the first paint feel dizzy.
  useEffect(() => {
    if (isCoarseOrNarrow()) return;
    focusEl(inputRef.current);
  }, []);

  // Auto-copy on select in output
  useEffect(() => {
    if (!settings.autoCopy) return;

    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text || text === lastCopy.current) return;

      const anchor = sel.anchorNode;
      const out = outputRef.current;
      if (!out || !anchor || !out.contains(anchor)) return;

      lastCopy.current = text;
      void navigator.clipboard.writeText(text).then(
        () => {
          haptics.success();
          toast("copied", {
            detail: text.length > 48 ? `${text.slice(0, 48)}…` : text,
            tone: "ok",
            ms: 1800,
          });
        },
        () => {
          toast("copy failed", { tone: "err" });
        },
      );
    };

    document.addEventListener("mouseup", onSel);
    document.addEventListener("keyup", onSel);
    return () => {
      document.removeEventListener("mouseup", onSel);
      document.removeEventListener("keyup", onSel);
    };
  }, [settings.autoCopy, toast, haptics]);

  // Global type-to-focus (unless another field is focused)
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target) && e.target !== inputRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[role="listbox"], [role="menu"], [role="dialog"]')) return;
      // Interactive controls (row buttons, links) own their Enter — don't
      // yank focus to the prompt before their native activation fires.
      if (e.key === "Enter" && target?.closest?.("button, a")) return;

      const input = inputRef.current;
      if (!input) return;

      // Already focused on our input — let it handle
      if (document.activeElement === input) return;

      // Don't steal when user is selecting text etc. with modifiers only
      if (e.key === "Tab" || e.key === "Escape") {
        // allow esc to still focus
        if (e.key === "Escape") {
          input.focus();
        }
        return;
      }

      // Printable → focus; insert only in insert mode (or when vim is off)
      if (e.key.length === 1) {
        e.preventDefault();
        input.focus();
        if (settings.vim && vimMode === "normal") {
          // vim keys handled after focus on next keydown in the input
          if (e.key === "i" || e.key === "a" || e.key === "I" || e.key === "A") {
            setVimMode("insert");
          } else if (e.key === "x" || e.key === "D" || e.key === "C") {
            setValue("");
            if (e.key === "C") setVimMode("insert");
          }
          return;
        }
        setValue((v) => v + e.key);
        haptics.type();
      } else if (
        e.key === "Backspace" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "Enter"
      ) {
        input.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [settings.vim, vimMode, haptics]);

  // Vim badge click (mouse)
  useEffect(() => {
    const onToggle = () => {
      if (!settings.vim) return;
      setVimMode((m) => {
        const next = m === "normal" ? "insert" : "normal";
        toast("vim", { detail: `${next} mode`, ms: 1200 });
        return next;
      });
      haptics.select();
      focusPrompt();
    };
    document.addEventListener("ragab:vim-toggle", onToggle);
    return () => document.removeEventListener("ragab:vim-toggle", onToggle);
  }, [settings.vim, toast, focusPrompt, haptics]);

  const run = useCallback(
    (raw: string) => {
      const input = raw.trim();
      if (!input) return;

      closeMenu();
      setHistory((h) => appendHistory(h, input));
      histIdx.current = -1;
      draft.current = "";

      const [cmd, ...args] = input.split(/\s+/);
      const key = (cmd ?? "").toLowerCase();
      if (key === "browse") {
        haptics.nav();
        onOpenBrowse();
        return;
      }

      push([{ text: input, echo: true }]);

      const out = handleCommand(key, args, {
        blogs,
        announcements,
        theme,
        setTheme,
        randomTheme,
        resetTheme,
        settings,
        updateSettings,
        hapticsSupported: haptics.supported,
      });

      // Haptic feedback for the executed command, derived from its output tone
      if (out?.some((l) => l.kind !== "prose" && l.tone === "err")) haptics.error();
      else if (out?.some((l) => l.kind === "prose")) haptics.nav();
      else if (out?.some((l) => l.kind !== "prose" && l.tone === "ok")) haptics.success();
      else haptics.tap();

      if (out === null) {
        setLines([]);
        focusPrompt();
        return;
      }
      const mat = push([...out, { text: "" }]);
      const hasOptions = mat.some((e) => e.kind === "text" && (e.action || e.href));
      if (hasOptions) {
        focusFirstOption(mat);
      } else {
        focusPrompt();
      }
    },
    [
      announcements,
      blogs,
      closeMenu,
      focusFirstOption,
      focusPrompt,
      onOpenBrowse,
      push,
      randomTheme,
      resetTheme,
      setTheme,
      haptics,
      settings,
      theme,
      updateSettings,
    ],
  );

  const selectCompletionStable = useCallback(
    (item: CompletionItem) => {
      if (!menuResult) return;
      haptics.select();
      // Always fill the prompt — never auto-execute (Enter runs)
      const next = applyCompletion(value, menuResult, item);
      closeMenu();
      setValue(next);
      // If choice ends with space (needs more args), reopen chooser
      queueMicrotask(() => {
        if (next.endsWith(" ")) {
          const nested = getCompletions(next, suggestCtx);
          if (nested && nested.items.length > 0) {
            setMenuResult(nested);
            setMenuIndex(0);
            setMenuOpen(true);
          }
        }
      });
      focusPrompt();
    },
    [menuResult, value, closeMenu, suggestCtx, focusPrompt, haptics],
  );

  const inputTokens = useMemo(() => tokenizeInput(value), [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // ── Completion menu navigation ──
    if (menuOpen && menuResult) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIndex((i) => (i + 1) % menuResult.items.length);
        haptics.select();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex((i) => (i <= 0 ? menuResult.items.length - 1 : i - 1));
        haptics.select();
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const item = menuResult.items[menuIndex];
        if (item) selectCompletionStable(item);
        return;
      }
    }

    // ── Vim normal mode ──
    if (settings.vim && vimMode === "normal") {
      e.preventDefault();
      if (e.key === "i") {
        setVimMode("insert");
        haptics.select();
        return;
      }
      if (e.key === "a" || e.key === "I" || e.key === "A") {
        setVimMode("insert");
        haptics.select();
        return;
      }
      if (e.key === "D" || e.key === "x" || e.key === "C") {
        setValue("");
        if (e.key === "C") setVimMode("insert");
        return;
      }
      if (e.key === "Enter") {
        const v = value;
        setValue("");
        run(v);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        if (!history.length) return;
        if (histIdx.current === -1) draft.current = value;
        histIdx.current = Math.min(histIdx.current + 1, history.length - 1);
        setValue(history[history.length - 1 - histIdx.current] ?? "");
        haptics.select();
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        if (histIdx.current === -1) {
          focusLatestList();
          return;
        }
        if (histIdx.current <= 0) {
          histIdx.current = -1;
          setValue(draft.current);
          haptics.select();
        } else {
          histIdx.current -= 1;
          setValue(history[history.length - 1 - histIdx.current] ?? "");
          haptics.select();
        }
        return;
      }
      return;
    }

    if (settings.vim && e.key === "Escape") {
      e.preventDefault();
      if (menuOpen) {
        closeMenu();
        return;
      }
      setVimMode("normal");
      toast("vim", { detail: "normal mode", ms: 1200 });
      haptics.select();
      return;
    }

    if (e.key === "Escape" && menuOpen) {
      e.preventDefault();
      closeMenu();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const v = value;
      setValue("");
      run(v);
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Prefer re-focusing the latest option list when prompt is empty / idle
      if (!value.trim() && focusLatestList()) return;
      openCompletions();
    } else if (e.key === "ArrowRight" && suggestion && isCaretAtEnd(e.currentTarget)) {
      e.preventDefault();
      setValue(applySuggestion(value, suggestion));
      haptics.select();
    } else if (e.key === "ArrowUp" && !menuOpen) {
      e.preventDefault();
      if (!history.length) return;
      if (histIdx.current === -1) draft.current = value;
      histIdx.current = Math.min(histIdx.current + 1, history.length - 1);
      setValue(history[history.length - 1 - histIdx.current] ?? "");
      haptics.select();
    } else if (e.key === "ArrowDown" && !menuOpen) {
      e.preventDefault();
      // At live prompt (not browsing history) → re-enter latest option list
      if (histIdx.current === -1) {
        focusLatestList();
        return;
      }
      if (histIdx.current <= 0) {
        histIdx.current = -1;
        setValue(draft.current);
        haptics.select();
      } else {
        histIdx.current -= 1;
        setValue(history[history.length - 1 - histIdx.current] ?? "");
        haptics.select();
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([]);
      haptics.tap();
    } else if (e.key.length === 1 || e.key === "Backspace") {
      // typing closes menu so results refresh on next Tab
      if (menuOpen) closeMenu();
    }
  };

  return (
    <Shell
      fill
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("a, button, input, textarea, select")) return;
        // Touch: only focus when the prompt row itself is tapped
        if (isCoarseOrNarrow() && !t.closest(".ragab-prompt-wrap")) return;
        focusPrompt();
      }}
    >
      <Titlebar
        path={
          <>
            <strong>ahmed</strong>@ragab.dev — zsh
          </>
        }
        badge={activeTheme}
        actions={
          <>
            <button
              type="button"
              className="ragab-settings-btn"
              aria-label="Exit terminal — open browse mode"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBrowse();
              }}
            >
              browse
            </button>
            <button
              type="button"
              className="ragab-settings-btn"
              aria-label="Open settings"
              onClick={(e) => {
                e.stopPropagation();
                run("settings");
                focusPrompt();
              }}
            >
              set
            </button>
          </>
        }
      />
      <Output ref={outputRef} aria-label="Terminal output">
        {lines.map((l) =>
          l.kind === "prose" ? (
            <article key={l.id} className="ragab-article">
              {!l.bare ? (
                <>
                  <Line tone="bright" animate={shouldAnimate(l.id)}>
                    {l.title}
                  </Line>
                  <div className="ragab-article__meta">
                    <span className="ragab-text--gold">{l.date}</span>
                    {l.tags?.length ? (
                      <span className="ragab-text--foam">{`  ·  ${l.tags.join(" · ")}`}</span>
                    ) : null}
                    <span className="ragab-text--dim">{`  ·  ${l.slug}`}</span>
                    {"  ·  "}
                    <button
                      type="button"
                      className="ragab-hint-cmd"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.nav();
                        window.open(`/blog/${l.slug}`, "_self");
                      }}
                    >
                      open route
                    </button>
                  </div>
                  <hr className="ragab-article__rule" />
                </>
              ) : null}
              <Suspense
                fallback={
                  <div className="ragab-prose__loading" role="status">
                    loading post…
                  </div>
                }
              >
                <TerminalProse source={l.source} />
              </Suspense>
              {!l.bare ? <hr className="ragab-article__rule" /> : null}
            </article>
          ) : l.echo ? (
            <PromptEcho key={l.id} cmd={l.text} />
          ) : l.href ? (
            <a
              key={l.id}
              href={l.href}
              data-ragab-option={l.id}
              className={`ragab-line ragab-text ragab-line--link${
                shouldAnimate(l.id) ? " ragab-line--animate" : ""
              }${l.tone && l.tone !== "default" ? ` ragab-text--${l.tone}` : ""}`}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                haptics.nav();
              }}
              onKeyDown={onOptionKeyDown}
            >
              <OutputText text={l.text || " "} />
            </a>
          ) : l.action ? (
            <button
              key={l.id}
              type="button"
              data-ragab-option={l.id}
              data-theme-preview={l.themePreview || undefined}
              data-ragab-volume={l.volume ? "1" : undefined}
              className={`ragab-line ragab-text ragab-line--action${
                shouldAnimate(l.id) ? " ragab-line--animate" : ""
              }${l.tone && l.tone !== "default" ? ` ragab-text--${l.tone}` : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                // Commit via action (theme X persists); clear preview flag first
                cancelPreview();
                run(l.action!);
              }}
              onKeyDown={onOptionKeyDown}
              onFocus={onOptionFocus}
              onBlur={onOptionBlur}
            >
              <OutputText text={l.text || " "} />
            </button>
          ) : (
            <Line key={l.id} tone={l.tone} animate={shouldAnimate(l.id)}>
              <OutputText text={l.text || " "} />
            </Line>
          ),
        )}
      </Output>
      <div className="ragab-prompt-wrap">
        <CompletionMenu
          id="ragab-completion"
          open={menuOpen}
          title={menuResult?.title}
          items={menuResult?.items ?? []}
          activeIndex={menuIndex}
          onActiveChange={setMenuIndex}
          onSelect={selectCompletionStable}
          onClose={closeMenu}
        />
        <p id="ragab-cmd-help" className="sr-only">
          Type a command and press Enter. Tab opens completions. Arrow keys move through history or
          the completion menu. Escape closes menus or returns focus to the prompt.
        </p>
        <PromptRow
          vimMode={settings.vim ? vimMode : null}
          tokens={inputTokens}
          suggestion={
            settings.suggest && (!settings.vim || vimMode === "insert") ? suggestion : undefined
          }
          onAcceptSuggestion={() => {
            if (!suggestion) return;
            setValue(applySuggestion(value, suggestion));
            haptics.select();
            focusPrompt();
          }}
          inputProps={{
            ref: inputRef as Ref<HTMLInputElement>,
            value,
            onChange: (e) => {
              if (settings.vim && vimMode === "normal") return;
              if (e.target.value.length > value.length) haptics.type();
              setValue(e.target.value);
            },
            onKeyDown,
            readOnly: settings.vim && vimMode === "normal",
            "aria-describedby": "ragab-cmd-help",
            "aria-expanded": menuOpen,
            "aria-controls": "ragab-completion",
            "aria-activedescendant": menuOpen ? `ragab-completion-opt-${menuIndex}` : undefined,
            "aria-autocomplete": "list",
          }}
        />
      </div>
      <div className="ragab-dock" role="toolbar" aria-label="Quick commands">
        {DOCK_COMMANDS.map((item) => (
          <button
            key={item.cmd}
            type="button"
            className="ragab-dock__btn"
            aria-label={`Run ${item.label}`}
            onClick={(e) => {
              e.stopPropagation();
              run(item.cmd);
              focusPrompt();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Hint
        commands={[
          "browse",
          "tour",
          "help",
          "blogs",
          "settings",
          "theme list",
          settings.vim ? "set vim off" : "set vim on",
        ]}
        onRun={(cmd) => {
          run(cmd);
          focusPrompt();
        }}
      />
    </Shell>
  );
}

export function TerminalApp(props: TerminalAppProps) {
  const boot = props.boot ?? { mode: "home" as const };
  const forceTerminal = boot.mode !== "home";
  // null until layout: avoid painting the wrong mode before localStorage.
  const [mode, setMode] = useState<UiMode | null>(forceTerminal ? "terminal" : null);

  useLayoutEffect(() => {
    if (forceTerminal) {
      setMode("terminal");
      return;
    }
    setMode(loadUiMode());
  }, [forceTerminal]);

  const setUiMode = useCallback((next: UiMode) => {
    persistUiMode(next);
    setMode(next);
    announce(next === "browse" ? "Browse mode" : "Terminal mode");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (next === "browse") {
          focusEl(document.getElementById("browse-name"));
          return;
        }
        if (isCoarseOrNarrow()) return;
        focusEl(document.querySelector<HTMLInputElement>(".ragab-input"));
      });
    });
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="ragab-shell-stage" data-ui-mode={mode ?? undefined}>
          {mode === null ? null : mode === "browse" ? (
            <BrowseApp blogs={props.blogs} onOpenTerminal={() => setUiMode("terminal")} />
          ) : (
            <TerminalInner {...props} boot={boot} onOpenBrowse={() => setUiMode("browse")} />
          )}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}

function isCaretAtEnd(el: HTMLInputElement): boolean {
  return el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
}

type Ctx = {
  blogs: ContentItem[];
  announcements: ContentItem[];
  theme: ThemeName;
  setTheme: (name: string) => ThemeName | null;
  randomTheme: () => ThemeName;
  resetTheme: () => ThemeName;
  settings: ShellSettings;
  updateSettings: (patch: Partial<ShellSettings>, quiet?: boolean) => void;
  /** Vibration API available on this device? */
  hapticsSupported: boolean;
};

function handleCommand(key: string, args: string[], ctx: Ctx): Draft[] | null {
  switch (key) {
    case "help":
      return helpLines(ctx.settings);
    case "whoami":
    case "about":
    case "me":
      return [
        { text: site.name, tone: "bright" },
        {
          text: `${site.role} · ${site.location} · ● ${site.status}`,
          tone: "gold",
        },
        { text: "" },
        ...site.bio.map((l) => ({ text: l, tone: "foam" as const })),
        ...(site.experience?.length
          ? [
              { text: "" },
              { text: "work history", tone: "gold" as const },
              ...site.experience.map((e) => ({
                text: `  ${e.role} @ ${e.org}${e.period ? `  ·  ${e.period}` : ""}`,
                tone: "muted" as const,
              })),
            ]
          : []),
        { text: "" },
        { text: "stack · projects · contact for more", tone: "dim" },
      ];
    case "tour":
      return tourLines();
    case "status": {
      const time = new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Cairo",
      });
      return [
        { text: `● ${site.status}  /  ${time} · ${site.location}`, tone: "ok" },
        { text: "open to interesting work · remote-friendly", tone: "accent" },
      ];
    }
    case "bio":
      return site.bio.map((l) => ({ text: l, tone: "foam" as const }));
    case "stack":
    case "tech":
    case "skills":
      return site.stack.map((l) => ({ text: l, tone: "gold" as const }));
    case "projects":
    case "work":
      return site.projects.flatMap((p, i) => [
        ...(i ? [{ text: "" }] : []),
        { text: `→ ${p.name}`, tone: "bright" as const },
        { text: `  ${p.description}`, tone: "muted" as const },
        ...(p.tech?.length ? [{ text: `  ${p.tech.join(" · ")}`, tone: "gold" as const }] : []),
        ...(p.url ? [{ text: `  ${p.url}`, tone: "foam" as const, href: p.url }] : []),
      ]);
    case "blogs":
    case "posts":
      return listBlogs(ctx.blogs);
    case "blog":
    case "post":
    case "read":
      return readBlog(args[0], ctx.blogs);
    case "announcements":
    case "announce":
    case "news":
      return listAnnouncements(ctx.announcements);
    case "contact":
      return [
        { text: "contact  ·  click a row to open", tone: "bright" },
        { text: "" },
        {
          text: `email     ${site.contact.email}`,
          href: `mailto:${site.contact.email}`,
        },
        ...(site.contact.github
          ? [
              {
                text: `github    ${site.contact.github}`,
                href: site.contact.github.startsWith("http")
                  ? site.contact.github
                  : `https://${site.contact.github}`,
              },
            ]
          : []),
        ...(site.contact.twitter
          ? [
              {
                text: `x         ${site.contact.twitter}`,
                href: site.contact.twitter.startsWith("http")
                  ? site.contact.twitter
                  : `https://${site.contact.twitter}`,
              },
            ]
          : []),
        ...(site.contact.linkedin
          ? [
              {
                text: `linkedin  ${site.contact.linkedin}`,
                href: site.contact.linkedin.startsWith("http")
                  ? site.contact.linkedin
                  : `https://${site.contact.linkedin}`,
              },
            ]
          : []),
        { text: "" },
        { text: "prefer email for anything real.", tone: "dim" },
      ];
    case "theme":
      return themeCommand(args, ctx);
    case "settings":
      return settingsLines(ctx.settings, ctx.hapticsSupported);
    case "set":
      return setCommand(args, ctx);
    case "volume":
      return volumeCommand(args, ctx);
    case "ls":
      return [
        "tour",
        "browse",
        "whoami",
        "status",
        "bio",
        "stack",
        "projects",
        "blogs",
        "announcements",
        "contact",
        "theme",
        "settings",
        "volume",
      ].map((n) => ({ text: `drwxr-xr-x  ${n}` }));
    case "neofetch":
      return [
        {
          text: `       .--.        ${site.name.toLowerCase().replace(/\s+/g, "")}@ragab.dev`,
          tone: "bright",
        },
        { text: "      |o_o |       ---------------" },
        {
          text: `      |:_/ |       OS:     human / ${site.location.toLowerCase()}`,
        },
        { text: "     //   \\ \\      Host:   ragab.dev" },
        { text: "    (|     | )     Kernel: curiosity 0.9" },
        { text: "   /'\\_   _/`\\     Shell:  classic-terminal" },
        { text: `   \\___)=(___/     Theme:  ${ctx.theme}` },
        {
          text: `                   Vim:    ${ctx.settings.vim ? "on" : "off"}`,
        },
        { text: `                   Blogs:  ${ctx.blogs.length}` },
      ];
    case "clear":
      return null;
    default:
      return [
        { text: `command not found: ${key}`, tone: "err" },
        {
          text: "help for commands · browse for the page view · tour for a walkthrough",
          tone: "dim",
        },
      ];
  }
}

function tourLines(): Draft[] {
  const steps: { label: string; desc: string; cmd: string }[] = [
    { label: "whoami", desc: "who i am — role, bio, work history", cmd: "whoami" },
    { label: "projects", desc: "selected work — ai tooling, web, rust", cmd: "projects" },
    { label: "blogs", desc: "writing on ai + web", cmd: "blogs" },
    {
      label: "theme list",
      desc: "66 palettes — focus a row to preview, enter to set",
      cmd: "theme list",
    },
    { label: "settings", desc: "vim, suggestions, auto-copy, haptics, volume", cmd: "settings" },
    { label: "contact", desc: "email · github · x · linkedin", cmd: "contact" },
  ];
  return [
    { text: "tour — a 20s walkthrough · click any try row", tone: "bright" },
    { text: "" },
    ...steps.flatMap((s, i): Draft[] => {
      const rows: Draft[] = [
        { text: `${i + 1}/6  ${s.label}`, tone: "gold" },
        { text: `     ${s.desc}`, tone: "muted" },
        { text: `     → try: ${s.cmd}`, action: s.cmd, tone: "accent" },
      ];
      if (i < steps.length - 1) rows.push({ text: "" });
      return rows;
    }),
    { text: "" },
    {
      text: "power moves: Tab = chooser · ↑↓ = history · browse opens the page view · ctrl+l clears",
      tone: "dim",
    },
  ];
}

function helpLines(settings: ShellSettings): Draft[] {
  return [
    { text: "ragab.dev — classic terminal", tone: "bright" },
    { text: "new here? tour takes 20 seconds · browse opens the page view", tone: "accent" },
    { text: "" },
    { text: "identity", tone: "gold" },
    { text: "  whoami · status · bio · stack · projects", tone: "foam" },
    { text: "" },
    { text: "content", tone: "gold" },
    { text: "  blogs · blog <slug> · announcements · contact", tone: "foam" },
    { text: "  Tab after blog / theme / set opens a chooser popup", tone: "accent" },
    { text: "" },
    { text: "theme & settings", tone: "gold" },
    { text: "  theme list · theme <name> · theme random", tone: "foam" },
    {
      text: "  settings · set vim|suggest|autocopy|haptics on|off · volume <0-100>",
      tone: "foam",
    },
    { text: "" },
    { text: "shell", tone: "gold" },
    { text: "  browse · clear · ls · neofetch · help · Tab = chooser", tone: "foam" },
    { text: "" },
    {
      text: `vim: ${settings.vim ? "on (esc=normal, i=insert)" : "off"} · haptics: ${
        settings.haptics ? "on" : "off"
      } · volume: ${settings.volume}% · select text to copy`,
      tone: "dim",
    },
  ];
}

function settingsLines(s: ShellSettings, hapticsSupported = true): Draft[] {
  // Whole-line tone left neutral so OutputText can highlight keys / on|off finely
  return [
    { text: "settings  ·  click a row to toggle", tone: "bright" },
    { text: "" },
    {
      text: `  vim        ${s.vim ? "on" : "off"}  ·  click to toggle`,
      action: `set vim ${s.vim ? "off" : "on"}`,
    },
    {
      text: `  suggest    ${s.suggest ? "on" : "off"}  ·  click to toggle`,
      action: `set suggest ${s.suggest ? "off" : "on"}`,
    },
    {
      text: `  autocopy   ${s.autoCopy ? "on" : "off"}  ·  click to toggle`,
      action: `set autocopy ${s.autoCopy ? "off" : "on"}`,
    },
    {
      text: `  haptics    ${s.haptics ? "on" : "off"}  ·  click to toggle`,
      action: `set haptics ${s.haptics ? "off" : "on"}`,
    },
    {
      text: volumeRowText(s.volume),
      action: volumeRowAction(s.volume),
      volume: true,
    },
    { text: "" },
    { text: "persisted in localStorage · Tab also opens choosers", tone: "dim" },
    ...(hapticsSupported
      ? []
      : [
          {
            text: "note: this device can't vibrate — desktop plays click sounds instead",
            tone: "dim" as const,
          },
        ]),
  ];
}

function setCommand(args: string[], ctx: Ctx): Draft[] {
  const key = (args[0] || "").toLowerCase();
  const raw = (args[1] || "").toLowerCase();
  const on = raw === "on" || raw === "true" || raw === "1" || raw === "yes";
  const off = raw === "off" || raw === "false" || raw === "0" || raw === "no";

  if (!key) {
    return [
      {
        text: "usage: set <vim|suggest|autocopy|haptics> <on|off> · volume <0-100>",
        tone: "gold",
      },
      ...settingsLines(ctx.settings, ctx.hapticsSupported),
    ];
  }

  if (!on && !off) {
    return [{ text: `usage: set ${key} on|off`, tone: "err" }];
  }

  const value = on;
  if (key === "vim") {
    ctx.updateSettings({ vim: value });
    return [{ text: `vim → ${value ? "on" : "off"}`, tone: "ok" }];
  }
  if (key === "suggest" || key === "suggestion" || key === "autosuggest") {
    ctx.updateSettings({ suggest: value });
    return [{ text: `suggest → ${value ? "on" : "off"}`, tone: "ok" }];
  }
  if (key === "autocopy" || key === "copy" || key === "auto-copy") {
    ctx.updateSettings({ autoCopy: value });
    return [{ text: `autocopy → ${value ? "on" : "off"}`, tone: "ok" }];
  }
  if (key === "haptics" || key === "vibrate" || key === "vibration") {
    ctx.updateSettings({ haptics: value });
    return [{ text: `haptics → ${value ? "on" : "off"}`, tone: "ok" }];
  }

  return [
    { text: `unknown setting: ${key}`, tone: "err" },
    {
      text: "keys: vim · suggest · autocopy · haptics — volume is 0-100, use volume <n>",
      tone: "dim",
    },
  ];
}

/** 0-100 → 20-cell █/░ bar for terminal volume display. */
function volumeBar(v: number): string {
  const level = Math.round(v / 5);
  return "█".repeat(level) + "░".repeat(20 - level);
}

/** Shared label for interactive volume rows (settings panel + volume output). */
function volumeRowText(v: number): string {
  return `volume  ${v}%  ${volumeBar(v)}  ·  ← → adjust`;
}

/** Click cycles 0 → 25 → … → 100 → 0; arrows scrub ±10. */
function volumeRowAction(v: number): string {
  return `volume ${v >= 100 ? 0 : v + 25}`;
}

function volumeCommand(args: string[], ctx: Ctx): Draft[] {
  const raw = (args[0] || "").toLowerCase();
  const current = ctx.settings.volume;

  if (!raw) {
    return [
      {
        text: volumeRowText(current),
        tone: "bright",
        action: volumeRowAction(current),
        volume: true,
      },
      { text: "usage: volume <0-100> · volume up|down · volume off|on", tone: "dim" },
    ];
  }

  let next: number;
  if (raw === "up" || raw === "+") next = Math.min(100, current + 10);
  else if (raw === "down" || raw === "-") next = Math.max(0, current - 10);
  else if (raw === "off" || raw === "mute") next = 0;
  else if (raw === "on") next = current > 0 ? current : 50;
  else {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return [{ text: "usage: volume <0-100> · volume up|down · volume off|on", tone: "err" }];
    }
    next = Math.max(0, Math.min(100, Math.round(n)));
  }

  ctx.updateSettings({ volume: next });
  return [
    { text: `volume → ${next}%  ${volumeBar(next)}`, tone: "ok" },
    {
      text: next === 0 ? "muted — haptics silent" : "sound level updated",
      tone: "dim",
    },
  ];
}

function listBlogs(blogs: ContentItem[]): Draft[] {
  const lines: Draft[] = [
    {
      text: `blog  (${blogs.length} posts)  ·  click · or Tab after "blog "`,
      tone: "bright",
    },
    { text: "" },
  ];
  for (const p of blogs) {
    lines.push({
      text: `→ ${p.date}  ${p.slug}`,
      tone: "gold",
      action: `blog ${p.slug}`,
    });
    lines.push({
      text: `  ${p.title}`,
      tone: "foam",
      action: `blog ${p.slug}`,
    });
    if (p.excerpt) {
      lines.push({
        text: `  ${p.excerpt}`,
        tone: "muted",
        action: `blog ${p.slug}`,
      });
    }
    if (p.tags?.length) {
      lines.push({
        text: `  #${p.tags.join(" #")}`,
        tone: "accent",
        action: `blog ${p.slug}`,
      });
    }
    lines.push({ text: "" });
  }
  lines.push({
    text: "tip: Tab opens a chooser for any command with choices",
    tone: "dim",
  });
  return lines;
}

function findBlog(slug: string | undefined, blogs: ContentItem[]): ContentItem | undefined {
  if (!slug) return undefined;
  const q = slug.toLowerCase();
  return blogs.find((p) => p.slug === q || p.slug.startsWith(q) || p.slug.includes(q));
}

function readBlog(slug: string | undefined, blogs: ContentItem[]): Draft[] {
  if (!slug) {
    return [
      { text: "usage: blog <slug>", tone: "gold" },
      { text: "type blogs to list", tone: "dim" },
    ];
  }
  const post = findBlog(slug, blogs);
  if (!post) {
    return [
      { text: `post not found: ${slug}`, tone: "err" },
      { text: "type blogs to list slugs", tone: "dim" },
    ];
  }
  if (!post.body) {
    // Body stripped from island props — post route carries the full MDX
    if (typeof window !== "undefined") {
      window.location.assign(`/blog/${post.slug}`);
    }
    return [
      {
        text: `opening /blog/${post.slug}…`,
        tone: "dim",
      },
    ];
  }
  return [
    {
      kind: "prose",
      title: post.title,
      date: post.date,
      tags: post.tags,
      slug: post.slug,
      source: post.body,
    },
  ];
}

function listAnnouncements(items: ContentItem[]): Draft[] {
  const sorted = items.toSorted((a, b) => {
    if (!!a.pinned === !!b.pinned) return b.date.localeCompare(a.date);
    return a.pinned ? -1 : 1;
  });
  const lines: Draft[] = [{ text: "announcements", tone: "bright" }, { text: "" }];
  for (const a of sorted) {
    lines.push({
      text: `${a.pinned ? "●" : "○"} ${a.title}${a.pinned ? " ✦" : ""}`,
      tone: a.pinned ? "gold" : "accent",
    });
    lines.push({ text: `${a.date}  ·  ${a.slug}`, tone: "dim" });
    if (a.body?.trim()) {
      lines.push({
        kind: "prose",
        title: a.title,
        date: a.date,
        slug: a.slug,
        source: a.body,
        bare: true,
      });
    }
    lines.push({ text: "" });
  }
  return lines;
}

function themeCommand(args: string[], ctx: Ctx): Draft[] {
  const sub = (args[0] || "").toLowerCase();
  if (!sub) {
    return [
      { text: `theme  ${ctx.theme}`, tone: "bright" },
      { text: `${themeNames.length} themes available`, tone: "dim" },
      {
        text: "theme list · theme <name> · theme random · theme reset",
        tone: "muted",
      },
    ];
  }
  if (sub === "list" || sub === "ls") {
    const lines: Draft[] = [
      {
        text: `themes  (${themeNames.length})  ·  focus = preview · enter/click = set`,
        tone: "bright",
      },
      { text: "" },
    ];
    for (const n of themeNames) {
      const label = n === ctx.theme ? `● ${n}` : `○ ${n}`;
      lines.push({
        text: `  ${label}`,
        tone: n === ctx.theme ? "accent" : "muted",
        action: `theme ${n}`,
        themePreview: n,
      });
    }
    lines.push({ text: "" });
    lines.push({
      text: "esc cancels preview  ·  theme random / theme reset",
      tone: "dim",
      action: "theme random",
    });
    return lines;
  }
  if (sub === "random" || sub === "rand") {
    const next = ctx.randomTheme();
    return [{ text: `theme → ${next}`, tone: "ok" }];
  }
  if (sub === "reset" || sub === "default") {
    ctx.resetTheme();
    return [{ text: `theme → ${DEFAULT_THEME}`, tone: "ok" }];
  }
  const name = args.join("-").replace(/-+/g, "-");
  const applied = ctx.setTheme(name);
  if (!applied) {
    const near = themeNames.filter((n) => n.includes(sub)).slice(0, 5);
    return [
      { text: `unknown theme: ${name}`, tone: "err" },
      near.length
        ? { text: `did you mean: ${near.join(", ")}`, tone: "dim" }
        : { text: "type theme list", tone: "dim" },
    ];
  }
  return [{ text: `theme → ${applied}`, tone: "ok" }];
}
