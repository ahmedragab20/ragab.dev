/**
 * Generate tokens.css from palettes.ts so every theme is available as
 * [data-theme="…"] before React boots (no FOUC on reload).
 *
 *   pnpm --filter @ragab/themes gen:css
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const { palettes, DEFAULT_THEME } = await import(
  join(root, "../src/palettes.ts")
);

const TOKEN_KEYS = [
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
];

const shared = `/**
 * Theme tokens — generated from palettes.ts (do not edit by hand).
 * Run: pnpm --filter @ragab/themes gen:css
 *
 * Shared scale lives on :root; each palette is [data-theme="…"] so the
 * blocking boot script can set dataset.theme before first paint (no FOUC).
 */
:root {
  /* spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* type — JetBrains Mono is the app typeface */
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --font-sans: var(--font-mono);
  --font-body: var(--font-mono);
  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.875rem;
  --text-md: 1rem;
  --leading: 1.55;

  /* motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-fast: 120ms;
  --dur-med: 280ms;
  --dur-slow: 450ms;

  /* TUI: no soft rounding — 0, with 1px used only for hairline borders */
  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
  --border-w: 1px;
}
`;

function block(name, tokens, alsoRoot = false) {
  const sel = alsoRoot
    ? `:root,\n[data-theme="${name}"]`
    : `[data-theme="${name}"]`;
  const body = TOKEN_KEYS.map((k) => `  --${k}: ${tokens[k]};`).join("\n");
  return `${sel} {\n${body}\n}\n`;
}

let css = shared + "\n";
for (const [name, tokens] of Object.entries(palettes)) {
  css += "\n" + block(name, tokens, name === DEFAULT_THEME);
}

const out = join(root, "../src/tokens.css");
writeFileSync(out, css);
console.log(
  `wrote tokens.css (${Object.keys(palettes).length} themes, ${css.length} bytes)`,
);
