# Agent notes

## Localization (required)

Do not add hardcoded user-visible text in TS, TSX, XHTML, or progress windows.

1. Add a kebab-case key to `addon/locale/en-US/addon.ftl` (or `preferences.ftl` / `mainWindow.ftl` for those bundles). Do not start ids with `syllabus-` (the build already prefixes them).
2. Copy the same key into **every** folder under `addon/locale/` (`de`, `pt-BR`, `es-ES`, `fr-FR`, `zh-CN`, …). German is `de`, not `de-DE`. Arabic is `ar`.
3. Look it up with `getString("the-key")` or `getString("the-key", { args: { name } })` from `src/utils/locale.ts`. Safe in Preact JSX.
4. Call `getString` at render/use time, never at module scope (`initLocale` runs at startup).
5. Do not rename stored identifiers: note title `"Syllabus"`, collection `"Reading Schedule"`, playground `"Syllabus Tour"`, plugin JSON heading.
6. Keep the product name `Zotero Syllabus` untranslated.

Details: [doc/TECHNICAL.md](doc/TECHNICAL.md#localization) and `.cursor/rules/localization.mdc`.
