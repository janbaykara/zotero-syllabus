# Zotero Syllabus documentation site

Astro [Starlight](https://starlight.astro.build/) site for the plugin landing page and user docs.

**Live URL (GitHub Pages):** https://janbaykara.github.io/zotero-syllabus/

## Develop

From the repo root:

```bash
pnpm docs:dev
```

Or inside this folder: `pnpm install` then `pnpm dev`.

Open **http://localhost:4321/zotero-syllabus/** (the `base` path is required for project Pages).

## Build

```bash
pnpm docs:build
```

Output is `website/dist`. Deployed by [`.github/workflows/docs.yml`](../.github/workflows/docs.yml) on pushes to `main` that touch `website/` (or `src/api.ts`).

### API reference (starlight-typedoc)

[`astro.config.mjs`](astro.config.mjs) uses [starlight-typedoc](https://starlight-typedoc.vercel.app/) to generate docs from [`../src/api.ts`](../src/api.ts) into `src/content/docs/api/` (gitignored; regenerated on every `dev` / `build`). **Reference → API** links to the single `syllabusApi` page (intro + method list). Root `pnpm install` is required so TypeDoc can resolve `zotero-types` via the plugin tsconfig.

### First-time GitHub Pages setup

1. Repo **Settings → Pages → Build and deployment → Source**: **GitHub Actions**.
2. Merge a change under `website/` (or run the **Docs** workflow manually).
3. After the first successful deploy, the site is at `https://janbaykara.github.io/zotero-syllabus/`.

`astro.config.mjs` sets `site` and `base: '/zotero-syllabus'` for project pages. For a custom domain later, set `base: '/'` and add a `public/CNAME`.

### Cloudflare Web Analytics

The site is on GitHub Pages, so analytics uses Cloudflare’s [JS snippet](https://developers.cloudflare.com/web-analytics/get-started/) (not automatic edge injection).

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/web-analytics), add a site for `https://janbaykara.github.io/zotero-syllabus/` and copy the site token.
2. Repo **Settings → Secrets and variables → Actions**: create `CLOUDFLARE_WEB_ANALYTICS_TOKEN` with that token.
3. Re-run the **Docs** workflow (or push a docs change). The build injects the beacon when `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is set.

Local preview with analytics: `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN=… pnpm docs:dev` (from the repo root). The token is a public site identifier embedded in page HTML, not a dashboard credential.
