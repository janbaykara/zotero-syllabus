/**
 * One-way Reading schedule collection: a global pref creates, names, and fills
 * a top-level folder of date subcollections in each library that has syllabi.
 * Edits in those folders never write back to syllabus notes. Turning the pref
 * off deletes the trees. Items cannot cross libraries, so group syllabi get
 * their own schedule collection (Notero #706 inverse).
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
const managedRootByLibrary = new Map<number, number>();
let syncChain: Promise<void> = Promise.resolve();
let syncHoldDepth = 0;
/** Stays true until the next macrotask after depth hits 0, covering deferred notifiers. */
let syncHoldLatched = false;
let prefObserverID: symbol | null = null;

export type ReadingScheduleDesiredItems = Map<string, number[]>;
export type ReadingScheduleDesiredByLibrary = Map<
  number,
  ReadingScheduleDesiredItems
>;

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
 * conventional top-level “Reading Schedule” name in that library.
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
  if (managed && managedRootByLibrary.get(root.libraryID) === root.id) {
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
  const stored = storedRoot(collection.libraryID);
  if (stored) {
    if (collection.id === stored.id || collection.key === stored.key) {
      return stored;
    }
    if (collection.parentID === stored.id) {
      return stored;
    }
  }

  const managedRootId = managedRootByLibrary.get(collection.libraryID);
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

  if (isReadingScheduleRootName(collection.name)) {
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
      isReadingScheduleRootName(parent.name) &&
      parent.libraryID === collection.libraryID
    ) {
      adoptReadingScheduleRootKey(parent);
      return parent;
    }
  }

  return null;
}

function adoptReadingScheduleRootKey(root: Zotero.Collection): void {
  const existing = rootKeyForLibrary(root.libraryID);
  if (existing === root.key) {
    rememberRoot(root);
    return;
  }
  if (!existing || !storedRoot(root.libraryID)) {
    setRootKey(root.libraryID, root.key);
    rememberRoot(root);
  }
}

/** Sorted YYYY-MM-DD keys for date subcollections under the Reading schedule root. */
export function listReadingScheduleDateFolders(
  root?: Zotero.Collection | null,
): Array<{ dateKey: string; collection: Zotero.Collection }> {
  const parent = root || storedRoot(Zotero.Libraries.userLibraryID);
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
  const byDate = new Map<string, Set<number>>();

  for (const { libraryID, document } of sources) {
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

/** Split syllabus sources into per-library date maps. Items cannot cross libraries. */
export function buildReadingScheduleDesiredByLibrary(
  sources: ReadingScheduleSource[],
): ReadingScheduleDesiredByLibrary {
  const grouped = new Map<number, ReadingScheduleSource[]>();
  for (const source of sources) {
    const list = grouped.get(source.libraryID) || [];
    list.push(source);
    grouped.set(source.libraryID, list);
  }
  const result: ReadingScheduleDesiredByLibrary = new Map();
  for (const [libraryID, list] of grouped) {
    result.set(libraryID, buildReadingScheduleDesiredItems(list));
  }
  return result;
}

/**
 * Legacy pref is a bare collection key (My Library). Current pref is JSON
 * `{ libraryID: collectionKey }`.
 */
export function parseReadingScheduleRootKeys(
  raw: unknown,
  userLibraryID: number,
): Record<string, string> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return normalizeRootKeyMap(raw as Record<string, unknown>);
  }
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed === "[object Object]") {
    return {};
  }
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return normalizeRootKeyMap(parsed as Record<string, unknown>);
      }
    } catch {
      return {};
    }
  }
  return { [String(userLibraryID)]: trimmed };
}

function normalizeRootKeyMap(
  parsed: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, key] of Object.entries(parsed)) {
    const value = String(key || "").trim();
    if (value && value !== "[object Object]") {
      out[id] = value;
    }
  }
  return out;
}

export function isManagedReadingScheduleRootKey(
  libraryID: number,
  key: string,
): boolean {
  return rootKeyForLibrary(libraryID) === key;
}

function readRootKeyMap(): Record<string, string> {
  return parseReadingScheduleRootKeys(
    getPrefValue("readingScheduleCollectionKey"),
    Zotero.Libraries.userLibraryID,
  );
}

function writeRootKeyMap(map: Record<string, string>): void {
  const cleaned: Record<string, string> = {};
  for (const [id, key] of Object.entries(map)) {
    const trimmed = trimKey(key);
    if (trimmed) {
      cleaned[id] = trimmed;
    }
  }
  setPref(
    "readingScheduleCollectionKey",
    Object.keys(cleaned).length ? JSON.stringify(cleaned) : "",
  );
}

function rootKeyForLibrary(libraryID: number): string | undefined {
  return trimKey(readRootKeyMap()[String(libraryID)]);
}

function setRootKey(libraryID: number, key: string): void {
  const map = readRootKeyMap();
  map[String(libraryID)] = key;
  writeRootKeyMap(map);
}

function clearRootKey(libraryID: number): void {
  const map = readRootKeyMap();
  delete map[String(libraryID)];
  writeRootKeyMap(map);
}

function storedRoot(libraryID: number): Zotero.Collection | null {
  const key = rootKeyForLibrary(libraryID);
  if (!key) {
    return null;
  }
  const collection = Zotero.Collections.getByLibraryAndKey(libraryID, key);
  if (!collection || collection.deleted) {
    return null;
  }
  return collection;
}

function rememberRoot(collection: Zotero.Collection): void {
  managedRootByLibrary.set(collection.libraryID, collection.id);
}

function isManagedRootId(collectionId: number): boolean {
  for (const rootId of managedRootByLibrary.values()) {
    if (rootId === collectionId) {
      return true;
    }
  }
  return false;
}

function rememberDateFolder(child: Zotero.Collection, dateKey: string): void {
  managedDateFolders.set(child.id, { key: child.key, dateKey });
}

function forgetCollection(collectionId: number): void {
  for (const [libraryID, rootId] of managedRootByLibrary) {
    if (rootId !== collectionId) {
      continue;
    }
    managedRootByLibrary.delete(libraryID);
    for (const [id] of [...managedDateFolders]) {
      const child =
        getCachedCollectionById(id) || Zotero.Collections.get(id) || null;
      if (!child || child.parentID === collectionId) {
        managedDateFolders.delete(id);
      }
    }
    return;
  }
  managedDateFolders.delete(collectionId);
}

function forgetManagedMaps(): void {
  managedDateFolders.clear();
  managedRootByLibrary.clear();
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

async function waitForLibraryCollections(libraryID: number): Promise<void> {
  try {
    const library = Zotero.Libraries.get(libraryID);
    if (library && typeof library.waitForDataLoad === "function") {
      await library.waitForDataLoad("collection");
    }
  } catch {
    // Library may not exist.
  }
}

function namedReadingScheduleCollections(
  libraryID: number,
): Zotero.Collection[] {
  return Zotero.Collections.getByLibrary(libraryID).filter(
    (collection) =>
      !collection.deleted && isReadingScheduleRootName(collection.name),
  );
}

function dateChildCount(collection: Zotero.Collection): number {
  return collection
    .getChildCollections()
    .filter((child) => dateKeyFromFolderName(child.name) != null).length;
}

function pickCanonicalRoot(libraryID: number): Zotero.Collection | null {
  const stored = storedRoot(libraryID);
  const named = namedReadingScheduleCollections(libraryID);
  const candidates = [...named];
  if (
    stored &&
    stored.libraryID === libraryID &&
    !candidates.some((collection) => collection.id === stored.id)
  ) {
    candidates.push(stored);
  }
  if (!candidates.length) {
    return stored && stored.libraryID === libraryID ? stored : null;
  }
  const topLevel = candidates.filter((collection) => !collection.parentID);
  const pool = topLevel.length ? topLevel : candidates;
  const storedId = stored?.id;
  pool.sort((a, b) => {
    const byDates = dateChildCount(b) - dateChildCount(a);
    if (byDates !== 0) {
      return byDates;
    }
    if (storedId != null) {
      if (a.id === storedId) {
        return -1;
      }
      if (b.id === storedId) {
        return 1;
      }
    }
    return a.id - b.id;
  });
  return pool[0];
}

async function collapseDuplicateRoots(
  libraryID: number,
  canonical: Zotero.Collection,
): Promise<void> {
  for (const extra of namedReadingScheduleCollections(libraryID)) {
    if (extra.id === canonical.id) {
      continue;
    }
    forgetCollection(extra.id);
    await eraseCollection(extra);
  }
}

async function ensureRootCollection(
  libraryID: number,
): Promise<Zotero.Collection> {
  await waitForLibraryCollections(libraryID);
  let root = pickCanonicalRoot(libraryID);
  if (!root) {
    root = new Zotero.Collection({
      name: READING_SCHEDULE_COLLECTION_NAME,
      libraryID,
    });
    await saveCollection(root);
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
  if (root.libraryID !== libraryID) {
    ztoolkit.log(
      "Reading schedule root is in a different library than requested",
      { requested: libraryID, actual: root.libraryID, key: root.key },
    );
  }
  setRootKey(root.libraryID, root.key);
  rememberRoot(root);
  await collapseDuplicateRoots(root.libraryID, root);
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
    if (
      existing &&
      !existing.deleted &&
      existing.libraryID === parent.libraryID
    ) {
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
  const map = readRootKeyMap();
  holdSync();
  try {
    for (const libraryID of Object.keys(map).map(Number)) {
      if (!Number.isInteger(libraryID)) {
        continue;
      }
      const root = storedRoot(libraryID);
      if (root) {
        forgetCollection(root.id);
        await eraseCollection(root);
      }
    }
    writeRootKeyMap({});
    forgetManagedMaps();
  } finally {
    releaseSync();
  }
}

async function ensureReadingScheduleCollection(
  getDesired: () => ReadingScheduleDesiredByLibrary,
): Promise<void> {
  if (!getPrefValue("generateReadingScheduleCollection")) {
    await eraseStoredTree();
    return;
  }

  const desiredByLibrary = getDesired();
  const libraryIDs = new Set<number>([
    Zotero.Libraries.userLibraryID,
    ...desiredByLibrary.keys(),
    ...Object.keys(readRootKeyMap()).map(Number),
  ]);
  for (const library of Zotero.Libraries.getAll()) {
    const libraryID = library.libraryID;
    if (typeof libraryID !== "number" || !libraryIsEditable(libraryID)) {
      continue;
    }
    if (namedReadingScheduleCollections(libraryID).length) {
      libraryIDs.add(libraryID);
    }
  }

  holdSync();
  try {
    for (const libraryID of libraryIDs) {
      if (!Number.isInteger(libraryID) || !libraryIsEditable(libraryID)) {
        continue;
      }
      const desired = desiredByLibrary.get(libraryID) || new Map();
      const isUserLibrary = libraryID === Zotero.Libraries.userLibraryID;
      if (
        !isUserLibrary &&
        desired.size === 0 &&
        !storedRoot(libraryID) &&
        namedReadingScheduleCollections(libraryID).length === 0
      ) {
        continue;
      }
      await syncLibraryReadingSchedule(libraryID, desired);
    }
  } finally {
    releaseSync();
  }
}

async function syncLibraryReadingSchedule(
  libraryID: number,
  desired: ReadingScheduleDesiredItems,
): Promise<void> {
  const root = await ensureRootCollection(libraryID);
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
}

export function enqueueReadingScheduleCollectionSync(
  getDesired: () => ReadingScheduleDesiredByLibrary,
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
  getDesired: () => ReadingScheduleDesiredByLibrary,
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
      const collection =
        getCachedCollectionById(collectionId) ||
        Zotero.Collections.get(collectionId) ||
        null;
      const wasRoot = isManagedRootId(collectionId);
      const libraryID = collection?.libraryID;
      forgetCollection(collectionId);
      if (wasRoot && libraryID != null) {
        clearRootKey(libraryID);
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
  getDesired: () => ReadingScheduleDesiredByLibrary,
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
  getDesired: () => ReadingScheduleDesiredByLibrary,
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
