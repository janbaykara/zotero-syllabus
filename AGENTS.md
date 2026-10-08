# Agent notes

## Localization (required)

Do not add hardcoded user-visible text in TS, TSX, XHTML, or progress windows.

1. Add a kebab-case key to `addon/locale/en-US/addon.ftl` (or `preferences.ftl` / `mainWindow.ftl` for those bundles). Do not start ids with `syllabus-` (the build already prefixes them).
2. Copy the same key into **every** folder under `addon/locale/` (`de`, `pt-BR`, `es-ES`, `fr-FR`, `zh-CN`, …). German is `de`, not `de-DE`. Arabic is `ar`.
3. Look it up with `getString("the-key")` or `getString("the-key", { args: { name } })` from `src/utils/locale.ts`. Safe in Preact JSX.
4. Call `getString` at render/use time, never at module scope (`initLocale` runs at startup).
5. Do not rename stored identifiers: note titles `"Syllabus"` / `"Personal Reading Order"`, collection `"Reading Schedule"`, top-level folder `"Pinned"`, playground `"Syllabus Tour"`, plugin JSON heading, Extra field `Zotero Syllabus URL`, tags `zotero-syllabus`, `zotero-syllabus-personal-reading-order`, `pinned`, `zotero-syllabus-pinned-intention`, `zotero-syllabus-pinned-collection`, `zotero-syllabus-gallery:{collectionKey}`.
6. Keep the product name `Zotero Syllabus` untranslated.

Details: [doc/TECHNICAL.md](doc/TECHNICAL.md#localization) and `.cursor/rules/localization.mdc`.

## Documentation sync (required)

Any change that affects user-facing behaviour, architecture, storage, prefs, APIs, or install/setup must update **all three** in the same change:

1. **Website** — [`website/src/content/docs/`](website/src/content/docs/) (Diátaxis how-tos / tutorials / concepts / reference; landing [`index.mdx`](website/src/content/docs/index.mdx) if the feature set changes). Sidebar: [`website/astro.config.mjs`](website/astro.config.mjs).
2. **README.md** — install overview, surface list, docs-site link, API pointers. Do not re-expand the full manual into the README.
3. **doc/TECHNICAL.md** — architecture, storage, contributor commands. Link to the website for end-user steps.

Skip only pure refactors, typo/lint-only edits, or internal CI/test churn with no behaviour or contract change. Details: `.cursor/rules/docs-sync.mdc`.

## Docs site (GitHub Pages)

User-facing docs live in [`website/`](website/) (Astro Starlight). From the repo root: `pnpm docs:dev` / `pnpm docs:build`. Deployed by [`.github/workflows/docs.yml`](.github/workflows/docs.yml) to https://janbaykara.github.io/zotero-syllabus/. Do not put end-user docs only in the README — update `website/src/content/docs/` instead. First-time Pages setup: repo Settings → Pages → Source = GitHub Actions.

## Lint / package manager

Use **pnpm** only (`pnpm-lock.yaml`). CI runs `pnpm run lint:check` with a fresh install from that lockfile. After pulling dep changes, run `pnpm install` before linting. Prefer `pnpm lint:fix` locally, then confirm with `pnpm lint:check` (what CI runs). Do not introduce `package-lock.json`. The `website/` package has its own lockfile and is ignored by root Prettier/ESLint.

## Shared UI / Zotero state (Jotai)

Cross-root and cross-view live state uses Jotai’s **default store** (no `<Provider>` on Preact roots). External mirrors (selection, prefs, syllabus notes) go through `atomFromExternal` / `atomFamilyFromExternal` in `src/modules/react-zotero-sync/jotaiExternal.ts` (`atomFamily` from `jotai-family`, not `jotai/utils`). Plugin-owned UI (e.g. syllabus assignment selection) uses plain atoms — write with `useSetAtom` / `getDefaultStore().set`, never `useState` + a sync effect. Details: [doc/TECHNICAL.md](doc/TECHNICAL.md#shared-data-layer-jotai).

## Zotero Dev MCP

Prefer the Zotero Dev MCP (`user-@introfini/mcp-server-zotero-dev`) for live verification: plugin reload, prefs, DB, logs, UI/DOM/screenshots, and scaffold serve/build. Do not guess Zotero runtime behavior when a ping/reload/screenshot/log check would settle it. Details: `.cursor/rules/zotero-mcp.mdc`.
