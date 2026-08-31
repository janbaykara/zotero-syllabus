/**
 * One-way Reading schedule collection: a global pref creates, names, and fills
 * a top-level folder of date subcollections. Edits in those folders never
 * write back to syllabus notes. Turning the pref off deletes the tree.
 */

import {
  assignmentClassNumber,
  type CollectionSyllabusDocument,
} from "../utils/schemas";
import { getCachedCollectionById } from "../utils/cache";
import {
  formatReadingDateStored,
  isReadingDateInScheduleWindow,
  parseReadingDate,
  toLocalDateKey,
} from "../utils/dates";
import { getPrefKey, getPrefValue, setPref } from "../utils/prefs";
import { libraryIsEditable } from "../utils/zotero";
import { collectionHasSyllabusNote } from "./syllabusNote";

export const READING_SCHEDULE_COLLECTION_NAME = "Reading Schedule";
const LEGACY_READING_SCHEDULE_COLLECTION_NAME = "Reading schedule";

function isReadingScheduleRootName(name: string): boolean {
  return (
    name === READING_SCHEDULE_COLLECTION_NAME ||
    name === LEGACY_READING_SCHEDULE_COLLECTION_NAME
  );
}

const DATE_SEPARATOR = " — ";
const DATE_FOLDER_PREFIX = /^(\d{4}-\d{2}-\d{2})(?:\s|$)/;

type ManagedDateFolder = {
  key: string;
  dateKey: string;
};

const managedDateFolders = new Map<number, ManagedDateFolder>();
let managedRootId: number | null = null;
let syncChain: Promise<void> = Promise.resolve();
let syncHoldDepth = 0;
/** Stays true until the next macrotask after depth hits 0, covering deferred notifiers. */
let syncHoldLatched = false;
let prefObserverID: symbol | null = null;

export type ReadingScheduleDesiredItems = Map<string, number[]>;

export type ReadingScheduleSource = {
  libraryID: number;
  document: CollectionSyllabusDocument;
};

function trimKey(key: string | undefined | null): string | undefined {
  const trimmed = (key || "").trim();
  return trimmed || undefined;
}

function holdSync(): void {
  syncHoldDepth += 1;
  syncHoldLatched = true;
}

function releaseSync(): void {
  syncHoldDepth = Math.max(0, syncHoldDepth - 1);
  if (syncHoldDepth > 0) {
    return;
  }
  setTimeout(() => {
    if (syncHoldDepth === 0) {
      syncHoldLatched = false;
    }
  }, 0);
}

export function isReadingScheduleSyncHeld(): boolean {
  return syncHoldDepth > 0 || syncHoldLatched;
}

export function isManagedReadingScheduleCollection(
  collectionId: number,
): boolean {
  return getReadingScheduleCollectionContext(collectionId) != null;
}

export type ReadingScheduleCollectionContext = {
  kind: "root" | "date";
  root: Zotero.Collection;
  dateKey: string | null;
  collection: Zotero.Collection;
};

/**
 * Identify the managed Reading schedule root or one of its date folders.
 * Prefers the stored collection key, then in-memory maps, then the
 * conventional top-level “Reading Schedule” name in My Library.
 */
export function getReadingScheduleCollectionContext(
  collectionId: number,
): ReadingScheduleCollectionContext | null {
  const collection =
    getCachedCollectionById(collectionId) ||
    Zotero.Collections.get(collectionId) ||
    null;
  if (!collection || collection.deleted) {
    return null;
  }
  if (collection.libraryID !== Zotero.Libraries.userLibraryID) {
    return null;
  }

  const root = findReadingScheduleRoot(collection);
  if (!root) {
    return null;
  }

  if (collection.id === root.id || collection.key === root.key) {
    rememberRoot(root);
    return {
      kind: "root",
      root,
      dateKey: null,
      collection: root,
    };
  }

  if (collection.parentID === root.id) {
    const dateKey = dateKeyFromFolderName(collection.name);
    if (dateKey) {
      rememberRoot(root);
      rememberDateFolder(collection, dateKey);
      return {
        kind: "date",
        root,
        dateKey,
        collection,
      };
    }
  }

  const managed = managedDateFolders.get(collectionId);
  if (managed && managedRootId === root.id) {
    rememberRoot(root);
    rememberDateFolder(collection, managed.dateKey);
    return {
      kind: "date",
      root,
      dateKey: managed.dateKey,
      collection,
    };
  }

  return null;
}

/**
 * Resolve the Reading schedule root for a collection (itself or its parent),
 * adopting a name match when the stored key is missing.
 */
function findReadingScheduleRoot(
  collection: Zotero.Collection,
): Zotero.Collection | null {
  const stored = storedRoot();
  if (stored) {
    if (collection.id === stored.id || collection.key === stored.key) {
      return stored;
    }
    if (collection.parentID === stored.id) {
      return stored;
    }
  }

  if (managedRootId != null) {
    const live =
      getCachedCollectionById(managedRootId) ||
      Zotero.Collections.get(managedRootId);
    if (live && !live.deleted) {
      if (collection.id === live.id || collection.parentID === live.id) {
        return live;
      }
    }
  }

  if (!collection.parentID && isReadingScheduleRootName(collection.name)) {
    adoptReadingScheduleRootKey(collection);
    return collection;
  }

  if (collection.parentID) {
    const parent =
      getCachedCollectionById(collection.parentID) ||
      Zotero.Collections.get(collection.parentID);
    if (
      parent &&
      !parent.deleted &&
      !parent.parentID &&
      isReadingScheduleRootName(parent.name) &&
      parent.libraryID === Zotero.Libraries.userLibraryID
    ) {
      adoptReadingScheduleRootKey(parent);
      return parent;
    }
  }

  return null;
}

function adoptReadingScheduleRootKey(root: Zotero.Collection): void {
  const existing = trimKey(getPrefValue("readingScheduleCollectionKey"));
  if (existing === root.key) {
    rememberRoot(root);
    return;
  }
  // Only adopt when the pref is empty or still points at a missing collection.
  if (!existing || !storedRoot()) {
    setPref("readingScheduleCollectionKey", root.key);
  }
  rememberRoot(root);
}

/** Sorted YYYY-MM-DD keys for date subcollections under the Reading schedule root. */
export function listReadingScheduleDateFolders(
  root?: Zotero.Collection | null,
): Array<{ dateKey: string; collection: Zotero.Collection }> {
  const parent = root || storedRoot();
  if (!parent) {
    return [];
  }
  const folders: Array<{ dateKey: string; collection: Zotero.Collection }> = [];
  for (const child of parent.getChildCollections()) {
    if (child.deleted) {
      continue;
    }
    const dateKey = dateKeyFromFolderName(child.name);
    if (!dateKey) {
      continue;
    }
    rememberDateFolder(child, dateKey);
    folders.push({ dateKey, collection: child });
  }
  folders.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return folders;
}

export function readingScheduleDateFolderName(dateKey: string): string {
  return `${dateKey}${DATE_SEPARATOR}${formatReadingDateStored(dateKey)}`;
}

export function dateKeyFromFolderName(name: string): string | null {
  const match = DATE_FOLDER_PREFIX.exec(name);
  return match ? match[1] : null;
}

export function buildReadingScheduleDesiredItems(
  sources: ReadingScheduleSource[],
): ReadingScheduleDesiredItems {
  const userLibraryID = Zotero.Libraries.userLibraryID;
  const byDate = new Map<string, Set<number>>();

  for (const { libraryID, document } of sources) {
    if (libraryID !== userLibraryID) {
      continue;
    }
    for (const [classId, meta] of Object.entries(document.classes || {})) {
      const readingDate = (meta?.readingDate || "").trim();
      if (!readingDate || !isReadingDateInScheduleWindow(readingDate)) {
        continue;
      }
      const parsed = parseReadingDate(readingDate);
      if (Number.isNaN(parsed.getTime())) {
        continue;
      }
      const dateKey = toLocalDateKey(parsed);
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, new Set());
      }
      const itemIds = byDate.get(dateKey)!;
      const classNumber = meta.number;
      for (const [itemKey, assignments] of Object.entries(
        document.items || {},
      )) {
        const belongs = (assignments || []).some((assignment) => {
          if (assignment.classId === classId) {
            return true;
          }
          if (classNumber == null) {
            return false;
          }
          return (
            assignmentClassNumber(assignment, document.classes) === classNumber
          );
        });
        if (!belongs) {
          continue;
        }
        const item = Zotero.Items.getByLibraryAndKey(libraryID, itemKey);
        if (!item || item.deleted) {
          continue;
        }
        try {
          if (!item.isRegularItem()) {
            continue;
          }
        } catch {
          continue;
        }
        itemIds.add(item.id);
      }
    }
  }

  const result: ReadingScheduleDesiredItems = new Map();
  const sortedKeys = Array.from(byDate.keys()).sort();
  for (const dateKey of sortedKeys) {
    result.set(dateKey, Array.from(byDate.get(dateKey)!));
  }
  return result;
}

function userLibraryIsEditable(): boolean {
  return libraryIsEditable(Zotero.Libraries.userLibraryID);
}

function storedRoot(): Zotero.Collection | null {
  const key = trimKey(getPrefValue("readingScheduleCollectionKey"));
  if (!key) {
    return null;
  }
  const collection = Zotero.Collections.getByLibraryAndKey(
    Zotero.Libraries.userLibraryID,
    key,
  );
  if (!collection || collection.deleted) {
    return null;
  }
  return collection;
}

function rememberRoot(collection: Zotero.Collection): void {
  managedRootId = collection.id;
}

function rememberDateFolder(child: Zotero.Collection, dateKey: string): void {
  managedDateFolders.set(child.id, { key: child.key, dateKey });
}

function forgetCollection(collectionId: number): void {
  if (collectionId === managedRootId) {
    managedRootId = null;
    managedDateFolders.clear();
    return;
  }
  managedDateFolders.delete(collectionId);
}

function forgetManagedMaps(): void {
  managedDateFolders.clear();
  managedRootId = null;
}

export function clearManagedReadingScheduleCollection(): void {
  forgetManagedMaps();
  syncHoldDepth = 0;
  syncHoldLatched = false;
  syncChain = Promise.resolve();
}

async function saveCollection(collection: Zotero.Collection): Promise<void> {
  await collection.saveTx({ skipSelect: true });
}

async function eraseCollection(collection: Zotero.Collection): Promise<void> {
  try {
    if (collection.deleted) {
      return;
    }
    await collection.eraseTx({ deleteItems: false });
  } catch (error) {
    ztoolkit.log("Error removing reading schedule collection:", error);
  }
}

async function syncCollectionItems(
  collection: Zotero.Collection,
  desiredIds: number[],
): Promise<void> {
  const desiredIdSet = new Set(desiredIds);
  const toRemove: number[] = [];
  const currentIds = new Set<number>();
  for (const item of collection.getChildItems()) {
    try {
      if (!item.isRegularItem()) {
        continue;
      }
    } catch {
      continue;
    }
    currentIds.add(item.id);
    if (!desiredIdSet.has(item.id)) {
      toRemove.push(item.id);
    }
  }
  const toAdd = desiredIds.filter((id) => !currentIds.has(id));
  if (!toAdd.length && !toRemove.length) {
    return;
  }

  await Zotero.DB.executeTransaction(async () => {
    if (toAdd.length) {
      await collection.addItems(toAdd, { skipSelect: true });
    }
    if (toRemove.length) {
      await collection.removeItems(toRemove, { skipSelect: true });
    }
  });
}

async function ensureRootCollection(): Promise<Zotero.Collection> {
  let root = storedRoot();
  if (!root) {
    root = new Zotero.Collection({
      name: READING_SCHEDULE_COLLECTION_NAME,
      libraryID: Zotero.Libraries.userLibraryID,
    });
    await saveCollection(root);
    setPref("readingScheduleCollectionKey", root.key);
  }

  let dirty = false;
  if (root.name !== READING_SCHEDULE_COLLECTION_NAME) {
    root.name = READING_SCHEDULE_COLLECTION_NAME;
    dirty = true;
  }
  if (root.parentID) {
    (root as Zotero.DataObject).parentID = false;
    dirty = true;
  }
  if (dirty) {
    await saveCollection(root);
  }
  rememberRoot(root);
  return root;
}

function adoptableDateChild(
  parent: Zotero.Collection,
  dateKey: string,
  usedKeys: Set<string>,
): Zotero.Collection | null {
  for (const child of parent.getChildCollections()) {
    if (usedKeys.has(child.key) || child.deleted) {
      continue;
    }
    if (dateKeyFromFolderName(child.name) !== dateKey) {
      continue;
    }
    return child;
  }
  return null;
}

async function ensureDateChild(
  parent: Zotero.Collection,
  dateKey: string,
  usedKeys: Set<string>,
): Promise<Zotero.Collection> {
  const name = readingScheduleDateFolderName(dateKey);
  let child: Zotero.Collection | null = null;
  for (const [collectionId, managed] of managedDateFolders) {
    if (managed.dateKey !== dateKey || usedKeys.has(managed.key)) {
      continue;
    }
    const existing =
      getCachedCollectionById(collectionId) ||
      Zotero.Collections.getByLibraryAndKey(parent.libraryID, managed.key);
    if (existing && !existing.deleted) {
      child = existing;
      break;
    }
  }
  if (!child) {
    child = adoptableDateChild(parent, dateKey, usedKeys);
  }
  if (!child) {
    child = new Zotero.Collection({
      name,
      libraryID: parent.libraryID,
      parentID: parent.id,
    });
    await saveCollection(child);
  }

  let dirty = false;
  if (child.name !== name) {
    child.name = name;
    dirty = true;
  }
  if (child.parentID !== parent.id) {
    child.parentID = parent.id;
    dirty = true;
  }
  if (dirty) {
    await saveCollection(child);
  }
  usedKeys.add(child.key);
  rememberDateFolder(child, dateKey);
  return child;
}

async function eraseExtraChildren(
  parent: Zotero.Collection,
  usedKeys: Set<string>,
): Promise<void> {
  for (const child of parent.getChildCollections()) {
    if (child.deleted || usedKeys.has(child.key)) {
      continue;
    }
    if (collectionHasSyllabusNote(child)) {
      continue;
    }
    forgetCollection(child.id);
    await eraseCollection(child);
  }
}

async function eraseStoredTree(): Promise<void> {
  const root = storedRoot();
  holdSync();
  try {
    if (root) {
      forgetCollection(root.id);
      await eraseCollection(root);
    }
    setPref("readingScheduleCollectionKey", "");
    forgetManagedMaps();
  } finally {
    releaseSync();
  }
}

async function ensureReadingScheduleCollection(
  getDesired: () => ReadingScheduleDesiredItems,
): Promise<void> {
  if (!getPrefValue("generateReadingScheduleCollection")) {
    await eraseStoredTree();
    return;
  }
  if (!userLibraryIsEditable()) {
    return;
  }

  holdSync();
  try {
    const desired = getDesired();
    const root = await ensureRootCollection();
    const usedKeys = new Set<string>();
    const childrenByDate = new Map<string, Zotero.Collection>();

    for (const dateKey of desired.keys()) {
      try {
        const child = await ensureDateChild(root, dateKey, usedKeys);
        childrenByDate.set(dateKey, child);
      } catch (error) {
        ztoolkit.log(
          "Error ensuring reading schedule date folder:",
          dateKey,
          error,
        );
      }
    }

    try {
      await eraseExtraChildren(root, usedKeys);
    } catch (error) {
      ztoolkit.log("Error removing extra reading schedule folders:", error);
    }

    try {
      await syncCollectionItems(root, []);
    } catch (error) {
      ztoolkit.log("Error clearing reading schedule root items:", error);
    }

    for (const [dateKey, child] of childrenByDate) {
      try {
        await syncCollectionItems(child, desired.get(dateKey) || []);
      } catch (error) {
        ztoolkit.log(
          "Error syncing reading schedule date items:",
          dateKey,
          error,
        );
      }
    }
  } finally {
    releaseSync();
  }
}

export function enqueueReadingScheduleCollectionSync(
  getDesired: () => ReadingScheduleDesiredItems,
): Promise<void> {
  const next = syncChain
    .catch(() => undefined)
    .then(() => ensureReadingScheduleCollection(getDesired))
    .catch((error) => {
      ztoolkit.log("Error syncing reading schedule collection:", error);
    });
  syncChain = next;
  return next;
}

export function handleReadingScheduleCollectionChange(
  event: string,
  ids: (number | string)[],
  getDesired: () => ReadingScheduleDesiredItems,
): void {
  let shouldSync = false;
  for (const id of ids) {
    const collectionId = typeof id === "number" ? id : parseInt(String(id), 10);
    if (Number.isNaN(collectionId)) {
      continue;
    }
    if (event === "delete" || event === "trash") {
      if (!isManagedReadingScheduleCollection(collectionId)) {
        continue;
      }
      const wasRoot = collectionId === managedRootId;
      forgetCollection(collectionId);
      if (wasRoot) {
        setPref("readingScheduleCollectionKey", "");
      }
      shouldSync = true;
      continue;
    }
    if (event !== "modify") {
      continue;
    }
    if (!isManagedReadingScheduleCollection(collectionId)) {
      continue;
    }
    shouldSync = true;
  }
  if (!shouldSync || isReadingScheduleSyncHeld()) {
    return;
  }
  if (!getPrefValue("generateReadingScheduleCollection")) {
    return;
  }
  enqueueReadingScheduleCollectionSync(getDesired);
}

export function restoreReadingScheduleCollectionItems(
  collectionId: number,
  getDesired: () => ReadingScheduleDesiredItems,
): void {
  if (!isManagedReadingScheduleCollection(collectionId)) {
    return;
  }
  if (isReadingScheduleSyncHeld()) {
    return;
  }
  if (!getPrefValue("generateReadingScheduleCollection")) {
    return;
  }
  enqueueReadingScheduleCollectionSync(getDesired);
}

export function registerReadingSchedulePrefObserver(
  getDesired: () => ReadingScheduleDesiredItems,
): void {
  if (prefObserverID) {
    return;
  }
  prefObserverID = Zotero.Prefs.registerObserver(
    getPrefKey("generateReadingScheduleCollection"),
    () => {
      enqueueReadingScheduleCollectionSync(getDesired).catch((error) => {
        ztoolkit.log(
          "Error syncing reading schedule collection after pref change:",
          error,
        );
      });
    },
    true,
  );
}

export function unregisterReadingSchedulePrefObserver(): void {
  if (!prefObserverID) {
    return;
  }
  Zotero.Prefs.unregisterObserver(prefObserverID);
  prefObserverID = null;
}
