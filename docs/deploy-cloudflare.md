# Deploy to Cloudflare

Production target: **ragab.dev**

| App | Cloudflare product | Project / worker name |
| --- | --- | --- |
| `apps/web` (Astro) | **Pages** | `ragab-web` |
| `apps/api` (Hono) | **Workers** | `ragab-api` |

CI: GitHub Actions  
- `.github/workflows/ci.yml` — lint + build on PR / push  
- `.github/workflows/deploy.yml` — deploy on push to `main` (and manual run)

---

## 1. Cloudflare account

1. Create / log in at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Note your **Account ID** (sidebar → any domain or Workers overview → copy Account ID).

---

## 2. Add the domain `ragab.dev` (if not already)

1. Cloudflare → **Add a site** → enter `ragab.dev`.
2. Choose a plan (Free is fine).
3. At your registrar, set Cloudflare **nameservers** (shown in the dashboard).
4. Wait until status is **Active**.

You can attach custom domains before or after the first deploy; Pages/Workers will use `*.pages.dev` / `*.workers.dev` until then.

---

## 3. Create an API token (for GitHub Actions)

1. My Profile → **API Tokens** → **Create Token**.
2. Use template **Edit Cloudflare Workers**, then extend permissions:

| Permission | Access |
| --- | --- |
| Account → **Cloudflare Pages** | Edit |
| Account → **Workers Scripts** | Edit |
| Account → **Account Settings** | Read (optional) |
| Zone → **DNS** | Edit (only if you want Wrangler to manage DNS records) |

3. **Account Resources** → include your account.  
4. **Zone Resources** → include `ragab.dev` if DNS permission is set.  
5. Create token → **copy once** (you won’t see it again).

---

## 4. Create the Pages project (first time)

Option A — **CLI** (from your machine, after `pnpm install` + web build):

```bash
cd apps/web
pnpm build
pnpm exec wrangler pages project create ragab-web --production-branch=main
# then:
pnpm exec wrangler pages deploy dist --project-name=ragab-web
```

Option B — **Dashboard**:

1. Workers & Pages → **Create** → **Pages** → **Upload assets** or connect later via Wrangler.  
2. Project name: **`ragab-web`**.

> GitHub deploys with Wrangler do **not** require connecting the Git repo inside Pages; Actions uploads the build artifact.

---

## 5. GitHub repository secrets

In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token from step 3 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from step 1 (also pinned as `account_id` in each app `wrangler.toml`) |

Optional: create a GitHub **Environment** named `production` (used by `deploy.yml`) under **Settings → Environments**, and put the secrets there instead for extra protection (required reviewers, etc.).

---

## 6. Attach custom domains

### Web → `ragab.dev` / `www.ragab.dev`

1. Cloudflare → **Workers & Pages** → **ragab-web** → **Custom domains**.  
2. Add `ragab.dev` and optionally `www.ragab.dev`.  
3. Cloudflare will create/validate DNS records automatically if the zone is on Cloudflare.

### API → `api.ragab.dev` (optional but recommended)

1. Workers & Pages → **ragab-api** → **Settings → Domains & Routes** (or Triggers → Custom Domains).  
2. Add `api.ragab.dev`.  
3. Point the web app at it later via env if needed (e.g. `PUBLIC_API_URL=https://api.ragab.dev`).

---

## 7. First deploy

### Automatic

```bash
git push origin main
```

Watch **Actions → Deploy**. On success, open:

- Pages: `https://ragab-web.<subdomain>.pages.dev` (or your custom domain)  
- Worker: `https://ragab-api.<account>.workers.dev/health`

### Manual (local)

```bash
# set token for this shell
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...

pnpm install
pnpm deploy:web   # build + pages deploy
pnpm deploy:api   # wrangler deploy
```

Or **Actions → Deploy → Run workflow**.

---

## 8. Checklist

- [ ] Domain `ragab.dev` active on Cloudflare  
- [ ] API token with Pages + Workers edit  
- [ ] GitHub secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`  
- [ ] Pages project `ragab-web` exists (created by first deploy or manually)  
- [ ] Custom domain on Pages for `ragab.dev`  
- [ ] (Optional) Worker custom domain `api.ragab.dev`  
- [ ] Push to `main` turns green in Actions  

---

## Build notes (monorepo)

- **Node** `>= 22`, **pnpm** `10.34.1` (see root `packageManager`).  
- Install from **repo root** so workspace packages (`@ragab/ui`, `@ragab/themes`, …) resolve.  
- Web build output: `apps/web/dist` (includes `_worker.js` for SSR).  
- API entry: `apps/api/src/index.ts` via Wrangler.

### Compatibility flags

`apps/web/wrangler.toml` sets `nodejs_compat` for the Astro adapter. If deploy fails with Node API errors, confirm the flag is present in the Pages project settings as well.

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `Authentication error [code: 10000]` | Token missing Pages/Workers edit, or wrong account |
| `Failed to automatically retrieve account IDs` | Token cannot list accounts. Set repo secret `CLOUDFLARE_ACCOUNT_ID` or keep `account_id` in `wrangler.toml` |
| `Project not found` | Create `ragab-web` once (step 4) or rename deploy flag to match |
| Build fails on `@ragab/ui` | Always `pnpm install` from monorepo root |
| Domain pending | Nameservers not updated / DNS still propagating |
| API CORS errors from browser | Ensure `apps/api` allows `https://ragab.dev` origin (already configured for `*.ragab.dev`) |

---

## What you do vs what CI does

| You (Cloudflare / GitHub) | CI (on `main`) |
| --- | --- |
| Domain + nameservers | `pnpm install` |
| API token + account ID secrets | Lint + build |
| First Pages project create (once) | `wrangler pages deploy` |
| Custom domains | `wrangler deploy` (API) |
| Push code | Report status on the commit |
