/**
 * One-time migration: copy collectionMetadata prefs (+ Extra assignments)
 * into collection syllabus notes. Prefs with no classes are deleted without
 * creating a note. Other prefs objects are deleted only after that
 * collection's note is known to exist on disk.
 */

import { config } from "../../package.json";
import {
  COLLECTION_SYLLABUS_DOCUMENT_VERSION,
  classesToNumberKeyed,
  mergeNumberKeyedClasses,
  SettingsSyllabusMetadataSchema,
  type CollectionSyllabusDocument,
  type SettingsSyllabusMetadata,
} from "../utils/schemas";
import {
  getCachedCollectionById,
  getCachedCollectionByKey,
  zoteroCache,
} from "../utils/cache";
import {
  absorbSyllabusExtraFromItems,
  mutateCollectionDocument,
  peekPersistedSyllabusDocument,
  whenSyllabusNotesReady,
} from "./syllabusNote";

export const COLLECTION_METADATA_PREF = `${config.prefsPrefix}.collectionMetadata`;

let migrationInFlight = false;

export async function migrateLegacyCollectionMetadataPrefs(): Promise<void> {
  if (migrationInFlight) {
    return;
  }
  migrationInFlight = true;
  try {
    await runMigration();
  } finally {
    migrationInFlight = false;
  }
}

async function runMigration(): Promise<void> {
  await whenSyllabusNotesReady();

  const parsed = readCollectionMetadataPref();
  if (parsed === "missing") {
    return;
  }
  if (parsed === "invalid") {
    ztoolkit.log(
      "collectionMetadata pref is present but not valid JSON; leaving it in place",
    );
    return;
  }

  const remaining = { ...parsed };
  const keys = Object.keys(remaining);
  if (keys.length === 0) {
    clearCollectionMetadataPref();
    return;
  }

  const resolvableCount = keys.filter((key) =>
    resolveCollectionFromPrefKey(key),
  ).length;
  if (resolvableCount === 0) {
    ztoolkit.log(
      `collectionMetadata has ${keys.length} entries but none match collections; leaving prefs in place`,
    );
    return;
  }

  ztoolkit.log(
    `Migrating ${resolvableCount} of ${keys.length} collection(s) from collectionMetadata prefs to notes`,
  );

  const progress = createProgress(
    `Migrating ${resolvableCount} syllabus${
      resolvableCount === 1 ? "" : "es"
    } to collection notes…`,
  );

  let migrated = 0;
  let failed = 0;
  let skippedMissing = 0;
  let clearedEmpty = 0;

  try {
    for (let i = 0; i < keys.length; i++) {
      const prefKey = keys[i];
      updateProgress(
        progress,
        Math.round(((i + 1) / keys.length) * 100),
        `Migrating ${i + 1} of ${keys.length}…`,
      );

      const collection = resolveCollectionFromPrefKey(prefKey);
      if (!collection) {
        skippedMissing++;
        ztoolkit.log(
          "Skipping collectionMetadata entry; collection not found:",
          prefKey,
        );
        continue;
      }

      const metadataResult = SettingsSyllabusMetadataSchema.safeParse(
        remaining[prefKey] ?? {},
      );
      if (!metadataResult.success) {
        failed++;
        ztoolkit.log(
          "Skipping collectionMetadata entry; metadata did not validate:",
          prefKey,
          metadataResult.error,
        );
        continue;
      }

      if (!prefsHaveConfiguredClasses(metadataResult.data)) {
        ztoolkit.log(
          "Wiping collectionMetadata with no classes; not creating a note:",
          prefKey,
        );
        delete remaining[prefKey];
        writeCollectionMetadataPref(remaining);
        clearedEmpty++;
        continue;
      }

      try {
        const ok = await migrateOneCollection(collection, metadataResult.data);
        if (!ok) {
          failed++;
          ztoolkit.log(
            "Syllabus note was not persisted; leaving prefs entry:",
            prefKey,
          );
          continue;
        }
      } catch (error) {
        failed++;
        ztoolkit.log(
          "Error migrating collectionMetadata entry; leaving prefs entry:",
          prefKey,
          error,
        );
        continue;
      }

      delete remaining[prefKey];
      writeCollectionMetadataPref(remaining);
      migrated++;
    }
  } finally {
    closeProgress(
      progress,
      migrated,
      failed,
      skippedMissing,
      clearedEmpty,
      Object.keys(remaining).length,
    );
  }
}

async function migrateOneCollection(
  collection: Zotero.Collection,
  prefsMetadata: SettingsSyllabusMetadata,
): Promise<boolean> {
  await mutateCollectionDocument(collection, (document) =>
    mergePrefsMetadataIntoDocument(document, prefsMetadata),
  );

  const items = collection.getChildItems().filter((item) => {
    try {
      return item.isRegularItem();
    } catch {
      return false;
    }
  });
  if (items.length > 0) {
    await absorbSyllabusExtraFromItems(items);
  }

  const persisted = peekPersistedSyllabusDocument(collection);
  if (!persisted) {
    return false;
  }
  return prefsMetadataPresentInDocument(prefsMetadata, persisted);
}

function prefsHaveConfiguredClasses(
  metadata: SettingsSyllabusMetadata,
): boolean {
  return Object.keys(metadata.classes || {}).length > 0;
}

function mergePrefsMetadataIntoDocument(
  document: CollectionSyllabusDocument,
  prefsMetadata: SettingsSyllabusMetadata,
): CollectionSyllabusDocument {
  const existingByNumber = classesToNumberKeyed(document.classes);
  // Existing note classes win on conflict; prefs fill in missing numbers.
  const unionClasses = {
    ...prefsMetadata.classes,
    ...existingByNumber,
  };

  return {
    ...prefsMetadata,
    ...document,
    description: document.description || prefsMetadata.description,
    institution: document.institution || prefsMetadata.institution,
    courseCode: document.courseCode || prefsMetadata.courseCode,
    nomenclature: document.nomenclature || prefsMetadata.nomenclature,
    cslStyle: document.cslStyle || prefsMetadata.cslStyle,
    locked: document.locked ?? prefsMetadata.locked,
    createSubcollections:
      document.createSubcollections ??
      (Object.values(document.classes || {}).some(
        (meta) => !!(meta?.subcollectionKey || "").trim(),
      )
        ? true
        : false),
    links:
      document.links && document.links.length > 0
        ? document.links
        : prefsMetadata.links,
    priorities:
      document.priorities && document.priorities.length > 0
        ? document.priorities
        : prefsMetadata.priorities,
    classes: mergeNumberKeyedClasses(document.classes, unionClasses),
    items: document.items,
    version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
  };
}

function prefsMetadataPresentInDocument(
  prefsMetadata: SettingsSyllabusMetadata,
  document: CollectionSyllabusDocument,
): boolean {
  const classes = classesToNumberKeyed(document.classes);
  for (const classNum of Object.keys(prefsMetadata.classes || {})) {
    if (!classes[classNum] && !classes[String(Number(classNum))]) {
      return false;
    }
  }
  if (prefsMetadata.description && !document.description) {
    return false;
  }
  return true;
}

function resolveCollectionFromPrefKey(key: string): Zotero.Collection | null {
  if (key.includes(":")) {
    const colon = key.indexOf(":");
    const libraryID = parseInt(key.slice(0, colon), 10);
    const collectionKey = key.slice(colon + 1);
    if (Number.isNaN(libraryID) || !collectionKey) {
      return null;
    }
    return (
      getCachedCollectionByKey(libraryID, collectionKey) ||
      Zotero.Collections.getByLibraryAndKey(libraryID, collectionKey) ||
      null
    );
  }

  const collectionId = parseInt(key, 10);
  if (Number.isNaN(collectionId)) {
    return null;
  }
  return (
    getCachedCollectionById(collectionId) ||
    Zotero.Collections.get(collectionId) ||
    null
  );
}

function readCollectionMetadataPref():
  | Record<string, unknown>
  | "missing"
  | "invalid" {
  let raw: unknown;
  try {
    raw = Zotero.Prefs.get(COLLECTION_METADATA_PREF, true);
  } catch (error) {
    ztoolkit.log("Error reading collectionMetadata pref:", error);
    return "invalid";
  }

  if (raw === undefined || raw === null || raw === "") {
    return "missing";
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== "string") {
    return "invalid";
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "invalid";
    }
    return parsed as Record<string, unknown>;
  } catch {
    return "invalid";
  }
}

function writeCollectionMetadataPref(remaining: Record<string, unknown>): void {
  if (Object.keys(remaining).length === 0) {
    clearCollectionMetadataPref();
    return;
  }
  Zotero.Prefs.set(COLLECTION_METADATA_PREF, JSON.stringify(remaining), true);
  zoteroCache.invalidatePref(COLLECTION_METADATA_PREF);
}

function clearCollectionMetadataPref(): void {
  try {
    Zotero.Prefs.clear(COLLECTION_METADATA_PREF, true);
  } catch (error) {
    ztoolkit.log("Error clearing collectionMetadata pref:", error);
  }
  zoteroCache.invalidatePref(COLLECTION_METADATA_PREF);
}

function createProgress(text: string): {
  close: () => void;
  changeLine: (opts: { progress: number; text: string }) => void;
  startCloseTimer: (ms: number) => void;
} | null {
  try {
    return new ztoolkit.ProgressWindow("Zotero Syllabus", {
      closeOnClick: true,
      closeTime: -1,
    })
      .createLine({
        text,
        type: "default",
        progress: 0,
      })
      .show();
  } catch (error) {
    ztoolkit.log("Could not show migration progress window:", error);
    return null;
  }
}

function updateProgress(
  progress: ReturnType<typeof createProgress>,
  percent: number,
  text: string,
): void {
  if (!progress) {
    return;
  }
  try {
    progress.changeLine({ progress: percent, text });
  } catch {
    // Progress window may have been closed.
  }
}

function closeProgress(
  progress: ReturnType<typeof createProgress>,
  migrated: number,
  failed: number,
  skippedMissing: number,
  clearedEmpty: number,
  remaining: number,
): void {
  const parts = [`Migrated ${migrated} syllabus${migrated === 1 ? "" : "es"}`];
  if (clearedEmpty) {
    parts.push(
      `${clearedEmpty} empty pref${clearedEmpty === 1 ? "" : "s"} cleared`,
    );
  }
  if (skippedMissing) {
    parts.push(
      `${skippedMissing} collection${skippedMissing === 1 ? "" : "s"} not found`,
    );
  }
  if (failed) {
    parts.push(`${failed} failed`);
  }
  if (remaining) {
    parts.push(`${remaining} left in preferences`);
  }

  ztoolkit.log("collectionMetadata migration finished:", {
    migrated,
    failed,
    skippedMissing,
    clearedEmpty,
    remaining,
  });

  if (!progress) {
    return;
  }
  try {
    progress.changeLine({
      progress: 100,
      text: parts.join(" · "),
    });
    progress.startCloseTimer(8000);
  } catch {
    try {
      progress.close();
    } catch {
      // Already closed.
    }
  }
}
