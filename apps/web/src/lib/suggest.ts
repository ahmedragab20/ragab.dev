import { themeNames } from "@ragab/themes";
import type { CompletionItem } from "@ragab/ui";

export const COMMANDS = [
  "help",
  "tour",
  "whoami",
  "status",
  "bio",
  "stack",
  "projects",
  "blogs",
  "blog",
  "announcements",
  "contact",
  "theme",
  "settings",
  "set",
  "volume",
  "clear",
  "ls",
  "neofetch",
] as const;

export const COMMAND_SET = new Set<string>(COMMANDS);

/** Commands that take further arguments (show trailing space when filled). */
const NEEDS_ARGS = new Set(["blog", "post", "read", "theme", "set", "volume"]);

export type SuggestContext = {
  blogs: { slug: string; title?: string; date?: string }[];
};

export type CompletionResult = {
  title: string;
  items: CompletionItem[];
  /** Prefix kept before the completed token (e.g. "blog ") */
  base: string;
};

/**
 * Returns the ghost suffix to show after the caret (not including typed text).
 */
export function getSuggestion(value: string, ctx: SuggestContext): string {
  const result = getCompletions(value, ctx);
  if (!result || result.items.length === 0) return "";
  const first = result.items[0]!;
  const partial = currentToken(value);
  const fill = first.value.endsWith(" ") ? first.value.trimEnd() : first.value;
  if (fill.toLowerCase().startsWith(partial) && fill.toLowerCase() !== partial) {
    return fill.slice(partial.length);
  }
  return "";
}

export function applySuggestion(value: string, suggestion: string): string {
  if (!suggestion) return value;
  return value + suggestion;
}

function currentToken(value: string): string {
  const endsWithSpace = /\s$/.test(value);
  if (endsWithSpace) return "";
  const parts = value.trimEnd().split(/\s+/);
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

/**
 * Build a chooser menu for the current input — used by Tab popup.
 * Selection always fills the input; never auto-executes.
 */
export function getCompletions(value: string, ctx: SuggestContext): CompletionResult | null {
  const raw = value;
  const endsWithSpace = /\s$/.test(raw);
  const trimmed = raw.trim();
  const parts = trimmed ? trimmed.split(/\s+/) : [];
  const cmd = (parts[0] ?? "").toLowerCase();

  // Empty or first-token command picker
  if (!trimmed || (parts.length === 1 && !endsWithSpace)) {
    const partial = cmd;

    // blog / blogs → post chooser (+ blogs command itself)
    if (partial === "blog" || partial === "blogs") {
      const posts = blogItems(ctx, "");
      if (partial === "blogs") {
        return {
          title: "blogs",
          base: "",
          items: [
            {
              value: "blogs",
              label: "blogs",
              detail: "list all posts",
              tone: "foam",
            },
            ...posts.map((p) => ({
              ...p,
              value: `blog ${p.value}`,
              label: p.label,
              detail: p.detail,
            })),
          ],
        };
      }
      return {
        title: "blog — choose a post",
        base: "blog ",
        items: posts,
      };
    }

    const matches = COMMANDS.filter((n) => !partial || n.startsWith(partial));
    if (matches.length === 0) return null;

    const items: CompletionItem[] = matches.map((n) => {
      if (NEEDS_ARGS.has(n)) {
        return {
          value: `${n} `,
          label: n,
          detail: commandDetail(n) + " · …",
          tone: commandTone(n),
        };
      }
      return {
        value: n,
        label: n,
        detail: commandDetail(n),
        tone: commandTone(n),
      };
    });

    return {
      title: "commands",
      base: "",
      items,
    };
  }

  // blog <slug?>
  if (cmd === "blog" || cmd === "post" || cmd === "read") {
    const partial = endsWithSpace ? "" : (parts[1] ?? "").toLowerCase();
    const items = blogItems(ctx, partial);
    if (items.length === 0) return null;
    return {
      title: "blog — choose a post",
      base: `${cmd} `,
      items,
    };
  }

  // theme <…>
  if (cmd === "theme") {
    const partial = endsWithSpace ? "" : (parts[1] ?? "").toLowerCase();
    const subs: CompletionItem[] = (
      [
        {
          value: "list",
          label: "list",
          detail: "show all themes",
          tone: "bright" as const,
        },
        {
          value: "random",
          label: "random",
          detail: "surprise me",
          tone: "gold" as const,
        },
        {
          value: "reset",
          label: "reset",
          detail: "rose-pine",
          tone: "accent" as const,
        },
        ...themeNames
          .filter((n) => !partial || n.includes(partial))
          .map(
            (n): CompletionItem => ({
              value: n,
              label: n,
              detail: "palette",
              tone: "foam" as const,
            }),
          ),
      ] satisfies CompletionItem[]
    ).filter((item) => !partial || item.value.includes(partial) || item.label.startsWith(partial));

    return {
      title: "theme — choose",
      base: "theme ",
      items: subs,
    };
  }

  // set <key> [on|off]
  if (cmd === "set") {
    const keys = ["vim", "suggest", "autocopy", "haptics"] as const;
    if (parts.length === 1 || (parts.length === 2 && !endsWithSpace)) {
      const partial = endsWithSpace ? "" : (parts[1] ?? "").toLowerCase();
      const keyHit = keys.find((k) => k === partial);
      if (keyHit) {
        return {
          title: `set ${keyHit}`,
          base: `set ${keyHit} `,
          items: onOffItems(),
        };
      }
      return {
        title: "set — choose option",
        base: "set ",
        items: keys
          .filter((k) => !partial || k.startsWith(partial))
          .map((k) => ({
            value: `${k} `,
            label: k,
            detail: "on | off",
            tone: "accent" as const,
          })),
      };
    }
    if (parts.length >= 2) {
      const key = parts[1]!;
      const partial = endsWithSpace ? "" : (parts[2] ?? "").toLowerCase();
      return {
        title: `set ${key}`,
        base: `set ${key} `,
        items: onOffItems().filter((i) => !partial || i.value.startsWith(partial)),
      };
    }
  }

  if (cmd === "settings") {
    return {
      title: "settings",
      base: "",
      items: [
        {
          value: "settings",
          label: "settings",
          detail: "show panel",
          tone: "bright",
        },
        {
          value: "volume",
          label: "volume",
          detail: "sound level 0-100",
          tone: "gold",
        },
        {
          value: "set vim on",
          label: "set vim on",
          detail: "enable vim keys",
          tone: "gold",
        },
        {
          value: "set vim off",
          label: "set vim off",
          detail: "disable vim",
          tone: "muted",
        },
        {
          value: "set suggest on",
          label: "set suggest on",
          tone: "ok",
        },
        {
          value: "set suggest off",
          label: "set suggest off",
        },
        {
          value: "set autocopy on",
          label: "set autocopy on",
          tone: "ok",
        },
        {
          value: "set autocopy off",
          label: "set autocopy off",
        },
        {
          value: "set haptics on",
          label: "set haptics on",
          tone: "ok",
        },
        {
          value: "set haptics off",
          label: "set haptics off",
        },
      ],
    };
  }

  // volume <level|up|down|off|on>
  if (cmd === "volume") {
    const partial = endsWithSpace ? "" : (parts[1] ?? "").toLowerCase();
    const levels = [
      { value: "up", label: "up", detail: "+10", tone: "ok" },
      { value: "down", label: "down", detail: "-10", tone: "ok" },
      { value: "off", label: "off", detail: "mute", tone: "love" },
      { value: "on", label: "on", detail: "50%", tone: "ok" },
      ...[0, 25, 50, 75, 100].map((v) => ({
        value: `${v}`,
        label: `${v}%`,
        detail: "level",
        tone: "default" as const,
      })),
    ] satisfies CompletionItem[];
    const items = levels.filter((i) => !partial || i.value.startsWith(partial));
    return {
      title: "volume — level",
      base: "volume ",
      items,
    };
  }

  return null;
}

function blogItems(ctx: SuggestContext, partial: string): CompletionItem[] {
  return ctx.blogs
    .filter(
      (b) =>
        !partial || b.slug.includes(partial) || (b.title?.toLowerCase().includes(partial) ?? false),
    )
    .map((b) => ({
      value: b.slug,
      label: b.slug,
      detail: [b.date, b.title].filter(Boolean).join(" · "),
      tone: "foam" as const,
    }));
}

function onOffItems(): CompletionItem[] {
  return [
    { value: "on", label: "on", detail: "enable", tone: "ok" },
    { value: "off", label: "off", detail: "disable", tone: "love" },
  ];
}

function commandDetail(n: string): string {
  const map: Record<string, string> = {
    help: "commands",
    tour: "walkthrough",
    whoami: "identity",
    status: "availability",
    bio: "about",
    stack: "tech",
    projects: "work",
    blogs: "all posts",
    blog: "read post",
    announcements: "news",
    contact: "reach out",
    theme: "colors",
    settings: "preferences",
    set: "toggle option",
    volume: "sound level",
    clear: "wipe screen",
    ls: "sections",
    neofetch: "sysinfo",
  };
  return map[n] ?? "";
}

function commandTone(n: string): CompletionItem["tone"] {
  if (n === "blog" || n === "blogs") return "foam";
  if (n === "theme") return "gold";
  if (n === "volume") return "gold";
  if (n === "contact" || n === "tour") return "accent";
  if (n === "clear") return "love";
  if (n === "help") return "bright";
  return "default";
}

/**
 * Apply a completion into the input only — never auto-executes.
 * Nested pickers keep a trailing space so the next Tab continues.
 */
export function applyCompletion(
  _value: string,
  result: CompletionResult,
  item: CompletionItem,
): string {
  // Full line replacements (settings shortcuts, blogs list, full "blog slug" items)
  if (!result.base) {
    return item.value;
  }

  // Argument completion: "blog " + slug, "theme " + name, etc.
  const joined = (result.base + item.value).replace(/\s+/g, " ");
  // Keep trailing space only if the item itself asked for more input
  if (item.value.endsWith(" ")) return joined;
  return joined.trimEnd();
}

/** Parse input for shell-style syntax highlighting. */
export function tokenizeInput(value: string): {
  kind: "cmd" | "arg" | "flag" | "unknown" | "space";
  text: string;
}[] {
  if (!value) return [];
  const tokens: { kind: "cmd" | "arg" | "flag" | "unknown" | "space"; text: string }[] = [];
  const re = /(\s+)|(\S+)/g;
  let m: RegExpExecArray | null;
  let index = 0;
  let cmdSeen = false;
  while ((m = re.exec(value)) !== null) {
    if (m[1]) {
      tokens.push({ kind: "space", text: m[1] });
      continue;
    }
    const word = m[2]!;
    if (!cmdSeen) {
      const known = COMMAND_SET.has(word.toLowerCase());
      tokens.push({ kind: known ? "cmd" : "unknown", text: word });
      cmdSeen = true;
    } else if (word.startsWith("-")) {
      tokens.push({ kind: "flag", text: word });
    } else {
      tokens.push({ kind: "arg", text: word });
    }
    index++;
  }
  void index;
  return tokens;
}
