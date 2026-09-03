# Technical notes

This document is for people changing the plugin. End-user behaviour is in [README.md](../README.md).

Contents: [collection note](#collection-note) · [item merges](#item-merges) · [preferences](#preferences) · [Extra absorb](#item-extra-legacy-absorb) · [class folders](#class-subcollections) · [practical rules](#practical-rules) · [localization](#localization) · [reading-list connectors](#reading-list-connectors) · [local development](#local-development) · [project structure](#project-structure) · [references](#references)

A **syllabus is one Zotero collection** that you have turned into a syllabus (or that had a legacy `collectionMetadata` preference). Items in that collection are the membership. Everything else — classes, assignments, course metadata — is stored in a **collection note** so it syncs with the library. Plugin **prefs** hold UI chrome only (and leftover legacy data). **Class subcollections** are a derived, one-way view of the note.

```
                    ┌─────────────────────────────────────┐
                    │  Collection note (source of truth)  │
                    │  tag: zotero-syllabus               │
                    └──────────────┬──────────────────────┘
           writes / reads          │           drives
    ┌──────────────┴──────────┐    │    ┌──────┴──────────┐
    │  In-memory document     │    │    │  Class folders  │
    │  cache (hot-path reads) │    │    │  (one-way sync) │
    └──────────────┬──────────┘    │    └─────────────────┘
                   │               │
                   ▼               ▼
            Syllabus UI      Zotero collection tree
```

## Collection note

Each syllabus collection has a top-level note tagged `zotero-syllabus` (title `Syllabus`). The plugin treats the JSON in that note as canonical and regenerates the readable HTML around it.

The note HTML is roughly:

1. Human-readable prose (collection title, course line, class headings, citations).
2. A “Plugin data (do not edit)” heading.
3. A `<pre data-zotero-syllabus="1">` block with the JSON document.

Schema: `CollectionSyllabusDocument` in [`src/utils/schemas.ts`](../src/utils/schemas.ts) (currently **v2**). Classes are keyed by a stable `classId`; each class stores a display `number`. Assignments live under `items[itemKey]` and point at a `classId` (not at the display number). Swapping two classes only exchanges numbers; identities and folders stay put.

Reads on the UI hot path must not call `getNote()`. [`src/modules/syllabusNote.ts`](../src/modules/syllabusNote.ts) keeps an in-memory cache, rebuilt at startup and updated after writes / note notifiers. Mutations go through `mutateCollectionDocument`, which serialises writes per collection, persists the note, then syncs class folders.

UI metadata is a projection of the document (`classesToNumberKeyed`): number-keyed classes **without** `subcollectionKey`. Merging UI edits back (`mergeNumberKeyedClasses`) keeps existing class IDs and folder keys.

## Item merges

Assignments are keyed by Zotero `item.key`. When the user merges duplicates, Zotero **keeps the master’s key** and **trashes the others**. The Syllabus UI only shows live collection members and looks up `document.items[currentKey]`. If the note still stores class/priority data under the deleted key, the survivor looks unassigned and lands in **Further reading**.

Zotero does **not** fire a merge notifier with an old→new map. `removeDuplicatesMaster` is UI-only (`extraData` is null). Merge is ordinary `modify` + `trash` after the DB transaction commits. The mapping lives on the survivor as `dc:replaces` (URI of each merged-away item) — the same relation word-processor integration uses to redirect citations.

Do not confuse this with:

- `mergeNumberKeyedClasses` — merging class _records_ when UI metadata is written back.
- `remapDocumentItemKeys` — RDF **import** remapping via DOI/ISBN/title and `itemIndex`, not live library merges.

### What we do

`remapDocumentItemKeysByMap` in [`src/modules/syllabusNote.ts`](../src/modules/syllabusNote.ts) moves `items[oldKey]` onto `items[newKey]` (and `itemIndex[oldKey]` when present, without overwriting an existing survivor index entry). If both keys already have assignments, the arrays are concatenated; assignment `id`s are kept so `itemOrder` still sorts. Persist goes through `mutateCollectionDocument`, so class folders follow the remapped keys.

Two copies assigned to **different** classes stay two assignments on one item. Two copies assigned to the **same** class become two rows in that class (same as the existing “duplicate assignment” UI). We do not auto-collapse.

The remap is idempotent: applying the same `oldKey → newKey` twice is a no-op once the old key is gone.

### When it runs

Event-driven, not a poller. There is no periodic rescan of the library.

- **`item` `trash`:** if a cached syllabus note still keys the trashed item, look up `dc:replaces` for that item’s URI. Skip ordinary trash (no live survivor).
- **`item` `modify` on a live regular item:** if the item has `dc:replaces`, parse merged-away keys from those URIs and remap any that are still in cached notes. This covers sync batches where the survivor’s relations arrive after the deletion.
- **`rebuildDocumentIndex` on startup:** for each document key that does not resolve to a live regular item, try `dc:replaces` and persist remaps. Heals notes that were already broken, merges that landed while the plugin was unloaded, or a missed notifier.

Never write the syllabus note on the merge/notifier call stack; queue the persist like Extra absorb.

### Sync

There is no extra sync protocol. Zotero already syncs the trashed loser, the survivor (with `dc:replaces`), and the syllabus note as ordinary items.

- **Other computer also has this plugin:** it remaps the note before upload. This client mostly receives an already-fixed note (`item` `modify` on the note → existing `handleNoteChange`). Local remap is then a no-op.
- **Other computer does not (or an older build):** the note still keys the loser. This client remaps when the synced item objects land (`trash` and/or survivor `modify`).

### Timing

- **Local merge:** Zotero notifier after the merge DB transaction commits (the same moment the duplicate disappears from the collection). Then an async relations lookup and a note write — typically tens to a few hundred milliseconds. The item list can refresh on `trash` _before_ the note cache updates, so the survivor may sit in Further reading for that brief gap, then jump back to its class.
- **Sync-in:** remap starts as soon as Zotero applies those item changes. Wall-clock delay is Zotero’s auto-sync (on the order of ~15s idle, or immediately on manual sync) plus the same sub-second remap. We do not wait for a second sync or a restart.
- **Startup heal** is not the interactive path.

### Not handled

- Deleting an item that was never merged (no `dc:replaces`). The item is gone from the collection, so it cannot reappear in Further reading. Orphaned keys in the note are left as-is.
- Monkey-patching `Zotero.Items.merge`.

## Preferences

Prefix: `extensions.zotero.syllabus`.

**Still prefs** (see [`src/utils/prefs.ts`](../src/utils/prefs.ts) and [`addon/prefs.js`](../addon/prefs.js)): plugin enable, compact/reader mode, debug, bibliography, row colouring, WPM. Per-collection **view mode** (Items / Syllabus / Tags) is stored in `collectionViewModes`, keyed by collection id. Class folders with no saved mode inherit the parent’s mode.

**No longer prefs:** collection syllabus content used to live in `extensions.zotero.syllabus.collectionMetadata`. On startup, [`src/modules/migratePrefsToNotes.ts`](../src/modules/migratePrefsToNotes.ts) copies each remaining object that has classes into that collection’s note (and Extra assignments into the same note), then deletes that prefs entry only after a successful write. Entries with no classes are deleted without creating a note. Failed or missing collections stay in the pref and retry next launch.

## Item Extra (legacy absorb)

Older builds stored assignments in the item Extra field (`syllabus: {…}`). On item add/modify, `absorbSyllabusExtraFromItems` copies Extra into the collection named by Extra (for reading-list import, a new top-level collection), moves the item there if the Connector saved it elsewhere, and clears Extra. Absorb is skipped for class folders so folder membership cannot write back to the parent document.

## Class subcollections

After each note persist, [`src/modules/classSubcollections.ts`](../src/modules/classSubcollections.ts) makes the tree match the document:

- One child collection per class that has assigned readings, named like `Class 1: Title` (or `Week 1: …` when nomenclature is set). A reading deadline is appended (`— Friday 28th Aug`); when the class is marked done, the name ends with `✅`. Classes with no assignments do not get a folder; existing folders for those classes are removed.
- The class record stores `subcollectionKey` (Zotero collection key). It is stripped from UI metadata and preserved across number-keyed merges.
- Desired items = regular items with assignments for that `classId`. Missing items are added to the folder; extras are removed from the **folder only**. Items stay on the parent.
- User edits in a folder never update the note. Removing an item from the folder is restored on the next sync; adding a stray item is dropped. Deleting a managed folder for a class that still has assignments recreates it from the note.
- Extra child collections that are not class folders (and do not have their own syllabus note) are removed.
- This is controlled per syllabus by **Create subcollections?** in Syllabus Settings (off by default for new syllabi and for collections migrated from legacy prefs). Turning it on asks for confirmation: existing child collections become managed, extra folders can be deleted, and class-folder membership is rewritten from the note. Turning it off stops create/rename/delete; leftover folders are not removed.

On startup, folders are ensured for every syllabus that has the setting on. New folder keys are written back to the note; if keys are already present, only membership is synced.

Class-folder Syllabus view is a single-class page (same class renderer as the Reading Schedule) with a link back to the parent. Document reads/writes for a class folder resolve to the parent note (`getClassSubcollectionContext` / `resolveSyllabusRoot`). Unmanaged nested collections do not inherit that note: they are ordinary folders until turned into their own syllabus.

## Practical rules

- Do not persist hydrated `classNumber` on assignments; identity is `classId`.
- Do not call `getNote()` from render/hot paths; use the document cache.
- The plugin sandbox often has no `structuredClone`; clone documents with JSON.
- Do not call `mutateCollectionDocument` from inside a class-folder ensure that already runs inside a write (deadlock on the per-collection write queue). Folder create/rename runs in the same write as the note persist; item membership runs after.
- Do not absorb Extra, or create a syllabus note, on a class folder. Reading-list import (Talis, Leganto, KeyLinks, eReserve Plus, BLUEcloud) creates a new top-level collection instead.
- When remapping item merges, never write the syllabus note on the merge/notifier call stack; queue like Extra absorb. Do not treat item `trash` as a merge unless `dc:replaces` names a live survivor.

## Localization

User-visible UI copy lives in Mozilla Fluent files under [`addon/locale/`](../addon/locale/). Zotero picks the folder that matches the app language (`de`, `pt-BR`, `es-ES`, `fr-FR`, `ar`, …). Missing strings fall back to `en-US`.

**Never hardcode labels, placeholders, tooltips, aria-text, menus, empty states, or progress copy.** Add a kebab-case key to `addon/locale/en-US/addon.ftl` (the bundle `getString` loads), copy that key into **every** other locale folder, then look it up:

```ts
getString("page-lock");
getString("page-add-class", { args: { nomenclature, number } });
```

That works in Preact TSX (render, `title`, `placeholder`, `aria-label`) and in plain TS. Call `getString` at use/render time, not at module load — `initLocale()` in [`src/utils/locale.ts`](../src/utils/locale.ts) has not run yet.

Prefs XHTML uses `data-l10n-id` against `preferences.ftl`. Keep `{ $vars }` and Fluent attributes (`.label`) unchanged when translating.

Do **not** localize stored library identifiers: syllabus note title `Syllabus`, managed collection `Reading Schedule`, playground `Syllabus Tour`, or the “Plugin data (do not edit)” note heading. Display chrome for those concepts still goes through Fluent. The product name **Zotero Syllabus** is not translated.

## Reading-list connectors

On startup (Zotero 8+), the plugin installs Connector translators from [`addon/content/translators/`](../addon/content/translators/) via [`src/utils/translator.ts`](../src/utils/translator.ts) (`Zotero.Translators.save`, priority 320, type 4). Saving a list POSTs syllabus JSON to `/syllabus/setTalisMetadata` (alias `/syllabus/setReadingListMetadata`) and any downloaded files to `/syllabus/stashReadingListFile`. Items are tagged with `libraryCatalog` (`Talis Aspire`, `Ex Libris Leganto`, `KeyLinks`, `eReserve Plus`, or `BLUEcloud Course Lists`) plus Extra `syllabus: {…}`. `absorbSyllabusExtraFromItems` then moves them into a **new top-level collection** and attaches stashed PDFs/EPUBs before **Find Available PDFs**.

| Translator file                    | `libraryCatalog`         |
| ---------------------------------- | ------------------------ |
| `tails-aspire-custom.js`           | `Talis Aspire`           |
| `leganto-custom.js`                | `Ex Libris Leganto`      |
| `keylinks-custom.js`               | `KeyLinks`               |
| `ereserve-plus-custom.js`          | `eReserve Plus`          |
| `bluecloud-course-lists-custom.js` | `BLUEcloud Course Lists` |

Gated by `FEATURE_FLAG.TALIS_METADATA` in [`src/modules/featureFlags.ts`](../src/modules/featureFlags.ts). End-user behaviour is in the [README import section](../README.md#import-a-reading-list).

## Local development

Requires Zotero 7+ (8–10 recommended), Node.js LTS, Git, and pnpm. Built on the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template).

```bash
git clone https://github.com/janbaykara/zotero-syllabus.git
cd zotero-syllabus
pnpm install
cp .env.example .env   # set your Zotero installation path
pnpm start
```

| Command                            | Purpose                                     |
| ---------------------------------- | ------------------------------------------- |
| `pnpm start`                       | Run in development mode                     |
| `pnpm run build`                   | Production build                            |
| `pnpm test`                        | Test suite (launches Zotero)                |
| `pnpm run lint:check` / `lint:fix` | Format and lint                             |
| `pnpm run release`                 | Build the `.xpi` and prepare a distribution |

## Project structure

```
src/
├── addon.ts
├── hooks.ts
├── index.ts
├── modules/
│   ├── syllabus.ts              # Manager, view modes, columns, menus
│   ├── syllabusNote.ts          # Collection note: parse/save + in-memory cache
│   ├── classSubcollections.ts   # One-way class folders
│   ├── migratePrefsToNotes.ts   # Legacy collectionMetadata → notes
│   ├── SyllabusPage.tsx         # Syllabus (and class-folder) view
│   └── ReadingSchedule.tsx
└── utils/
    ├── schemas.ts               # CollectionSyllabusDocument and related types
    ├── prefs.ts                 # UI / plugin prefs
    └── cache.ts
```

## References

- `zotero-plugin-toolkit`
  - README: https://github.com/windingwind/zotero-plugin-toolkit
  - Docs: https://windingwind.github.io/zotero-plugin-toolkit/
- Zotero 7 plugin development guide: https://gist.github.com/EwoutH/04c8df5a97963b5b46cec9f392ceb103#file-zotero_7_plugin_dev_guide-md
- Zotero 7 plugin technical notes: https://www.zotero.org/support/dev/zotero_7_for_developers#plugin_changes
- Zotero 10 plugin technical notes: https://www.zotero.org/support/dev/zotero_10_for_developers
- https://www.zotero.org/support/kb/connector_zotero_unavailable
- Translator code API: https://github.com/zotero/translators/blob/master/index.d.ts
- Zotero server code: https://github.com/zotero/zotero/blob/47e6a0f7abaae0ad90c9f39c385fe24efd7071bf/chrome/content/zotero/xpcom/server/server_connector.js#L927
- All Zotero icons: https://github.com/zotero/zotero/tree/b3ef63859d2dbeaf595f7482a4de3d586535c10e/chrome/skin/default/zotero/16/universal
