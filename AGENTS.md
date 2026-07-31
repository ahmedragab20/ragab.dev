# Agent notes — ragab.dev

## Repo map

- `apps/web` — Astro + React terminal site (Cloudflare)
- `apps/api` — Hono worker
- `packages/ui` — design system + Storybook
- `packages/themes` — palettes / CSS tokens
- `packages/content-schema` — Zod content types
- `docs/` — architecture + design system
- `prototypes/` — archived HTML (do not ship)

## Commands

```bash
pnpm install
pnpm dev:web | dev:api | storybook
pnpm lint | fmt | check
pnpm --filter @ragab/web build
```

## Conventions

- Terminal is the primary UX (classic shell, not multi-page chrome)
- Content lives in `apps/web/src/content/{blog,announcements}` as MD/MDX
- New visual UI goes through `@ragab/ui` + a Storybook story
- Themes only via `@ragab/themes` tokens — no hard-coded palette hex in components
- **No CSS gradients** (linear/radial/conic/repeating) — flat fills only
- **No border-radius** on chrome (1px borders, square TUI)
- oxlint + oxfmt only (no eslint/prettier)
