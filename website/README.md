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

Output is `website/dist`. Deployed by [`.github/workflows/docs.yml`](../.github/workflows/docs.yml) on pushes to `main` that touch `website/`.

### First-time GitHub Pages setup

1. Repo **Settings → Pages → Build and deployment → Source**: **GitHub Actions**.
2. Merge a change under `website/` (or run the **Docs** workflow manually).
3. After the first successful deploy, the site is at `https://janbaykara.github.io/zotero-syllabus/`.

`astro.config.mjs` sets `site` and `base: '/zotero-syllabus'` for project pages. For a custom domain later, set `base: '/'` and add a `public/CNAME`.
