# Architecture

Personal site for **ragab.dev** — classic terminal UI, content-backed, edge-deployed.

## Principles

| Principle | How it shows up |
| --- | --- |
| Minimal | Few surfaces: shell, content, themes |
| Terminal-like | Prompt, commands, monospaced design system |
| Modern | Astro + React islands, edge runtime |
| Interactive | Terminal as the primary navigation |
| Creative | 50+ themes, subtle motion, content as commands |

## Stack

| Layer | Choice | Role |
| --- | --- | --- |
| Site | **Astro** + React islands | Static/SSR shell, MDX content |
| API | **Hono** (Cloudflare Workers) | Health, future APIs, theme telemetry (optional) |
| Design system | **`@ragab/ui`** + Storybook | Tokens, primitives, terminal components |
| Themes | **`@ragab/themes`** | Palette registry (rose-pine default) |
| Content | **MDX/Markdown in repo** | Blogs + announcements |
| Tooling | **oxlint**, **oxfmt** | Lint + format |
| Deploy | **Cloudflare** Pages/Workers | Edge hosting |

## Monorepo

```
ragab.dev/
├── apps/
│   ├── web/                 # Astro site (Cloudflare adapter)
│   └── api/                 # Hono Worker
├── packages/
│   ├── themes/              # Design tokens + palettes
│   ├── ui/                  # Components + Storybook
│   └── content-schema/      # Shared Zod/TS content types
├── content/                 # (or apps/web/src/content) MDX source
├── docs/
│   └── architecture.md
└── prototypes/              # Archived HTML experiments
```

## Runtime topology (Cloudflare)

```
Browser
  │
  ├─► apps/web  (Astro on CF)  ── MDX content collections
  │       │
  │       └─ React island: <Terminal />
  │              uses @ragab/ui + @ragab/themes
  │
  └─► apps/api  (Hono Worker)  ── /health, future endpoints
```

Local:

- `pnpm dev:web` → Astro `:4321`
- `pnpm dev:api` → Wrangler `:8787`
- `pnpm storybook` → design system docs

## Design system layers

1. **Tokens** (`@ragab/themes`) — CSS variables per palette  
2. **Primitives** (`@ragab/ui`) — `Box`, `Text`, `Kbd`, `Badge`, `Dot`  
3. **Terminal** — `Shell`, `Titlebar`, `Output`, `Line`, `Prompt`, `Cursor`  
4. **Motion** — subtle line-in, shell fade, theme flash (respects `prefers-reduced-motion`)  
5. **Storybook** — source of truth for visual API

## Content model

```ts
// announcement | blog  (MDX in apps/web/src/content)
{
  type: "announcement" | "blog"
  slug: string
  title: string
  date: string          // ISO date
  draft?: boolean
  pinned?: boolean      // announcements
  tags?: string[]       // blogs
  excerpt?: string
  body: MDX             // rendered in-terminal via TerminalProse
}
```

### Terminal MDX

Posts are not plain text dumps. `TerminalProse` compiles MD/MDX client-side with:

- GFM (tables, strikethrough, task lists)
- Shiki code highlighting
- Images + captions
- Shortcodes: `<YouTube />`, `<Embed />`, `<Callout />`

All styled with terminal tokens (`@ragab/ui` prose layer).

Terminal commands map to content:

| Command | Source |
| --- | --- |
| `blogs` / `blog <slug>` | `type: blog` |
| `announcements` | `type: announcement` |
| `contact` | site config |
| `theme *` | `@ragab/themes` |

### Routes = same terminal, different boot

| Route | Shell | Boot |
| --- | --- | --- |
| `/` | Terminal | home banner |
| `/blog` | Terminal | runs `blogs` |
| `/blog/[slug]` | Terminal | runs `blog <slug>` |

Announcements stay terminal-only (`announcements` command) for v1 — no dedicated routes yet.
There is **one** interactive surface; URLs only change the starting buffer so posts are shareable.

## Command surface (v1)

Identity: `whoami` `status` `bio` `stack` `projects`  
Content: `blogs` `blog` `announcements` `contact`  
Theme: `theme` `theme list` `theme <name>` `theme random` `theme reset`  
Shell: `help` `clear` `ls` `neofetch`

## Theme system

- Default: **`rose-pine`**
- Persistence: `localStorage` key `ragab.dev.theme`
- Apply: set CSS custom properties on `:root`
- Documented in Storybook under **Themes**

## What Hono owns (now vs later)

**Now:** health check, version, CORS for local web→api  
**Later:** search index, contact form, analytics events, optional content API if MDX moves off-git

## Boundaries

- `@ragab/ui` has **no** Astro dependency — pure React + CSS
- `@ragab/themes` is pure TS data — no React
- `apps/web` composes UI + loads content
- `apps/api` never imports Astro components

## Next milestones

1. ✅ Architecture + design system core  
2. Terminal commands wired to MDX collections  
3. Real site content + contact  
4. CF deploy pipelines  
5. Optional polish (SEO routes for `/blog/[slug]`, OG images)
