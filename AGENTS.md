# Agent notes

## Localization (required)

Do not add hardcoded user-visible text in TS, TSX, XHTML, or progress windows.

1. Add a kebab-case key to `addon/locale/en-US/addon.ftl` (or `preferences.ftl` / `mainWindow.ftl` for those bundles). Do not start ids with `syllabus-` (the build already prefixes them).
2. Copy the same key into **every** folder under `addon/locale/` (`de`, `pt-BR`, `es-ES`, `fr-FR`, `zh-CN`, …). German is `de`, not `de-DE`. Arabic is `ar`.
3. Look it up with `getString("the-key")` or `getString("the-key", { args: { name } })` from `src/utils/locale.ts`. Safe in Preact JSX.
4. Call `getString` at render/use time, never at module scope (`initLocale` runs at startup).
5. Do not rename stored identifiers: note titles `"Syllabus"` / `"Personal Reading Order"`, collection `"Reading Schedule"`, child folder `"Pinned"`, playground `"Syllabus Tour"`, plugin JSON heading, Extra field `Zotero Syllabus URL`, tags `zotero-syllabus`, `zotero-syllabus-personal-reading-order`, `pinned`, `zotero-syllabus-pinned-intention`, `zotero-syllabus-pinned-collection`, `zotero-syllabus-gallery:{collectionKey}`.
6. Keep the product name `Zotero Syllabus` untranslated.

Details: [doc/TECHNICAL.md](doc/TECHNICAL.md#localization) and `.cursor/rules/localization.mdc`.

## Lint / package manager

Use **pnpm** only (`pnpm-lock.yaml`). CI runs `pnpm run lint:check` with a fresh install from that lockfile. After pulling dep changes, run `pnpm install` before linting. Prefer `pnpm lint:fix` locally, then confirm with `pnpm lint:check` (what CI runs). Do not introduce `package-lock.json`.

## Shared UI / Zotero state (Jotai)

Cross-root and cross-view live state uses Jotai’s **default store** (no `<Provider>` on Preact roots). External mirrors (selection, prefs, syllabus notes) go through `atomFromExternal` / `atomFamilyFromExternal` in `src/modules/react-zotero-sync/jotaiExternal.ts` (`atomFamily` from `jotai-family`, not `jotai/utils`). Plugin-owned UI (e.g. syllabus assignment selection) uses plain atoms — write with `useSetAtom` / `getDefaultStore().set`, never `useState` + a sync effect. Details: [doc/TECHNICAL.md](doc/TECHNICAL.md#shared-data-layer-jotai).

## Zotero Dev MCP

Prefer the Zotero Dev MCP (`user-@introfini/mcp-server-zotero-dev`) for live verification: plugin reload, prefs, DB, logs, UI/DOM/screenshots, and scaffold serve/build. Do not guess Zotero runtime behavior when a ping/reload/screenshot/log check would settle it. Details: `.cursor/rules/zotero-mcp.mdc`.
