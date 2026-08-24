/**
 * One-way class folders: the parent syllabus note creates, names, and fills
 * subcollections. Edits in those folders never write back to the note.
 */

import {
  assignmentClassNumber,
  type CollectionSyllabusDocument,
  type StoredClassMetadata,
} from "../utils/schemas";
import { getCachedCollectionById } from "../utils/cache";
import { formatReadingDate, parseReadingDate } from "../utils/dates";

const COLLECTION_NAME_MAX = 255;
const DONE_SUFFIX = " ✅";
const DATE_SEPARATOR = " — ";
const DATE_SUFFIX_PATTERN =
  /\s+—\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(?:st|nd|rd|th)\s+[A-Z][a-z]{2}\s*$/;

type ManagedSubcollection = {
  parentId: number;
  key: string;
};

const managedByCollectionId = new Map<number, ManagedSubcollection>();
const itemSyncChains = new Map<number, Promise<void>>();
const folderSyncChains = new Map<number, Promise<void>>();
/** parentId → depth, or 0 while waiting for deferred collection notifiers */
const folderSyncHold = new Map<number, number>();

function holdFolderSync(parentId: number): void {
  folderSyncHold.set(parentId, (folderSyncHold.get(parentId) || 0) + 1);
}

function releaseFolderSync(parentId: number): void {
  const depth = (folderSyncHold.get(parentId) || 1) - 1;
  if (depth > 0) {
    folderSyncHold.set(parentId, depth);
    return;
  }
  folderSyncHold.set(parentId, 0);
  setTimeout(() => {
    if (folderSyncHold.get(parentId) === 0) {
      folderSyncHold.delete(parentId);
    }
  }, 0);
}

export function isClassFolderSyncHeld(parentId: number): boolean {
  return folderSyncHold.has(parentId);
}

export function enqueueClassFolderEnsure(
  parent: Zotero.Collection,
  run: () => Promise<CollectionSyllabusDocument | void>,
): Promise<CollectionSyllabusDocument | void> {
  const previous = folderSyncChains.get(parent.id) || Promise.resolve();
  const next = previous.catch(() => undefined).then(run);
  folderSyncChains.set(
    parent.id,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

export function classSubcollectionName(
  nomenclature: string | undefined,
  number: number,
  title: string | null | undefined,
  options: { done?: boolean; readingDate?: string | null } = {},
): string {
  const noun = (nomenclature || "class").trim() || "class";
  const label = `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${number}`;
  const classTitle = (title || "").trim();
  const base = classTitle ? `${label}: ${classTitle}` : label;
  const dateLabel = formatDeadlineForName(options.readingDate);
  const suffix = `${dateLabel ? `${DATE_SEPARATOR}${dateLabel}` : ""}${
    options.done ? DONE_SUFFIX : ""
  }`;
  const maxBase = COLLECTION_NAME_MAX - suffix.length;
  if (base.length <= maxBase) {
    return `${base}${suffix}`;
  }
  return `${base.slice(0, Math.max(0, maxBase - 3))}...${suffix}`;
}

function formatDeadlineForName(
  readingDate: string | null | undefined,
): string | null {
  const iso = (readingDate || "").trim();
  if (!iso) {
    return null;
  }
  const date = parseReadingDate(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatReadingDate(iso);
}

export function classSubcollectionNameBase(name: string): string {
  return name
    .replace(/\s*✅\s*$/u, "")
    .replace(DATE_SUFFIX_PATTERN, "")
    .trimEnd();
}

export function classSubcollectionKeysChanged(
  before: CollectionSyllabusDocument,
  after: CollectionSyllabusDocument,
): boolean {
  const beforeKeys = storedSubcollectionKeys(before);
  const afterKeys = storedSubcollectionKeys(after);
  if (beforeKeys.size !== afterKeys.size) {
    return true;
  }
  for (const [classId, key] of afterKeys) {
    if (beforeKeys.get(classId) !== key) {
      return true;
    }
  }
  return false;
}

export function getManagedParentCollectionId(
  collectionId: number,
): number | undefined {
  return managedByCollectionId.get(collectionId)?.parentId;
}

export function rememberManagedSubcollections(
  parent: Zotero.Collection,
  document: CollectionSyllabusDocument,
): void {
  for (const meta of Object.values(document.classes || {})) {
    const key = trimKey(meta?.subcollectionKey);
    if (!key) {
      continue;
    }
    const child = Zotero.Collections.getByLibraryAndKey(parent.libraryID, key);
    if (child) {
      rememberManaged(child, parent);
    }
  }
}

export function clearManagedSubcollections(): void {
  managedByCollectionId.clear();
  itemSyncChains.clear();
  folderSyncChains.clear();
  folderSyncHold.clear();
}

function trimKey(key: string | undefined): string | undefined {
  const trimmed = (key || "").trim();
  return trimmed || undefined;
}

function storedSubcollectionKeys(
  document: CollectionSyllabusDocument,
): Map<string, string> {
  const keys = new Map<string, string>();
  for (const [classId, meta] of Object.entries(document.classes || {})) {
    const key = trimKey(meta?.subcollectionKey);
    if (key) {
      keys.set(classId, key);
    }
  }
  return keys;
}

function rememberManaged(
  child: Zotero.Collection,
  parent: Zotero.Collection,
): void {
  managedByCollectionId.set(child.id, {
    parentId: parent.id,
    key: child.key,
  });
}

function forgetManaged(child: Zotero.Collection): void {
  managedByCollectionId.delete(child.id);
}

function collectionLibraryIsEditable(collection: Zotero.Collection): boolean {
  try {
    const library = Zotero.Libraries.get(collection.libraryID);
    return Boolean(library && library.editable);
  } catch {
    return false;
  }
}

function childByKey(
  parent: Zotero.Collection,
  key: string | undefined,
): Zotero.Collection | null {
  const trimmed = trimKey(key);
  if (!trimmed) {
    return null;
  }
  const child = Zotero.Collections.getByLibraryAndKey(
    parent.libraryID,
    trimmed,
  );
  if (!child || child.deleted) {
    return null;
  }
  return child;
}

async function saveCollection(collection: Zotero.Collection): Promise<void> {
  await collection.saveTx({ skipSelect: true });
}

async function createChildCollection(
  parent: Zotero.Collection,
  name: string,
): Promise<Zotero.Collection> {
  const child = new Zotero.Collection({
    name,
    libraryID: parent.libraryID,
    parentID: parent.id,
  });
  await saveCollection(child);
  return child;
}

function adoptableChild(
  parent: Zotero.Collection,
  name: string,
  usedKeys: Set<string>,
): Zotero.Collection | null {
  for (const child of parent.getChildCollections()) {
    if (
      usedKeys.has(child.key) ||
      child.deleted ||
      classSubcollectionNameBase(child.name) !==
        classSubcollectionNameBase(name)
    ) {
      continue;
    }
    return child;
  }
  return null;
}

async function eraseManagedChild(child: Zotero.Collection): Promise<void> {
  forgetManaged(child);
  try {
    if (child.deleted) {
      return;
    }
    await child.eraseTx({ deleteItems: false });
  } catch (error) {
    ztoolkit.log("Error removing class subcollection:", error);
  }
}

async function ensureChildForClass(
  parent: Zotero.Collection,
  meta: StoredClassMetadata,
  name: string,
  usedKeys: Set<string>,
): Promise<Zotero.Collection> {
  let child = childByKey(parent, meta.subcollectionKey);
  if (child && usedKeys.has(child.key)) {
    child = null;
  }
  if (!child) {
    child = adoptableChild(parent, name, usedKeys);
  }
  if (!child) {
    child = await createChildCollection(parent, name);
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
  rememberManaged(child, parent);
  return child;
}

/**
 * Create, rename, adopt, and delete class folders. Returns a copy of `next`
 * with `subcollectionKey` stamped on each class. Does not write the note.
 */
export async function ensureClassSubcollections(
  parent: Zotero.Collection,
  next: CollectionSyllabusDocument,
  previous: CollectionSyllabusDocument,
): Promise<CollectionSyllabusDocument> {
  if (!collectionLibraryIsEditable(parent)) {
    return next;
  }

  holdFolderSync(parent.id);
  try {
    const classes: NonNullable<CollectionSyllabusDocument["classes"]> = {
      ...(next.classes || {}),
    };
    const usedKeys = new Set<string>();
    const nextClassIds = new Set(Object.keys(classes));

    for (const [classId, meta] of Object.entries(previous.classes || {})) {
      if (nextClassIds.has(classId)) {
        continue;
      }
      const stale = childByKey(parent, meta?.subcollectionKey);
      if (stale) {
        await eraseManagedChild(stale);
      }
    }

    for (const [classId, meta] of Object.entries(classes)) {
      if (!meta?.number) {
        continue;
      }
      const name = classSubcollectionName(
        next.nomenclature,
        meta.number,
        meta.title,
        { done: meta.status === "done", readingDate: meta.readingDate },
      );
      try {
        const child = await ensureChildForClass(parent, meta, name, usedKeys);
        classes[classId] = { ...meta, subcollectionKey: child.key };
      } catch (error) {
        ztoolkit.log("Error ensuring class subcollection:", classId, error);
      }
    }

    return { ...next, classes };
  } finally {
    releaseFolderSync(parent.id);
  }
}

function desiredItemKeysForClass(
  document: CollectionSyllabusDocument,
  classId: string,
): Set<string> {
  const keys = new Set<string>();
  const classNumber = document.classes?.[classId]?.number;
  for (const [itemKey, assignments] of Object.entries(document.items || {})) {
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
    if (belongs) {
      keys.add(itemKey);
    }
  }
  return keys;
}

async function syncItemsForChild(
  parent: Zotero.Collection,
  child: Zotero.Collection,
  desiredKeys: Set<string>,
): Promise<void> {
  const desiredIds: number[] = [];
  for (const itemKey of desiredKeys) {
    const item = Zotero.Items.getByLibraryAndKey(parent.libraryID, itemKey);
    if (!item || !item.isRegularItem() || item.deleted) {
      continue;
    }
    desiredIds.push(item.id);
  }
  const desiredIdSet = new Set(desiredIds);

  const toRemove: number[] = [];
  const currentIds = new Set<number>();
  for (const item of child.getChildItems()) {
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
      await child.addItems(toAdd, { skipSelect: true });
    }
    if (toRemove.length) {
      await child.removeItems(toRemove, { skipSelect: true });
    }
  });
}

/**
 * Make each class folder contain exactly the regular items assigned to that
 * class in the note. Items stay on the parent collection.
 */
export async function syncClassSubcollectionItems(
  parent: Zotero.Collection,
  document: CollectionSyllabusDocument,
): Promise<void> {
  if (!collectionLibraryIsEditable(parent)) {
    return;
  }

  for (const [classId, meta] of Object.entries(document.classes || {})) {
    const child = childByKey(parent, meta?.subcollectionKey);
    if (!child) {
      continue;
    }
    rememberManaged(child, parent);
    try {
      await syncItemsForChild(
        parent,
        child,
        desiredItemKeysForClass(document, classId),
      );
    } catch (error) {
      ztoolkit.log("Error syncing class subcollection items:", classId, error);
    }
  }
}

export function enqueueClassSubcollectionItemSync(
  parent: Zotero.Collection,
  document: CollectionSyllabusDocument,
): Promise<void> {
  const previous = itemSyncChains.get(parent.id) || Promise.resolve();
  const next = previous
    .then(() => syncClassSubcollectionItems(parent, document))
    .catch((error) => {
      ztoolkit.log("Error syncing class subcollection items:", error);
    });
  itemSyncChains.set(parent.id, next);
  return next;
}

/**
 * Restore folders after a user deletes or renames one. Clears a stale key so
 * the next ensure creates a replacement. Does not read the deleted collection.
 */
export function clearStaleSubcollectionKey(
  document: CollectionSyllabusDocument,
  deletedCollectionId: number,
): CollectionSyllabusDocument {
  const managed = managedByCollectionId.get(deletedCollectionId);
  if (!managed) {
    return document;
  }
  managedByCollectionId.delete(deletedCollectionId);
  const classes: NonNullable<CollectionSyllabusDocument["classes"]> = {
    ...(document.classes || {}),
  };
  let changed = false;
  for (const [classId, meta] of Object.entries(classes)) {
    if (trimKey(meta?.subcollectionKey) !== managed.key) {
      continue;
    }
    const { subcollectionKey: _subcollectionKey, ...rest } = meta;
    classes[classId] = rest;
    changed = true;
  }
  return changed ? { ...document, classes } : document;
}

export function parentCollectionForManagedId(
  collectionId: number,
): Zotero.Collection | null {
  const parentId = getManagedParentCollectionId(collectionId);
  if (parentId == null) {
    return null;
  }
  return (
    getCachedCollectionById(parentId) ||
    Zotero.Collections.get(parentId) ||
    null
  );
}
