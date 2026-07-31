# Design system

Package: **`@ragab/ui`** · tokens: **`@ragab/themes`** · docs: Storybook

## Layers

```
Themes (CSS vars) → Primitives → Terminal chrome → Patterns (site)
```

| Layer | Examples |
| --- | --- |
| Tokens | `--bg`, `--fg`, `--bright`, `--accent`, spacing, type |
| Primitives | `Text`, `Kbd`, `Badge`, `Dot` |
| Terminal | `Shell`, `Titlebar`, `Output`, `Line`, `Prompt`, `PromptRow`, `Cursor`, `Hint` |
| Patterns | `ThemeProvider` / `useTheme`, full terminal shell |

## Theming

- Default: **rose-pine**
- 60+ palettes in `@ragab/themes`
- Apply via `applyTheme(name)` or `ThemeProvider`
- Persist: `localStorage` key `ragab.dev.theme`
- Storybook: paintbrush toolbar switches themes globally

## Visual rules (hard)

| Allowed | Disallowed |
| --- | --- |
| Flat solid fills (`var(--bg)`, `var(--panel)`) | **CSS gradients** (`linear-`, `radial-`, `conic-`, `repeating-*`) |
| 1px borders, `border-radius: 0` | Soft cards, heavy shadows, rounded chrome |
| Token colors only | Hard-coded palette hex in components |

No vignettes, scanline overlays, or gradient washes. TUI = flat terminal surface.

## Motion

Subtle, terminal-native:

- Shell enter (`ragab-shell-in`)
- Line stagger (`ragab-line-in`)
- Theme flash (~80ms flat wash)

All respect `prefers-reduced-motion`.

## Storybook

```bash
pnpm storybook
# Foundation / Primitives / Terminal / Patterns
```

## Consuming in Astro

```tsx
import { TerminalApp } from "../components/TerminalApp";
// client:load island using @ragab/ui
```

Do not import Astro into `@ragab/ui` — keep the package React-only.
