# ragab.dev

Classic terminal personal site — monorepo.

## Stack

| | |
| --- | --- |
| Site | Astro + React islands (Cloudflare) |
| API | Hono (Cloudflare Workers) |
| Design system | `@ragab/ui` + Storybook |
| Themes | `@ragab/themes` (rose-pine default, 60+) |
| Content | MDX/Markdown collections |
| Tooling | oxlint · oxfmt · pnpm |

## Structure

```
apps/web              Astro site + terminal
apps/api              Hono worker
packages/ui           Design system + Storybook
packages/themes       Palette tokens
packages/content-schema  Shared content types
docs/architecture.md  System design
prototypes/           Archived HTML experiments
```

## Develop

```bash
pnpm install

pnpm dev:web        # http://localhost:4321
pnpm dev:api        # http://localhost:8787
pnpm storybook      # http://localhost:6006

pnpm lint
pnpm fmt
pnpm check
```

## Deploy (Cloudflare)

CI deploys on every push to `main` (see `.github/workflows/`).

```bash
# local (needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
pnpm deploy:web
pnpm deploy:api
```

Full Cloudflare setup (domain, token, secrets, custom domains):  
**[docs/deploy-cloudflare.md](./docs/deploy-cloudflare.md)**

## Terminal commands (v1)

`help` · `whoami` · `blogs` · `blog <slug>` · `announcements` · `contact` · `theme list` · `theme <name>`

## Architecture

See [docs/architecture.md](./docs/architecture.md).
