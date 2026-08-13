import type { ReactNode } from "react";

/** Default keywords highlighted in command output (shell-like, minimal). */
const DEFAULT_COMMANDS = [
  "help",
  "browse",
  "whoami",
  "status",
  "bio",
  "stack",
  "projects",
  "blogs",
  "blog",
  "announcements",
  "announce",
  "contact",
  "theme",
  "settings",
  "set",
  "clear",
  "ls",
  "neofetch",
  "vim",
  "suggest",
  "autocopy",
  "list",
  "random",
  "reset",
];

export type OutputTextProps = {
  text: string;
  /** Extra command/keyword names to highlight. */
  keywords?: string[];
};

type HlKind =
  | "cmd"
  | "on"
  | "off"
  | "bullet"
  | "arrow"
  | "tag"
  | "path"
  | "dim";

/**
 * Minimal shell-style highlighting for a single output line.
 * Marks known commands, on/off, bullets, tags — nothing flashy.
 */
export function OutputText({ text, keywords = [] }: OutputTextProps) {
  if (!text) return " ";
  return <>{highlightLine(text, keywords)}</>;
}

function highlightLine(text: string, extra: string[]): ReactNode[] {
  const cmds = [...new Set([...DEFAULT_COMMANDS, ...extra.map((k) => k.toLowerCase())])];
  // Longer names first so "autocopy" wins over nothing overlapping
  cmds.sort((a, b) => b.length - a.length);
  const cmdAlt = cmds.map(escapeRe).join("|");

  const re = new RegExp(
    [
      `\\b(${cmdAlt})\\b`, // 1 known command / setting key
      `\\b(on)\\b`, // 2
      `\\b(off)\\b`, // 3
      `(→|▸|●|○|✦)`, // 4 bullets / arrows
      `(#[\\w-]+)`, // 5 tags
      `(\\/[\\w./-]+)`, // 6 paths-ish
      `(·)`, // 7 separator
    ].join("|"),
    "gi",
  );

  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const raw = m[0];
    let kind: HlKind | null = null;
    if (m[1]) kind = "cmd";
    else if (m[2]) kind = "on";
    else if (m[3]) kind = "off";
    else if (m[4]) kind = "arrow";
    else if (m[5]) kind = "tag";
    else if (m[6]) kind = "path";
    else if (m[7]) kind = "dim";

    if (kind) {
      nodes.push(
        <span key={`${i}-${m.index}`} className={`ragab-hl ragab-hl--${kind}`}>
          {raw}
        </span>,
      );
    } else {
      nodes.push(raw);
    }
    last = m.index + raw.length;
    i += 1;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes.length ? nodes : [text];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
