# Technical notes

This document is for people changing the plugin. End-user behaviour is in [README.md](../README.md).

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

Older builds stored assignments in the item Extra field (`syllabus: {…}`). On item add/modify, `absorbSyllabusExtraFromItems` copies Extra into the collection named by Extra (for reading-list import, a new top-level collection), moves the item there if the Connector saved it elsewhere, and clears Extra. Absorb is skipped for class folders so a child collection never gets its own syllabus note and folder membership cannot write back to the parent document.

## Class subcollections

After each note persist, [`src/modules/classSubcollections.ts`](../src/modules/classSubcollections.ts) makes the tree match the document:

- One child collection per class, named like `Class 1: Title` (or `Week 1: …` when nomenclature is set). A reading deadline is appended (`— Friday 28th Aug`); when the class is marked done, the name ends with `✅`.
- The class record stores `subcollectionKey` (Zotero collection key). It is stripped from UI metadata and preserved across number-keyed merges.
- Desired items = regular items with assignments for that `classId`. Missing items are added to the folder; extras are removed from the **folder only**. Items stay on the parent.
- User edits in a folder never update the note. Removing an item from the folder is restored on the next sync; adding a stray item is dropped. Deleting a managed folder recreates it from the note.
- Extra child collections that are not class folders (and do not have their own syllabus note) are removed.
- This is controlled per syllabus by **Create subcollections?** in Syllabus Settings (off by default for new syllabi and for collections migrated from legacy prefs). Turning it on asks for confirmation: existing child collections become managed, extra folders can be deleted, and class-folder membership is rewritten from the note. Turning it off stops create/rename/delete; leftover folders are not removed.

On startup, folders are ensured for every syllabus that has the setting on. New folder keys are written back to the note; if keys are already present, only membership is synced.

Class-folder Syllabus view is a single-class page (same class renderer as the Reading Schedule) with a link back to the parent. Document reads/writes for a class folder resolve to the parent note (`getClassSubcollectionContext` / `resolveSyllabusRoot`).

## Practical rules

- Do not persist hydrated `classNumber` on assignments; identity is `classId`.
- Do not call `getNote()` from render/hot paths; use the document cache.
- The plugin sandbox often has no `structuredClone`; clone documents with JSON.
- Do not call `mutateCollectionDocument` from inside a class-folder ensure that already runs inside a write (deadlock on the per-collection write queue). Folder create/rename runs in the same write as the note persist; item membership runs after.
- Do not absorb Extra, or create a syllabus note, on a collection whose parent already has a syllabus. Reading-list import (Talis, Leganto, KeyLinks, eReserve Plus, BLUEcloud) creates a new top-level collection instead.
- When remapping item merges, never write the syllabus note on the merge/notifier call stack; queue like Extra absorb. Do not treat item `trash` as a merge unless `dc:replaces` names a live survivor.
