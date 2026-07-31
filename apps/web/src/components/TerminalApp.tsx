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
import {
  DEFAULT_THEME,
  themeNames,
  type ThemeName,
} from "@ragab/themes";
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
import {
  appendHistory,
  loadHistory,
  persistHistory,
} from "../lib/history";
import {
  applyCompletion,
  applySuggestion,
  getCompletions,
  getSuggestion,
  tokenizeInput,
  type CompletionResult,
} from "../lib/suggest";

export type ContentItem = {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  pinned?: boolean;
  /** MD/MDX body — omit on home to keep the island props small. */
  body?: string;
};

export type TerminalBoot =
  | { mode: "home" }
  | { mode: "blogs" }
  | { mode: "blog"; slug: string };

export type TerminalAppProps = {
  blogs: ContentItem[];
  announcements: ContentItem[];
  boot?: TerminalBoot;
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

let lineId = 0;
const nextId = () => {
  lineId += 1;
  return lineId;
};

function materialize(entries: Draft[]): OutEntry[] {
  return entries.map((e) => {
    if (e.kind === "prose") return { ...e, id: nextId() };
    return {
      kind: "text" as const,
      id: nextId(),
      text: e.text ?? "",
      tone: e.tone,
      action: e.action,
      href: e.href,
      echo: e.echo,
      themePreview: e.themePreview,
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
  { label: "help", cmd: "help" },
  { label: "blogs", cmd: "blogs" },
  { label: "news", cmd: "announcements" },
  { label: "contact", cmd: "contact" },
  { label: "themes", cmd: "theme list" },
  { label: "settings", cmd: "settings" },
  { label: "clear", cmd: "clear" },
] as const;

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest("input, textarea, select, [contenteditable='true']"));
}

/** Boot buffer shared by SSR first paint + client (DEFAULT_THEME for hydration match). */
function buildBootLines(
  boot: TerminalBoot,
  blogs: ContentItem[],
  themeName: string,
): Draft[] {
  if (boot.mode === "home") {
    return [
      { text: "whoami", echo: true },
      { text: site.name, tone: "bright" },
      { text: `${site.role} · ${site.location}`, tone: "gold" },
      { text: "" },
      ...site.bio.map((l) => ({ text: l, tone: "foam" as const })),
      { text: "" },
      {
        text: `theme: ${themeName}  ·  ${themeNames.length} palettes`,
        tone: "dim",
      },
      {
        text: "tip: Tab for chooser · help · blogs · contact",
        tone: "accent",
      },
      { text: "" },
    ];
  }
  if (boot.mode === "blogs") {
    return [{ text: "blogs", echo: true }, ...listBlogs(blogs), { text: "" }];
  }
  return [
    { text: `blog ${boot.slug}`, echo: true },
    ...readBlog(boot.slug, blogs),
    { text: "" },
  ];
}

function TerminalInner({
  blogs,
  announcements,
  boot = { mode: "home" },
}: TerminalAppProps) {
  const {
    theme,
    activeTheme,
    setTheme,
    previewTheme,
    cancelPreview,
    randomTheme,
    resetTheme,
  } = useTheme();
  const { toast } = useToast();

  // Defaults only for SSR + first client paint — localStorage after mount
  // (avoids hydration mismatch when stored settings e.g. vim:true differ)
  const [settings, setSettingsState] = useState<ShellSettings>(DEFAULT_SETTINGS);
  // SSR the boot banner so LCP is real content (not an empty log).
  // Name uses DEFAULT_THEME for SSR/hydrate match; colors come from CSS/boot script.
  const [lines, setLines] = useState<OutEntry[]>(() =>
    materialize(buildBootLines(boot, blogs, DEFAULT_THEME)),
  );
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
  const bootMaxId = useRef(
    lines.reduce((m, l) => Math.max(m, l.id), 0),
  );
  const shouldAnimate = useCallback(
    (id: number) => id > bootMaxId.current,
    [],
  );

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
              detail: `${key}: ${next[key] ? "on" : "off"}`,
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
        return false;
      }
      setMenuResult(result);
      setMenuIndex(0);
      setMenuOpen(true);
      return true;
    },
    [value, suggestCtx, toast],
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuResult(null);
    setMenuIndex(0);
  }, []);

  const focusPrompt = useCallback(() => {
    cancelPreview();
    inputRef.current?.focus();
  }, [cancelPreview]);

  const push = useCallback((entries: Draft[]) => {
    const mat = materialize(entries);
    setLines((prev) => [...prev, ...mat]);
    return mat;
  }, []);

  /** Options from the most recent list command (after last echo). */
  const getLatestOptions = useCallback((): HTMLElement[] => {
    const root = outputRef.current;
    if (!root) return [];
    const echoes = root.querySelectorAll(".ragab-echo");
    const lastEcho = echoes[echoes.length - 1] ?? null;
    const all = [
      ...root.querySelectorAll<HTMLElement>("[data-ragab-option]"),
    ];
    if (!lastEcho) return all;
    return all.filter(
      (el) =>
        !!(
          lastEcho.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
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
      const first = entries.find(
        (e) => e.kind === "text" && (e.action || e.href),
      );
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
    el.scrollIntoView({ block: "nearest" });
    previewFromEl(el);
    return true;
  }, [getLatestOptions, previewFromEl]);

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
        return;
      }
      if (e.key === "Escape" || e.key === "q") {
        e.preventDefault();
        e.stopPropagation();
        focusPrompt(); // cancelPreview inside
      }
      // Enter / Space: native button activation → commits via action
    },
    [focusPrompt, getLatestOptions, previewFromEl],
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

  // Focus prompt after mount (boot buffer already SSR'd)
  useEffect(() => {
    inputRef.current?.focus();
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
  }, [settings.autoCopy, toast]);

  // Global type-to-focus (unless another field is focused)
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target) && e.target !== inputRef.current) return;

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
  }, [settings.vim, vimMode]);

  // Vim badge click (mouse)
  useEffect(() => {
    const onToggle = () => {
      if (!settings.vim) return;
      setVimMode((m) => {
        const next = m === "normal" ? "insert" : "normal";
        toast("vim", { detail: `${next} mode`, ms: 1200 });
        return next;
      });
      focusPrompt();
    };
    document.addEventListener("ragab:vim-toggle", onToggle);
    return () => document.removeEventListener("ragab:vim-toggle", onToggle);
  }, [settings.vim, toast, focusPrompt]);

  const run = useCallback(
    (raw: string) => {
      const input = raw.trim();
      if (!input) return;

      closeMenu();
      setHistory((h) => appendHistory(h, input));
      histIdx.current = -1;
      draft.current = "";

      push([{ text: input, echo: true }]);

      const [cmd, ...args] = input.split(/\s+/);
      const key = (cmd ?? "").toLowerCase();
      const out = handleCommand(key, args, {
        blogs,
        announcements,
        theme,
        setTheme,
        randomTheme,
        resetTheme,
        settings,
        updateSettings,
      });

      if (out === null) {
        setLines([]);
        focusPrompt();
        return;
      }
      const mat = push([...out, { text: "" }]);
      const hasOptions = mat.some(
        (e) => e.kind === "text" && (e.action || e.href),
      );
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
      push,
      randomTheme,
      resetTheme,
      setTheme,
      settings,
      theme,
      updateSettings,
    ],
  );

  const selectCompletionStable = useCallback(
    (item: CompletionItem) => {
      if (!menuResult) return;
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
    [menuResult, value, closeMenu, suggestCtx, focusPrompt],
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
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex((i) =>
          i <= 0 ? menuResult.items.length - 1 : i - 1,
        );
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
        return;
      }
      if (e.key === "a" || e.key === "I" || e.key === "A") {
        setVimMode("insert");
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
        } else {
          histIdx.current -= 1;
          setValue(history[history.length - 1 - histIdx.current] ?? "");
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
    } else if (e.key === "ArrowUp" && !menuOpen) {
      e.preventDefault();
      if (!history.length) return;
      if (histIdx.current === -1) draft.current = value;
      histIdx.current = Math.min(histIdx.current + 1, history.length - 1);
      setValue(history[history.length - 1 - histIdx.current] ?? "");
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
      } else {
        histIdx.current -= 1;
        setValue(history[history.length - 1 - histIdx.current] ?? "");
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([]);
    } else if (e.key.length === 1 || e.key === "Backspace") {
      // typing closes menu so results refresh on next Tab
      if (menuOpen) closeMenu();
    }
  };

  return (
    <Shell
      fill
      onClick={(e) => {
        // Don't steal focus from links/buttons inside output
        const t = e.target as HTMLElement;
        if (t.closest("a, button, input, textarea, select")) return;
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
        }
      />
      <Output ref={outputRef}>
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
                      <span className="ragab-text--foam">
                        {`  ·  ${l.tags.join(" · ")}`}
                      </span>
                    ) : null}
                    <span className="ragab-text--dim">{`  ·  ${l.slug}`}</span>
                    {"  ·  "}
                    <button
                      type="button"
                      className="ragab-hint-cmd"
                      onClick={(e) => {
                        e.stopPropagation();
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
              }${
                l.tone && l.tone !== "default" ? ` ragab-text--${l.tone}` : ""
              }`}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
              onClick={(e) => e.stopPropagation()}
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
              className={`ragab-line ragab-text ragab-line--action${
                shouldAnimate(l.id) ? " ragab-line--animate" : ""
              }${
                l.tone && l.tone !== "default" ? ` ragab-text--${l.tone}` : ""
              }`}
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
          open={menuOpen}
          title={menuResult?.title}
          items={menuResult?.items ?? []}
          activeIndex={menuIndex}
          onActiveChange={setMenuIndex}
          onSelect={selectCompletionStable}
          onClose={closeMenu}
        />
        <PromptRow
          vimMode={settings.vim ? vimMode : null}
          tokens={inputTokens}
          suggestion={
            settings.suggest && (!settings.vim || vimMode === "insert")
              ? suggestion
              : undefined
          }
          onAcceptSuggestion={() => {
            if (!suggestion) return;
            setValue(applySuggestion(value, suggestion));
            focusPrompt();
          }}
          inputProps={{
            ref: inputRef as Ref<HTMLInputElement>,
            value,
            onChange: (e) => {
              if (settings.vim && vimMode === "normal") return;
              setValue(e.target.value);
            },
            onKeyDown,
            readOnly: settings.vim && vimMode === "normal",
          }}
        />
      </div>
      <div className="ragab-dock" role="toolbar" aria-label="Quick commands">
        {DOCK_COMMANDS.map((item) => (
          <button
            key={item.cmd}
            type="button"
            className="ragab-dock__btn"
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
  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="ragab-shell-stage">
          <TerminalInner {...props} />
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
        { text: `${site.role} · ${site.location}`, tone: "gold" },
        { text: "" },
        ...site.bio.map((l) => ({ text: l, tone: "foam" as const })),
      ];
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
      return settingsLines(ctx.settings);
    case "set":
      return setCommand(args, ctx);
    case "ls":
      return [
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
        { text: "type 'help' for available commands.", tone: "dim" },
      ];
  }
}

function helpLines(settings: ShellSettings): Draft[] {
  return [
    { text: "ragab.dev — classic terminal", tone: "bright" },
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
      text: "  settings · set vim|suggest|autocopy on|off",
      tone: "foam",
    },
    { text: "" },
    { text: "shell", tone: "gold" },
    { text: "  clear · ls · neofetch · help · Tab = chooser", tone: "foam" },
    { text: "" },
    {
      text: `vim: ${settings.vim ? "on (esc=normal, i=insert)" : "off"} · select text to copy`,
      tone: "dim",
    },
  ];
}

function settingsLines(s: ShellSettings): Draft[] {
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
    { text: "" },
    { text: "persisted in localStorage · Tab also opens choosers", tone: "dim" },
  ];
}

function setCommand(args: string[], ctx: Ctx): Draft[] {
  const key = (args[0] || "").toLowerCase();
  const raw = (args[1] || "").toLowerCase();
  const on = raw === "on" || raw === "true" || raw === "1" || raw === "yes";
  const off = raw === "off" || raw === "false" || raw === "0" || raw === "no";

  if (!key) {
    return [
      { text: "usage: set <vim|suggest|autocopy> <on|off>", tone: "gold" },
      ...settingsLines(ctx.settings),
    ];
  }

  if (!on && !off) {
    return [
      { text: `usage: set ${key} on|off`, tone: "err" },
    ];
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

  return [
    { text: `unknown setting: ${key}`, tone: "err" },
    { text: "keys: vim · suggest · autocopy", tone: "dim" },
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

function findBlog(
  slug: string | undefined,
  blogs: ContentItem[],
): ContentItem | undefined {
  if (!slug) return undefined;
  const q = slug.toLowerCase();
  return blogs.find(
    (p) => p.slug === q || p.slug.startsWith(q) || p.slug.includes(q),
  );
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
  const lines: Draft[] = [
    { text: "announcements", tone: "bright" },
    { text: "" },
  ];
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
