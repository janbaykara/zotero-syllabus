# Docs site agents

Astro Starlight app for https://janbaykara.github.io/zotero-syllabus/

- Content: `src/content/docs/` (Diátaxis: getting started, tutorials, how-to, concepts, reference)
- Config: `astro.config.mjs` (`site` + `base: '/zotero-syllabus'`)
- Styles: `src/styles/custom.css`
- From repo root: `pnpm docs:dev` / `pnpm docs:build`
- Cloudflare Web Analytics: set `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` (CI secret `CLOUDFLARE_WEB_ANALYTICS_TOKEN`); see [README.md](README.md#cloudflare-web-analytics)
