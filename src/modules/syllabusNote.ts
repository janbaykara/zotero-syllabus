/**
 * Collection syllabus note: find/create/parse/save plus the in-memory document cache.
 * Hot-path reads never call getNote(); they only index the parsed cache.
 */

import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { confirmPrompt } from "../utils/window";
import {
  CollectionSyllabusDocumentSchema,
  COLLECTION_SYLLABUS_DOCUMENT_VERSION,
  SettingsSyllabusMetadataSchema,
  classesToNumberKeyed,
  hydrateAssignment,
  mergeNumberKeyedClasses,
  persistAssignment,
  shouldCreateSubcollections,
  type CollectionSyllabusDocument,
  type ItemSyllabusAssignment,
  type SettingsCollectionDictionaryData,
  type SettingsSyllabusMetadata,
} from "../utils/schemas";
import {
  getCachedCollection,
  getCachedCollectionById,
  getCachedCollectionByKey,
  getCachedItem,
} from "../utils/cache";
import { pruneStaleCollectionPrefs } from "../utils/collectionPrefs";
import { createReentrantSerialQueue } from "../utils/serialQueue";
import {
  collectionLibraryIsEditable,
  getAllCollections,
} from "../utils/zotero";
import {
  getItemField,
  getItemTitle,
  isSyllabusMemberItem,
  readItemNote,
} from "../utils/items";
import {
  identifiersFromFields,
  type ItemLookupIds,
} from "../utils/identifiers";
import {
  classFolderNameMatches,
  classSubcollectionKeysChanged,
  clearManagedSubcollections,
  clearStaleSubcollectionKey,
  enqueueClassFolderEnsure,
  enqueueClassSubcollectionItemSync,
  ensureClassSubcollections,
  forgetManagedSubcollection,
  isClassFolderSyncHeld,
  parentCollectionForManagedId,
  rememberManagedClassFolder,
  rememberManagedSubcollections,
} from "./classSubcollections";
import {
  buildReadingScheduleDesiredByLibrary,
  clearManagedReadingScheduleCollection,
  enqueueReadingScheduleCollectionSync,
  getReadingScheduleCollectionContext,
  handleReadingScheduleCollectionChange,
  isManagedReadingScheduleCollection,
  isManagedReadingScheduleRootKey,
  registerReadingSchedulePrefObserver,
  restoreReadingScheduleCollectionItems,
  type ReadingScheduleSource,
  unregisterReadingSchedulePrefObserver,
} from "./readingScheduleCollection";
import {
  registerManagedClassFolderCheck,
  registerSyllabusRootCheck,
} from "./autoManagedCollection";
import { refreshManagedCollectionTrees } from "./managedCollectionTree";
import { absorbSyllabusExtraFromItems } from "./syllabusExtra";
import {
  PLUGIN_JSON_HEADING,
  isSyllabusNoteFile,
  isUnsupportedFutureNote,
  noteNeedsFormatPatch,
  parseSyllabusNote,
  serializeSyllabusNote,
  serializeSyllabusNoteFallback,
} from "./syllabusNoteHtml";

export { absorbSyllabusExtraFromItems } from "./syllabusExtra";
export {
  isSyllabusNoteFile,
  parseSyllabusNote,
  serializeSyllabusNote,
} from "./syllabusNoteHtml";

type CollectionIdentifier =
  | number
  | Parameters<typeof Zotero.Collections.getByLibraryAndKey>;

export const SYLLABUS_NOTE_TAG = "zotero-syllabus";
export const SYLLABUS_NOTE_TITLE = "Syllabus";
export const SYLLABUS_EXTRA_KEY = "syllabus";
export const SYLLABUS_NOTE_PRE_ATTR = "data-zotero-syllabus";

type CachedDocument = {
  collectionRef: string;
  noteId: number | null;
  noteVersion: number;
  document: CollectionSyllabusDocument;
  snapshot: string;
  skipReparseUntilVersion?: number;
};

const documentCache = new Map<string, CachedDocument>();
const collectionRefByNoteId = new Map<number, string>();
const documentWrites = createReentrantSerialQueue();
const documentListeners = new Set<() => void>();

let indexBuilt = false;
let itemDataReady = false;
let notifierID: string | null = null;
let documentGeneration = 0;
let indexReady: Promise<void> = Promise.resolve();

async function waitForLibraryItemData(): Promise<void> {
  const libraries = Zotero.Libraries.getAll();
  await Promise.all(
    libraries.map(async (library) => {
      try {
        if (typeof library.waitForDataLoad === "function") {
          await library.waitForDataLoad("item");
        }
      } catch (error) {
        ztoolkit.log(
          `Error waiting for items in library ${library.id}:`,
          error,
        );
      }
    }),
  );
  itemDataReady = true;
}

function emptyCachedDocument(ref: string): CachedDocument {
  const document = emptyCollectionDocument();
  return {
    collectionRef: ref,
    noteId: null,
    noteVersion: 0,
    document,
    snapshot: snapshotOf(document),
  };
}

export function subscribeToSyllabusDocumentChanges(
  listener: () => void,
): () => void {
  documentListeners.add(listener);
  return () => {
    documentListeners.delete(listener);
  };
}

function notifyDocumentListeners(): void {
  for (const listener of [...documentListeners]) {
    try {
      listener();
    } catch (error) {
      ztoolkit.log("Syllabus document listener error:", error);
    }
  }
}

function collectionRef(libraryID: number, key: string): string {
  return `${libraryID}:${key}`;
}

export function collectionRefFromCollection(
  collection: Zotero.Collection,
): string {
  return collectionRef(collection.libraryID, collection.key);
}

export function emptyCollectionDocument(): CollectionSyllabusDocument {
  return CollectionSyllabusDocumentSchema.parse({
    version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
    items: {},
  });
}

export function metadataFromDocument(
  document: CollectionSyllabusDocument,
): SettingsSyllabusMetadata {
  return SettingsSyllabusMetadataSchema.parse({
    ...document,
    classes: classesToNumberKeyed(document.classes),
  });
}

export function getHydratedItemAssignments(
  document: CollectionSyllabusDocument,
  itemKey: string,
): ItemSyllabusAssignment[] {
  return (document.items[itemKey] || []).map((assignment) =>
    hydrateAssignment(assignment, document.classes),
  );
}

function lookupIdsFromItem(item: Zotero.Item): ItemLookupIds {
  return identifiersFromFields({
    doi: getItemField(item, "DOI"),
    isbn: getItemField(item, "ISBN"),
    extra: getItemField(item, "extra"),
    url: getItemField(item, "url"),
    archiveID: getItemField(item, "archiveID"),
  });
}

function indexEntryFromIds(
  title: string,
  ids: ItemLookupIds,
): NonNullable<CollectionSyllabusDocument["itemIndex"]>[string] {
  return {
    title,
    ...(ids.doi ? { doi: ids.doi } : {}),
    ...(ids.isbn ? { isbn: ids.isbn } : {}),
    ...(ids.pmid ? { pmid: ids.pmid } : {}),
    ...(ids.pmcid ? { pmcid: ids.pmcid } : {}),
    ...(ids.arxiv ? { arxiv: ids.arxiv } : {}),
  };
}

export function buildItemIndex(
  collection: Zotero.Collection,
  document: CollectionSyllabusDocument,
): NonNullable<CollectionSyllabusDocument["itemIndex"]> {
  const index: NonNullable<CollectionSyllabusDocument["itemIndex"]> = {};
  for (const itemKey of Object.keys(document.items || {})) {
    const item = Zotero.Items.getByLibraryAndKey(collection.libraryID, itemKey);
    if (!item || !isSyllabusMemberItem(item)) {
      continue;
    }
    index[itemKey] = indexEntryFromIds(
      getItemTitle(item),
      lookupIdsFromItem(item),
    );
  }
  return index;
}

export function remapDocumentItemKeys(
  document: CollectionSyllabusDocument,
  items: Zotero.Item[],
): CollectionSyllabusDocument {
  const regularItems = items.filter((item) => {
    try {
      return isSyllabusMemberItem(item);
    } catch {
      return false;
    }
  });
  const byDoi = new Map<string, string>();
  const byIsbn = new Map<string, string>();
  const byPmid = new Map<string, string>();
  const byPmcid = new Map<string, string>();
  const byArxiv = new Map<string, string>();
  const byTitle = new Map<string, string>();
  const existingKeys = new Set<string>();
  for (const item of regularItems) {
    existingKeys.add(item.key);
    const ids = lookupIdsFromItem(item);
    const title = getItemTitle(item).toLowerCase();
    if (ids.doi) {
      byDoi.set(ids.doi, item.key);
    }
    if (ids.isbn) {
      byIsbn.set(ids.isbn, item.key);
    }
    if (ids.pmid) {
      byPmid.set(ids.pmid, item.key);
    }
    if (ids.pmcid) {
      byPmcid.set(ids.pmcid, item.key);
    }
    if (ids.arxiv) {
      byArxiv.set(ids.arxiv, item.key);
    }
    if (title && !byTitle.has(title)) {
      byTitle.set(title, item.key);
    }
  }

  const itemIndex = document.itemIndex || {};
  const itemsOut: CollectionSyllabusDocument["items"] = {};
  for (const [oldKey, assignments] of Object.entries(document.items || {})) {
    const meta = itemIndex[oldKey];
    const indexed = identifiersFromFields({
      doi: meta?.doi,
      isbn: meta?.isbn,
      pmid: meta?.pmid,
      pmcid: meta?.pmcid,
      arxiv: meta?.arxiv,
    });
    const title = meta?.title?.trim().toLowerCase();
    const newKey =
      (indexed.doi && byDoi.get(indexed.doi)) ||
      (indexed.isbn && byIsbn.get(indexed.isbn)) ||
      (indexed.pmid && byPmid.get(indexed.pmid)) ||
      (indexed.pmcid && byPmcid.get(indexed.pmcid)) ||
      (indexed.arxiv && byArxiv.get(indexed.arxiv)) ||
      (title && byTitle.get(title)) ||
      (existingKeys.has(oldKey) ? oldKey : undefined) ||
      oldKey;
    itemsOut[newKey] = [...(itemsOut[newKey] || []), ...assignments];
  }

  const { itemIndex: _itemIndex, ...rest } = document;
  return { ...rest, items: itemsOut };
}

const REPLACED_ITEM_PREDICATE = "dc:replaces";

/**
 * Move assignment arrays from merged-away item keys onto surviving keys.
 * Concatenates when the survivor already has assignments. Returns the same
 * document object when none of the old keys are present.
 */
export function remapDocumentItemKeysByMap(
  document: CollectionSyllabusDocument,
  keyMap: Record<string, string>,
): CollectionSyllabusDocument {
  const remaps: Array<[string, string]> = [];
  for (const [oldKey, newKey] of Object.entries(keyMap)) {
    if (!oldKey || !newKey || oldKey === newKey) {
      continue;
    }
    if (!(oldKey in (document.items || {}))) {
      continue;
    }
    remaps.push([oldKey, newKey]);
  }
  if (!remaps.length) {
    return document;
  }

  const itemsOut: CollectionSyllabusDocument["items"] = {
    ...(document.items || {}),
  };
  const itemIndex = document.itemIndex ? { ...document.itemIndex } : undefined;

  for (const [oldKey, newKey] of remaps) {
    const assignments = itemsOut[oldKey];
    delete itemsOut[oldKey];
    if (assignments?.length) {
      itemsOut[newKey] = [...(itemsOut[newKey] || []), ...assignments];
    }
    if (itemIndex && oldKey in itemIndex) {
      if (!(newKey in itemIndex)) {
        itemIndex[newKey] = itemIndex[oldKey];
      }
      delete itemIndex[oldKey];
    }
  }

  return itemIndex
    ? { ...document, items: itemsOut, itemIndex }
    : { ...document, items: itemsOut };
}

/**
 * Remove assignment rows (and itemIndex) for keys that are no longer in the
 * library. Used after a plain delete — merges remap via dc:replaces first.
 */
export function omitDocumentItemKeys(
  document: CollectionSyllabusDocument,
  keys: Iterable<string>,
): CollectionSyllabusDocument {
  const gone = new Set<string>();
  for (const key of keys) {
    if (key && key in (document.items || {})) {
      gone.add(key);
    }
  }
  if (!gone.size) {
    return document;
  }
  const items: CollectionSyllabusDocument["items"] = {
    ...(document.items || {}),
  };
  for (const key of gone) {
    delete items[key];
  }
  const itemIndex = document.itemIndex ? { ...document.itemIndex } : undefined;
  if (itemIndex) {
    for (const key of gone) {
      delete itemIndex[key];
    }
  }
  return itemIndex ? { ...document, items, itemIndex } : { ...document, items };
}

export function missingDocumentItemKeys(
  document: CollectionSyllabusDocument,
  libraryID: number,
): string[] {
  const missing: string[] = [];
  for (const key of Object.keys(document.items || {})) {
    let item: Zotero.Item | false | undefined;
    try {
      item = Zotero.Items.getByLibraryAndKey(libraryID, key);
    } catch {
      item = false;
    }
    if (!item) {
      missing.push(key);
    }
  }
  return missing;
}

function replacedItemPredicate(): string {
  try {
    const predicate = (
      Zotero as typeof Zotero & {
        Relations?: { replacedItemPredicate?: string };
      }
    ).Relations?.replacedItemPredicate;
    if (typeof predicate === "string" && predicate) {
      return predicate;
    }
  } catch {
    // Relations API may be unavailable in tests.
  }
  return REPLACED_ITEM_PREDICATE;
}

function itemKeyFromUri(uri: string): string | null {
  const match = String(uri).match(/\/items\/([^/?#]+)/i);
  const key = match?.[1]?.trim();
  return key || null;
}

function itemUriForLibraryAndKey(
  libraryID: number,
  key: string,
  item?: Zotero.Item | false | null,
): string | null {
  if (item) {
    try {
      const uri = Zotero.URI.getItemURI(item);
      if (uri) {
        return uri;
      }
    } catch {
      // Fall through to library URI.
    }
  }
  try {
    const libraryURI = Zotero.URI.getLibraryURI(libraryID);
    if (libraryURI) {
      return `${String(libraryURI).replace(/\/$/, "")}/items/${key}`;
    }
  } catch {
    // URI helpers may be unavailable.
  }
  return null;
}

async function survivorForReplacedUri(
  uri: string,
): Promise<Zotero.Item | null> {
  try {
    const relations = (
      Zotero as typeof Zotero & {
        Relations?: {
          getByPredicateAndObject?: (
            objectType: string,
            predicate: string,
            object: string,
          ) => Promise<Zotero.Item[]>;
        };
      }
    ).Relations;
    const getByPredicateAndObject = relations?.getByPredicateAndObject;
    if (typeof getByPredicateAndObject !== "function") {
      return null;
    }
    const replacers = await getByPredicateAndObject(
      "item",
      replacedItemPredicate(),
      uri,
    );
    if (!Array.isArray(replacers)) {
      return null;
    }
    return (
      replacers.find((candidate) => {
        try {
          return candidate && !candidate.deleted && candidate.isRegularItem();
        } catch {
          return false;
        }
      }) || null
    );
  } catch (error) {
    ztoolkit.log("Error looking up dc:replaces survivor:", error);
    return null;
  }
}

function relationObjectUris(item: Zotero.Item): string[] {
  const predicate = replacedItemPredicate() as _ZoteroTypes.RelationsPredicate;
  try {
    if (typeof item.getRelationsByPredicate === "function") {
      return item.getRelationsByPredicate(predicate) || [];
    }
  } catch {
    // Fall through to getRelations().
  }
  try {
    const relations = item.getRelations?.() || {};
    const value = (relations as Record<string, string | string[]>)[predicate];
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  } catch {
    return [];
  }
}

function replacedItemKeysFromItem(item: Zotero.Item): string[] {
  const keys: string[] = [];
  for (const uri of relationObjectUris(item)) {
    const key = itemKeyFromUri(uri);
    if (key && key !== item.key) {
      keys.push(key);
    }
  }
  return keys;
}

async function survivorFromCollectionMates(
  item: Zotero.Item,
  uri: string,
): Promise<Zotero.Item | null> {
  const collections: Zotero.Collection[] = [];
  const seen = new Set<number>();
  for (const [ref, entry] of documentCache.entries()) {
    if (libraryIDFromDocumentCacheRef(ref) !== item.libraryID) {
      continue;
    }
    if (!(item.key in (entry.document.items || {}))) {
      continue;
    }
    const collection = collectionFromCacheRef(ref);
    if (!collection || seen.has(collection.id)) {
      continue;
    }
    seen.add(collection.id);
    collections.push(collection);
  }
  try {
    for (const collectionId of item.getCollections() || []) {
      if (seen.has(collectionId)) {
        continue;
      }
      const collection =
        getCachedCollectionById(collectionId) ||
        Zotero.Collections.get(collectionId);
      if (
        !collection ||
        collection.libraryID !== item.libraryID ||
        seen.has(collection.id)
      ) {
        continue;
      }
      seen.add(collection.id);
      collections.push(collection);
    }
  } catch {
    // Trashed items may already be removed from collections.
  }
  for (const collection of collections) {
    let children: Zotero.Item[] = [];
    try {
      const raw = collection.getChildItems();
      children = Array.isArray(raw) ? raw : [];
    } catch {
      continue;
    }
    for (const candidate of children) {
      try {
        if (
          !candidate ||
          candidate.id === item.id ||
          candidate.deleted ||
          !candidate.isRegularItem()
        ) {
          continue;
        }
        try {
          await candidate.loadDataType("relation");
        } catch {
          // Relations may already be loaded.
        }
        const uris = relationObjectUris(candidate);
        if (
          uris.includes(uri) ||
          uris.some((objectUri) => itemKeyFromUri(objectUri) === item.key)
        ) {
          return candidate;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function afterDatabaseTransaction(): Promise<void> {
  for (let i = 0; i < 200; i++) {
    try {
      if (!Zotero.DB.inTransaction()) {
        return;
      }
    } catch {
      return;
    }
    await delayMs(10);
  }
}

function anyCachedDocumentHasItemKey(
  itemKey: string,
  libraryID: number,
): boolean {
  for (const [ref, entry] of documentCache.entries()) {
    if (libraryIDFromDocumentCacheRef(ref) !== libraryID) {
      continue;
    }
    if (itemKey in (entry.document.items || {})) {
      return true;
    }
  }
  return false;
}

/**
 * Parse `libraryID` from a document cache ref (`libraryID:collectionKey`).
 * Item and collection keys are unique per library, not globally.
 */
export function libraryIDFromDocumentCacheRef(ref: string): number | null {
  const colon = ref.indexOf(":");
  if (colon <= 0) {
    return null;
  }
  const libraryID = parseInt(ref.slice(0, colon), 10);
  return Number.isNaN(libraryID) ? null : libraryID;
}

/**
 * Keys to remap in one cached syllabus note. Returns null when the note is in
 * a different library than the merge, or when none of the old keys are present.
 */
export function selectItemKeyRemapForDocument(
  documentCacheRef: string,
  mergeLibraryID: number,
  documentItemKeys: Iterable<string>,
  keyMap: Record<string, string>,
): Record<string, string> | null {
  if (libraryIDFromDocumentCacheRef(documentCacheRef) !== mergeLibraryID) {
    return null;
  }
  const present = new Set(documentItemKeys);
  const map: Record<string, string> = {};
  for (const [oldKey, newKey] of Object.entries(keyMap)) {
    if (!oldKey || !newKey || oldKey === newKey) {
      continue;
    }
    if (present.has(oldKey)) {
      map[oldKey] = newKey;
    }
  }
  return Object.keys(map).length ? map : null;
}

function collectionFromCacheRef(ref: string): Zotero.Collection | null {
  const libraryID = libraryIDFromDocumentCacheRef(ref);
  if (libraryID == null) {
    return null;
  }
  const key = ref.slice(ref.indexOf(":") + 1);
  if (!key) {
    return null;
  }
  return (
    getCachedCollectionByKey(libraryID, key) ||
    Zotero.Collections.getByLibraryAndKey(libraryID, key) ||
    null
  );
}

async function applyItemKeyRemapToCachedDocuments(
  keyMap: Record<string, string>,
  libraryID: number,
): Promise<void> {
  const remaps = Object.entries(keyMap).filter(
    ([oldKey, newKey]) => oldKey && newKey && oldKey !== newKey,
  );
  if (!remaps.length) {
    return;
  }

  for (const [ref, entry] of documentCache.entries()) {
    const map = selectItemKeyRemapForDocument(
      ref,
      libraryID,
      Object.keys(entry.document.items || {}),
      keyMap,
    );
    if (!map) {
      continue;
    }
    const collection = collectionFromCacheRef(ref);
    if (!collection || collection.libraryID !== libraryID) {
      continue;
    }
    const remapped = remapDocumentItemKeysByMap(entry.document, map);
    if (remapped === entry.document) {
      continue;
    }
    try {
      await mutateCollectionDocument(collection, (document) =>
        remapDocumentItemKeysByMap(document, map),
      );
    } catch (error) {
      ztoolkit.log(
        "Error persisting merged item keys in syllabus note:",
        error,
      );
    }
  }
}

async function remapMergedKeysFromItemIds(
  ids: number[],
  event: string,
): Promise<void> {
  const keyMapsByLibrary = new Map<number, Record<string, string>>();
  const addRemap = (
    libraryID: number,
    oldKey: string,
    newKey: string,
  ): void => {
    if (!oldKey || !newKey || oldKey === newKey) {
      return;
    }
    const map = keyMapsByLibrary.get(libraryID) || {};
    map[oldKey] = newKey;
    keyMapsByLibrary.set(libraryID, map);
  };
  try {
    for (const id of ids) {
      let item: Zotero.Item | false | undefined;
      try {
        item = Zotero.Items.get(id);
      } catch {
        item = undefined;
      }
      if (!item) {
        item = getCachedItem(id);
      }
      if (!item) {
        continue;
      }
      try {
        if (item.isNote() || !item.isRegularItem()) {
          continue;
        }
      } catch {
        continue;
      }

      if (event === "trash" || item.deleted) {
        if (!anyCachedDocumentHasItemKey(item.key, item.libraryID)) {
          continue;
        }
        const uri = itemUriForLibraryAndKey(item.libraryID, item.key, item);
        if (!uri) {
          continue;
        }
        const survivor =
          (await survivorForReplacedUri(uri)) ||
          (await survivorFromCollectionMates(item, uri));
        if (
          !survivor ||
          survivor.key === item.key ||
          survivor.libraryID !== item.libraryID
        ) {
          continue;
        }
        addRemap(item.libraryID, item.key, survivor.key);
        continue;
      }

      if (event !== "modify") {
        continue;
      }
      try {
        await item.loadDataType("relation");
      } catch {
        // Relations may already be loaded.
      }
      const replacedKeys = replacedItemKeysFromItem(item);
      for (const oldKey of replacedKeys) {
        if (!anyCachedDocumentHasItemKey(oldKey, item.libraryID)) {
          continue;
        }
        addRemap(item.libraryID, oldKey, item.key);
      }
    }

    for (const [libraryID, keyMap] of keyMapsByLibrary) {
      if (!Object.keys(keyMap).length) {
        continue;
      }
      await applyItemKeyRemapToCachedDocuments(keyMap, libraryID);
    }
  } catch (error) {
    ztoolkit.log("Error remapping merged item keys in syllabus notes:", error);
    throw error;
  }
}

async function dropMissingItemKeysFromCachedDocuments(): Promise<void> {
  for (const collection of getAllCollections()) {
    const ref = collectionRefFromCollection(collection);
    const entry = documentCache.get(ref);
    if (!entry?.noteId || isDocumentWriteInFlight(ref)) {
      continue;
    }
    const missing = missingDocumentItemKeys(
      entry.document,
      collection.libraryID,
    );
    if (!missing.length) {
      continue;
    }
    try {
      await mutateCollectionDocument(collection, (document) =>
        omitDocumentItemKeys(
          document,
          missingDocumentItemKeys(document, collection.libraryID),
        ),
      );
    } catch (error) {
      ztoolkit.log(
        "Error dropping deleted item keys from syllabus note:",
        error,
      );
    }
  }
}

async function mergedKeyMapForOrphanedKeys(
  libraryID: number,
  document: CollectionSyllabusDocument,
): Promise<Record<string, string>> {
  const keyMap: Record<string, string> = {};
  for (const itemKey of Object.keys(document.items || {})) {
    let item: Zotero.Item | false | undefined;
    try {
      item = Zotero.Items.getByLibraryAndKey(libraryID, itemKey);
    } catch {
      item = false;
    }
    if (item && !item.deleted) {
      try {
        if (item.isRegularItem()) {
          continue;
        }
      } catch {
        continue;
      }
    }
    const uri = itemUriForLibraryAndKey(libraryID, itemKey, item || undefined);
    if (!uri) {
      continue;
    }
    const survivor =
      (await survivorForReplacedUri(uri)) ||
      (item ? await survivorFromCollectionMates(item, uri) : null);
    if (
      survivor &&
      survivor.key !== itemKey &&
      survivor.libraryID === libraryID
    ) {
      keyMap[itemKey] = survivor.key;
    }
  }
  return keyMap;
}

function persistDocument(
  document: CollectionSyllabusDocument,
): CollectionSyllabusDocument {
  const classes = { ...(document.classes || {}) };
  const items: CollectionSyllabusDocument["items"] = {};
  for (const [itemKey, assignments] of Object.entries(document.items || {})) {
    const persisted = assignments.map((assignment) =>
      persistAssignment(assignment, classes),
    );
    if (persisted.length) {
      items[itemKey] = persisted;
    }
  }
  return {
    ...document,
    version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
    classes,
    items,
  };
}

function snapshotOf(document: CollectionSyllabusDocument): string {
  return JSON.stringify(document);
}

/** Plugin sandbox global is a plain object; `structuredClone` is often missing. */
function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function logSyllabusError(message: string, error: unknown): void {
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack || ""}`
      : String(error);
  ztoolkit.log(message, detail);
  try {
    Zotero.log(`${message} ${detail}`, "error");
  } catch {
    // Error console may be unavailable during shutdown.
  }
}

function setCacheEntry(
  ref: string,
  noteId: number | null,
  noteVersion: number,
  document: CollectionSyllabusDocument,
): CachedDocument {
  const snapshot = snapshotOf(document);
  const existing = documentCache.get(ref);
  if (
    existing &&
    existing.noteId === noteId &&
    existing.noteVersion === noteVersion &&
    existing.snapshot === snapshot
  ) {
    return existing;
  }
  const entry: CachedDocument = {
    collectionRef: ref,
    noteId,
    noteVersion,
    document,
    snapshot,
  };
  documentCache.set(ref, entry);
  if (noteId !== null) {
    collectionRefByNoteId.set(noteId, ref);
  }
  documentGeneration++;
  notifyDocumentListeners();
  return entry;
}

function itemHasSyllabusTag(item: Zotero.Item): boolean | null {
  try {
    return item.hasTag(SYLLABUS_NOTE_TAG);
  } catch {
    // Tags often aren't loaded on collection children.
    return null;
  }
}

function isSyllabusNote(item: Zotero.Item): boolean {
  try {
    if (!item.isNote() || !item.isTopLevelItem()) {
      return false;
    }
  } catch {
    return false;
  }
  return itemHasSyllabusTag(item) === true;
}

function isLiveSyllabusNote(
  item: Zotero.Item,
  collection: Zotero.Collection,
): boolean {
  try {
    if (item.deleted || !item.isNote() || !item.isTopLevelItem()) {
      return false;
    }
    if (!item.getCollections().includes(collection.id)) {
      return false;
    }
    const tagged = itemHasSyllabusTag(item);
    // Cached notes may not have tags loaded; don't treat that as missing.
    return tagged !== false;
  } catch {
    return false;
  }
}

function isEmptyCollectionDocument(
  document: CollectionSyllabusDocument | null | undefined,
): boolean {
  if (!document) {
    return true;
  }
  return snapshotOf(document) === snapshotOf(emptyCollectionDocument());
}

/** Prefer the note when it parses. Do not union classes/items with the cache
 *  or a two-device edit can resurrect classes the note already deleted. */
export function documentForWrite(
  fromNote: CollectionSyllabusDocument | null,
  cached: CollectionSyllabusDocument | undefined,
): CollectionSyllabusDocument {
  if (fromNote) {
    return fromNote;
  }
  const cachedDoc =
    cached && !isEmptyCollectionDocument(cached) ? cached : null;
  return cachedDoc || emptyCollectionDocument();
}

export type IncomingNoteCache = {
  noteId: number | null;
  noteVersion: number;
  document: CollectionSyllabusDocument;
};

export type IncomingNoteDecision = "apply" | "ignore" | "keep-cache";

/**
 * Whether a note `modify` should replace the in-memory document.
 *
 * Better Notes treats both-sides-edited notes as a conflict instead of
 * dropping the incoming side (wiki: Note Synchronization). We cannot show a
 * merge UI, but we must not ignore a strictly newer parseable note while a
 * local write is in flight — that is how a sync-in edit disappears.
 *
 * During a write we still ignore empty/unparseable payloads so an echo of
 * our own saveTx cannot bump `noteVersion` and then hide the real note.
 */
export function shouldAdoptIncomingNote(options: {
  writeInFlight: boolean;
  cached: IncomingNoteCache | undefined;
  itemId: number;
  itemVersion: number;
  parsed: CollectionSyllabusDocument | null;
}): IncomingNoteDecision {
  const { writeInFlight, cached, itemId, itemVersion, parsed } = options;
  if (cached && cached.noteId === itemId && cached.noteVersion >= itemVersion) {
    return "ignore";
  }
  const parsedUsable = Boolean(
    parsed &&
    !(
      isEmptyCollectionDocument(parsed) &&
      cached &&
      !isEmptyCollectionDocument(cached.document)
    ),
  );
  if (writeInFlight) {
    if (parsedUsable && (!cached || itemVersion > cached.noteVersion)) {
      return "apply";
    }
    return "ignore";
  }
  if (!parsedUsable) {
    return "keep-cache";
  }
  return "apply";
}

function collectionNoteCandidates(
  collection: Zotero.Collection,
  includeDeleted = false,
): Zotero.Item[] {
  let children: Zotero.Item[] = [];
  try {
    children = collection.getChildItems(false, includeDeleted);
  } catch (error) {
    ztoolkit.log("Error listing collection items for syllabus note:", error);
    return [];
  }
  return children.filter((item) => {
    try {
      if (!item.isNote() || !item.isTopLevelItem()) {
        return false;
      }
      return includeDeleted || !item.deleted;
    } catch {
      return false;
    }
  });
}

function looksLikeSyllabusNote(item: Zotero.Item): boolean {
  try {
    if (!item.isNote()) {
      return false;
    }
    const tagged = itemHasSyllabusTag(item);
    if (tagged === true) {
      return true;
    }
    try {
      const title = item.getNoteTitle() || "";
      if (
        title === SYLLABUS_NOTE_TITLE ||
        title.startsWith(SYLLABUS_NOTE_TITLE)
      ) {
        return true;
      }
    } catch {
      // Title isn't required if the tag already matched.
    }
    const html = readItemNote(item);
    return (
      html.includes(SYLLABUS_NOTE_PRE_ATTR) ||
      html.includes(PLUGIN_JSON_HEADING)
    );
  } catch {
    return false;
  }
}

function findSyllabusNoteUncached(
  collection: Zotero.Collection,
  includeDeleted = false,
): Zotero.Item | null {
  const matches = collectionNoteCandidates(collection, includeDeleted).filter(
    (item) => looksLikeSyllabusNote(item),
  );
  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => a.id - b.id);
  return matches[0];
}

/** Re-read the collection note from Zotero; does not trust the in-memory cache. */
export function peekPersistedSyllabusDocument(
  collection: Zotero.Collection,
): CollectionSyllabusDocument | null {
  const note = findSyllabusNoteUncached(collection);
  if (!note) {
    return null;
  }
  try {
    return parseSyllabusNote(readItemNote(note));
  } catch (error) {
    ztoolkit.log("Error peeking persisted syllabus note:", error);
    return null;
  }
}

async function noteHtmlForDocument(
  document: CollectionSyllabusDocument,
  collection?: Zotero.Collection | null,
): Promise<string> {
  try {
    return await serializeSyllabusNote(document, collection);
  } catch (error) {
    ztoolkit.log(
      "Error serializing readable syllabus note, using JSON fallback:",
      error,
    );
    return serializeSyllabusNoteFallback(document);
  }
}

async function persistSyllabusNote(
  note: Zotero.Item,
  collection: Zotero.Collection,
  html: string,
  fallbackHtml: string,
): Promise<Zotero.Item> {
  note.libraryID = collection.libraryID;

  // Zotero 8: create the item first. setNote/addToCollection/addTag on an
  // unsaved note are ignored or throw, which is why Add Class created nothing.
  if (!note.id) {
    await note.saveTx({ skipSelect: true });
  }

  try {
    note.setNote(html);
  } catch (error) {
    ztoolkit.log("setNote(html) failed, using JSON fallback:", error);
    note.setNote(fallbackHtml);
  }

  try {
    note.addToCollection(collection.id);
  } catch (error) {
    ztoolkit.log("addToCollection failed, trying collection.addItem:", error);
    if (note.id) {
      try {
        await collection.addItem(note.id);
      } catch (error2) {
        ztoolkit.log("collection.addItem failed:", error2);
      }
    }
  }

  try {
    note.addTag(SYLLABUS_NOTE_TAG);
  } catch (error) {
    ztoolkit.log("Error tagging syllabus note:", error);
  }

  await note.saveTx({ skipSelect: true });
  return note;
}

function detachNoteFromCache(noteId: number): void {
  const ref = collectionRefByNoteId.get(noteId);
  collectionRefByNoteId.delete(noteId);
  if (!ref) {
    return;
  }
  const cached = documentCache.get(ref);
  if (!cached || cached.noteId !== noteId) {
    return;
  }
  cached.noteId = null;
  cached.noteVersion = 0;
  documentGeneration++;
  notifyDocumentListeners();
}

function resolveCollection(
  collectionId: CollectionIdentifier | Zotero.Collection,
): Zotero.Collection | null {
  try {
    if (
      collectionId &&
      typeof collectionId === "object" &&
      "id" in collectionId
    ) {
      return collectionId as Zotero.Collection;
    }
    const cached = getCachedCollection(collectionId as CollectionIdentifier);
    if (cached) {
      return cached;
    }
    if (typeof collectionId === "number") {
      return Zotero.Collections.get(collectionId) || null;
    }
    return null;
  } catch (error) {
    logSyllabusError("Error resolving collection for syllabus note:", error);
    return null;
  }
}

/** Class folders are not syllabi; reads and writes go to the parent note. */
export function resolveSyllabusRoot(
  collection: Zotero.Collection,
): Zotero.Collection {
  // Reading schedule folders are never syllabi and must not inherit a parent note.
  if (getReadingScheduleCollectionContext(collection.id)) {
    return collection;
  }
  const managedParent = parentCollectionForManagedId(collection.id);
  if (managedParent) {
    return managedParent;
  }
  if (!collection.parentID) {
    return collection;
  }
  const parent =
    getCachedCollectionById(collection.parentID) ||
    Zotero.Collections.get(collection.parentID);
  if (!parent) {
    return collection;
  }
  const parentEntry = documentCache.get(collectionRefFromCollection(parent));
  if (parentEntry?.noteId) {
    return parent;
  }
  const isManagedChild = Object.values(
    parentEntry?.document.classes || {},
  ).some((meta) => meta?.subcollectionKey === collection.key);
  return isManagedChild ? parent : collection;
}

function resolveSyllabusCollection(
  collectionId: CollectionIdentifier | Zotero.Collection,
): Zotero.Collection | null {
  const collection = resolveCollection(collectionId);
  return collection ? resolveSyllabusRoot(collection) : null;
}

export type ClassSubcollectionContext = {
  parent: Zotero.Collection;
  classId: string | null;
  classNumber: number | null;
};

/** If this collection is a folder under a syllabus, return the parent (and class when known). */
export function getClassSubcollectionContext(
  collectionId: CollectionIdentifier | Zotero.Collection,
): ClassSubcollectionContext | null {
  const collection = resolveCollection(collectionId);
  if (!collection) {
    return null;
  }
  if (
    documentCache.get(collectionRefFromCollection(collection))?.noteId != null
  ) {
    return null;
  }
  const parent = resolveSyllabusRoot(collection);
  if (parent.id === collection.id) {
    return null;
  }
  const document = loadDocumentForCollection(parent).document;
  const classes = document.classes || {};
  for (const [classId, meta] of Object.entries(classes)) {
    if (!meta?.number) {
      continue;
    }
    if (
      meta.subcollectionKey === collection.key ||
      classFolderNameMatches(document, meta, collection.name)
    ) {
      rememberManagedClassFolder(collection, parent);
      return { parent, classId, classNumber: meta.number };
    }
  }
  return null;
}

registerManagedClassFolderCheck((collectionId) => {
  const context = getClassSubcollectionContext(collectionId);
  return context != null && context.classNumber != null;
});

registerSyllabusRootCheck((collectionId) => {
  if (getReadingScheduleCollectionContext(collectionId)) {
    return false;
  }
  const collection = resolveCollection(collectionId);
  if (!collection) {
    return false;
  }
  return (
    documentCache.get(collectionRefFromCollection(collection))?.noteId != null
  );
});

function parseDocumentFromNote(
  note: Zotero.Item,
  fallback?: CollectionSyllabusDocument,
): CollectionSyllabusDocument {
  try {
    return (
      parseSyllabusNote(readItemNote(note)) ||
      fallback ||
      emptyCollectionDocument()
    );
  } catch (error) {
    ztoolkit.log("Error parsing syllabus note during cache load:", error);
    return fallback || emptyCollectionDocument();
  }
}

function findLoadedSyllabusNote(
  collection: Zotero.Collection,
): Zotero.Item | null {
  const matches = collectionNoteCandidates(collection).filter((item) =>
    looksLikeSyllabusNote(item),
  );
  if (matches.length === 0) {
    return null;
  }
  matches.sort((a, b) => a.id - b.id);
  return matches[0];
}

function loadDocumentForCollection(
  collection: Zotero.Collection,
): CachedDocument {
  const ref = collectionRefFromCollection(collection);
  const cached = documentCache.get(ref);
  if (cached && isDocumentWriteInFlight(ref)) {
    return cached;
  }
  if (cached?.noteId != null) {
    const note =
      getCachedItem(cached.noteId) || Zotero.Items.get(cached.noteId) || null;
    if (note && isLiveSyllabusNote(note, collection)) {
      const cacheIsUsable =
        note.version <= cached.noteVersion &&
        (!isEmptyCollectionDocument(cached.document) ||
          cached.skipReparseUntilVersion === note.version);
      if (cacheIsUsable) {
        return cached;
      }
      let parsed: CollectionSyllabusDocument | null = null;
      try {
        parsed = parseSyllabusNote(readItemNote(note));
      } catch (error) {
        ztoolkit.log("Error re-reading syllabus note:", error);
      }
      if (parsed && !isEmptyCollectionDocument(parsed)) {
        return setCacheEntry(ref, note.id, note.version, parsed);
      }
      // Keep a non-empty in-memory document if Zotero rewrote note HTML.
      if (!isEmptyCollectionDocument(cached.document)) {
        cached.noteVersion = note.version;
        return cached;
      }
      cached.noteVersion = note.version;
      cached.skipReparseUntilVersion = note.version;
      return cached;
    } else {
      detachNoteFromCache(cached.noteId);
    }
  }

  if (cached && !isEmptyCollectionDocument(cached.document)) {
    return cached;
  }

  // Confirmed miss: returning a new empty setCacheEntry() here used to bump
  // documentGeneration on every ItemPane read, which retriggered
  // useSyllabusDocumentGeneration in a tight loop (100% CPU).
  if (cached && cached.noteId == null && itemDataReady) {
    return cached;
  }

  const note = findLoadedSyllabusNote(collection);
  if (!note) {
    // Collection children are empty until item data is loaded. Caching a miss
    // here would permanently hide syllabus notes (and class-folder icons).
    if (!itemDataReady) {
      return emptyCachedDocument(ref);
    }
    return setCacheEntry(ref, null, 0, emptyCollectionDocument());
  }
  return setCacheEntry(ref, note.id, note.version, parseDocumentFromNote(note));
}

export function getCollectionDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
): CollectionSyllabusDocument {
  const collection = resolveSyllabusCollection(collectionId);
  if (!collection) {
    return emptyCollectionDocument();
  }
  return loadDocumentForCollection(collection).document;
}

export function getCollectionDocumentSnapshot(
  collectionId: CollectionIdentifier | Zotero.Collection,
): string {
  const collection = resolveSyllabusCollection(collectionId);
  if (!collection) {
    return snapshotOf(emptyCollectionDocument());
  }
  return loadDocumentForCollection(collection).snapshot;
}

export function getSyllabusNoteId(
  collectionId: CollectionIdentifier | Zotero.Collection,
): number | null {
  const collection = resolveSyllabusCollection(collectionId);
  if (!collection) {
    return null;
  }
  return loadDocumentForCollection(collection).noteId;
}

export function getDocumentGeneration(): number {
  return documentGeneration;
}

function ensureIndex(): void {
  if (indexBuilt) {
    return;
  }
  for (const collection of getAllCollections()) {
    try {
      loadDocumentForCollection(collection);
    } catch (error) {
      ztoolkit.log("Error loading collection syllabus document:", error);
    }
  }
  indexBuilt = true;
}

async function rebuildDocumentIndex(): Promise<void> {
  await waitForLibraryItemData();
  try {
    pruneStaleCollectionPrefs();
  } catch (error) {
    ztoolkit.log("Error pruning stale collection prefs:", error);
  }
  const notesToPatch: Zotero.Collection[] = [];
  for (const collection of getAllCollections()) {
    try {
      const note = findSyllabusNoteUncached(collection);
      if (!note) {
        continue;
      }
      const html = readItemNote(note);
      let parsed: CollectionSyllabusDocument | null = null;
      try {
        parsed = parseSyllabusNote(html);
      } catch {
        parsed = null;
      }
      const ref = collectionRefFromCollection(collection);
      if (isDocumentWriteInFlight(ref)) {
        continue;
      }
      const cached = documentCache.get(ref);
      if (
        parsed &&
        !(
          isEmptyCollectionDocument(parsed) &&
          cached &&
          !isEmptyCollectionDocument(cached.document)
        )
      ) {
        setCacheEntry(ref, note.id, note.version, parsed);
        if (noteNeedsFormatPatch(html, parsed)) {
          notesToPatch.push(collection);
        }
      } else if (cached) {
        cached.noteId = note.id;
        cached.noteVersion = note.version;
        collectionRefByNoteId.set(note.id, ref);
      } else if (parsed) {
        setCacheEntry(ref, note.id, note.version, parsed);
        if (noteNeedsFormatPatch(html, parsed)) {
          notesToPatch.push(collection);
        }
      }
    } catch (error) {
      ztoolkit.log("Error indexing syllabus note:", error);
    }
  }
  indexBuilt = true;
  documentGeneration++;
  notifyDocumentListeners();
  const mergeKeyMaps = new Map<number, Record<string, string>>();
  for (const collection of getAllCollections()) {
    const ref = collectionRefFromCollection(collection);
    const entry = documentCache.get(ref);
    if (!entry?.noteId || isDocumentWriteInFlight(ref)) {
      continue;
    }
    try {
      const keyMap = await mergedKeyMapForOrphanedKeys(
        collection.libraryID,
        entry.document,
      );
      const missing = missingDocumentItemKeys(
        entry.document,
        collection.libraryID,
      );
      if (!Object.keys(keyMap).length && !missing.length) {
        continue;
      }
      if (Object.keys(keyMap).length) {
        mergeKeyMaps.set(collection.id, keyMap);
      }
      if (!notesToPatch.some((candidate) => candidate.id === collection.id)) {
        notesToPatch.push(collection);
      }
    } catch (error) {
      ztoolkit.log("Error resolving merged item keys in syllabus note:", error);
    }
  }
  const patchedIds = new Set(notesToPatch.map((collection) => collection.id));
  for (const collection of notesToPatch) {
    try {
      const keyMap = mergeKeyMaps.get(collection.id);
      await mutateCollectionDocument(collection, (document) => {
        const remapped = keyMap
          ? remapDocumentItemKeysByMap(document, keyMap)
          : document;
        return omitDocumentItemKeys(
          remapped,
          missingDocumentItemKeys(remapped, collection.libraryID),
        );
      });
    } catch (error) {
      ztoolkit.log("Error patching syllabus note format:", error);
    }
  }
  for (const collection of getAllCollections()) {
    const entry = documentCache.get(collectionRefFromCollection(collection));
    if (!entry?.noteId) {
      continue;
    }
    const hasClasses = Object.keys(entry.document.classes || {}).length > 0;
    if (!hasClasses && collection.getChildCollections().length === 0) {
      continue;
    }
    try {
      rememberManagedSubcollections(collection, entry.document);
      if (
        patchedIds.has(collection.id) ||
        !shouldCreateSubcollections(entry.document)
      ) {
        continue;
      }
      const ensured = await enqueueClassFolderEnsure(collection, () =>
        ensureClassSubcollections(collection, entry.document, entry.document),
      );
      if (!ensured) {
        continue;
      }
      if (classSubcollectionKeysChanged(entry.document, ensured)) {
        await mutateCollectionDocument(collection, () => ensured);
      } else {
        await enqueueClassSubcollectionItemSync(collection, ensured);
      }
    } catch (error) {
      ztoolkit.log("Error syncing class subcollections:", error);
    }
  }
  try {
    await enqueueReadingScheduleCollectionSync(
      collectDesiredReadingScheduleItems,
    );
  } catch (error) {
    ztoolkit.log("Error syncing reading schedule collection:", error);
  }
  refreshManagedCollectionTrees();
}

export function getSyllabusCollectionDictionary(): SettingsCollectionDictionaryData {
  ensureIndex();
  const result: SettingsCollectionDictionaryData = {};
  for (const [ref, entry] of documentCache.entries()) {
    if (entry.noteId === null && isEmptyCollectionDocument(entry.document)) {
      continue;
    }
    result[ref] = metadataFromDocument(entry.document);
  }
  return result;
}

export type CreateNotePolicy = "never" | "legacy" | "prompt" | "always";

export function collectionHasSyllabusNote(
  collectionId: CollectionIdentifier | Zotero.Collection,
): boolean {
  const collection = resolveSyllabusCollection(collectionId);
  if (!collection) {
    return false;
  }
  return findSyllabusNoteUncached(collection) != null;
}

function collectionHasLegacySyllabusPref(
  collection: Zotero.Collection,
): boolean {
  let raw: unknown;
  try {
    raw = Zotero.Prefs.get(`${config.prefsPrefix}.collectionMetadata`, true);
  } catch {
    return false;
  }
  if (raw === undefined || raw === null || raw === "") {
    return false;
  }
  let parsed: Record<string, unknown>;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    parsed = raw as Record<string, unknown>;
  } else if (typeof raw === "string") {
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }
      parsed = value as Record<string, unknown>;
    } catch {
      return false;
    }
  } else {
    return false;
  }
  return (
    prefEntryHasConfiguredClasses(parsed[String(collection.id)]) ||
    prefEntryHasConfiguredClasses(
      parsed[`${collection.libraryID}:${collection.key}`],
    )
  );
}

function prefEntryHasConfiguredClasses(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const classes = (value as { classes?: unknown }).classes;
  if (!classes || typeof classes !== "object" || Array.isArray(classes)) {
    return false;
  }
  return Object.keys(classes).length > 0;
}

function confirmTurnIntoSyllabus(collection: Zotero.Collection): boolean {
  const name = collection.name || "this collection";
  return confirmPrompt(
    getString("enable-syllabus-title"),
    getString("enable-syllabus-message", { args: { name } }),
  );
}

function mayCreateSyllabusNote(
  collection: Zotero.Collection,
  createNote: CreateNotePolicy,
): boolean {
  if (isManagedReadingScheduleCollection(collection.id)) {
    return false;
  }
  if (createNote === "never") {
    return false;
  }
  if (createNote === "always") {
    return true;
  }
  if (collectionHasLegacySyllabusPref(collection)) {
    return true;
  }
  if (createNote === "prompt") {
    return confirmTurnIntoSyllabus(collection);
  }
  return false;
}

async function getSyllabusNoteForWrite(
  collection: Zotero.Collection,
  createNote: CreateNotePolicy,
): Promise<{ note: Zotero.Item; created: boolean } | null> {
  const live = findSyllabusNoteUncached(collection);
  if (live) {
    return { note: live, created: false };
  }

  const trashed = findSyllabusNoteUncached(collection, true);
  if (trashed) {
    try {
      trashed.deleted = false;
    } catch (error) {
      ztoolkit.log("Error restoring trashed syllabus note:", error);
    }
    return { note: trashed, created: false };
  }

  if (!mayCreateSyllabusNote(collection, createNote)) {
    return null;
  }

  const note = new Zotero.Item("note");
  note.libraryID = collection.libraryID;
  return { note, created: true };
}

/**
 * Make this collection a syllabus if the user agrees (or a legacy pref exists).
 * No-op when a note is already present.
 */
export async function ensureSyllabusNoteForUser(
  collectionId: CollectionIdentifier | Zotero.Collection,
): Promise<boolean> {
  const collection = resolveCollection(collectionId);
  if (!collection) {
    return false;
  }
  // Reading schedule folders are not syllabi — Checklist view renders the
  // schedule (root) or a day page (date folder). Return true so that mode
  // can open without creating a note.
  if (isManagedReadingScheduleCollection(collection.id)) {
    return true;
  }
  const syllabusCollection = resolveSyllabusRoot(collection);
  if (isManagedReadingScheduleCollection(syllabusCollection.id)) {
    return true;
  }
  if (findSyllabusNoteUncached(syllabusCollection)) {
    return true;
  }
  await mutateCollectionDocument(syllabusCollection, (document) => document, {
    createNote: "prompt",
  });
  if (!findSyllabusNoteUncached(syllabusCollection)) {
    return false;
  }
  try {
    const items = syllabusCollection.getChildItems().filter((item) => {
      try {
        return item.isRegularItem();
      } catch {
        return false;
      }
    });
    if (items.length > 0) {
      await absorbSyllabusExtraFromItems(items);
    }
  } catch (error) {
    ztoolkit.log("Error absorbing Extra after enabling syllabus:", error);
  }
  return true;
}

function isDocumentWriteInFlight(ref: string): boolean {
  return documentWrites.isInFlight(ref);
}

/** Pick up a note version that landed while mutateCollectionDocument was running. */
function reconcileCachedNoteWithLive(ref: string, note: Zotero.Item): void {
  const live = (note.id && Zotero.Items.get(note.id)) || note;
  let parsed: CollectionSyllabusDocument | null = null;
  try {
    parsed = parseSyllabusNote(readItemNote(live));
  } catch (error) {
    ztoolkit.log("Error re-reading syllabus note after write:", error);
  }
  const cached = documentCache.get(ref);
  if (
    shouldAdoptIncomingNote({
      writeInFlight: true,
      cached,
      itemId: live.id,
      itemVersion: live.version,
      parsed,
    }) !== "apply" ||
    !parsed
  ) {
    return;
  }
  ztoolkit.log(
    "Adopting a newer syllabus note that landed during write",
    ref,
    live.version,
  );
  setCacheEntry(ref, live.id, live.version, parsed);
}

function enqueueWrite<T>(key: string, task: () => Promise<T>): Promise<T> {
  return documentWrites.enqueue(key, task);
}

export async function mutateCollectionDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
  mutator: (document: CollectionSyllabusDocument) => CollectionSyllabusDocument,
  options: { createNote?: CreateNotePolicy } = {},
): Promise<CollectionSyllabusDocument> {
  const collection = resolveSyllabusCollection(collectionId);
  if (!collection) {
    ztoolkit.log("Cannot save syllabus: collection not found", collectionId);
    return emptyCollectionDocument();
  }
  const ref = collectionRefFromCollection(collection);
  if (!collectionLibraryIsEditable(collection)) {
    ztoolkit.log(
      "Skipping syllabus write; library is not editable",
      collection.id,
    );
    return documentCache.get(ref)?.document || emptyCollectionDocument();
  }

  return enqueueWrite(ref, async () => {
    try {
      const got = await getSyllabusNoteForWrite(
        collection,
        options.createNote ?? "legacy",
      );
      if (!got) {
        ztoolkit.log(
          "Skipping syllabus write; collection is not a syllabus",
          collection.id,
        );
        return documentCache.get(ref)?.document || emptyCollectionDocument();
      }
      const { note, created } = got;
      const cached = documentCache.get(ref);
      let fromNote: CollectionSyllabusDocument | null = null;
      if (!created) {
        try {
          const existingHtml = readItemNote(note);
          if (isUnsupportedFutureNote(existingHtml)) {
            ztoolkit.log(
              "Refusing to overwrite a newer syllabus note format",
              collection.id,
            );
            return (
              documentCache.get(ref)?.document || emptyCollectionDocument()
            );
          }
          fromNote = parseSyllabusNote(existingHtml);
        } catch (error) {
          ztoolkit.log("Error reading existing syllabus note:", error);
        }
      }
      const current = documentForWrite(fromNote, cached?.document);
      const mutated = persistDocument(mutator(cloneDocument(current)));
      const nextResult = CollectionSyllabusDocumentSchema.safeParse(mutated);
      if (!nextResult.success) {
        ztoolkit.log(
          "Invalid syllabus document after mutation:",
          nextResult.error,
        );
      }
      let next = nextResult.success ? nextResult.data : mutated;
      if (created && next.createSubcollections === undefined) {
        next = { ...next, createSubcollections: false };
      }
      setCacheEntry(ref, note.id || null, note.version || 0, next);
      try {
        const ensured = await enqueueClassFolderEnsure(collection, () =>
          ensureClassSubcollections(collection, next, current),
        );
        if (ensured) {
          next = ensured;
        }
        rememberManagedSubcollections(collection, next);
        setCacheEntry(ref, note.id || null, note.version || 0, next);
      } catch (error) {
        ztoolkit.log("Error ensuring class subcollections:", error);
      }
      const html = await noteHtmlForDocument(next, collection);
      const fallbackHtml = serializeSyllabusNoteFallback(next);
      setCacheEntry(ref, note.id || null, note.version || 0, next);
      const saved = await persistSyllabusNote(
        note,
        collection,
        html,
        fallbackHtml,
      );
      setCacheEntry(ref, saved.id, saved.version, next);
      refreshManagedCollectionTrees();
      try {
        await enqueueClassSubcollectionItemSync(collection, next);
      } catch (error) {
        ztoolkit.log("Error syncing class subcollection items:", error);
      }
      enqueueReadingScheduleCollectionSync(
        collectDesiredReadingScheduleItems,
      ).catch((error) => {
        ztoolkit.log("Error syncing reading schedule collection:", error);
      });
      reconcileCachedNoteWithLive(ref, saved);
      return next;
    } catch (error) {
      logSyllabusError("Error saving syllabus note:", error);
      return documentCache.get(ref)?.document || emptyCollectionDocument();
    }
  });
}

export async function setCollectionDocumentMetadata(
  collectionId: CollectionIdentifier | Zotero.Collection,
  metadata: SettingsSyllabusMetadata,
  options: { createNote?: CreateNotePolicy } = {},
): Promise<CollectionSyllabusDocument> {
  return mutateCollectionDocument(
    collectionId,
    (document) => ({
      ...document,
      ...metadata,
      version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
      classes: mergeNumberKeyedClasses(document.classes, metadata.classes),
      items: document.items,
      createSubcollections:
        metadata.createSubcollections !== undefined
          ? metadata.createSubcollections
          : document.createSubcollections,
    }),
    { createNote: options.createNote ?? "prompt" },
  );
}

/**
 * Apply a partial metadata patch against the queued current document.
 * Only provided fields are written — avoids stale full-snapshot overwrites.
 */
export async function patchCollectionDocumentMetadata(
  collectionId: CollectionIdentifier | Zotero.Collection,
  patch: Partial<SettingsSyllabusMetadata>,
  options: { createNote?: CreateNotePolicy } = {},
): Promise<CollectionSyllabusDocument> {
  return mutateCollectionDocument(
    collectionId,
    (document) => {
      const next: CollectionSyllabusDocument = {
        ...document,
        version: COLLECTION_SYLLABUS_DOCUMENT_VERSION,
        items: document.items,
      };

      if (patch.description !== undefined) {
        next.description = patch.description;
      }
      if (patch.institution !== undefined) {
        next.institution = patch.institution;
      }
      if (patch.courseCode !== undefined) {
        next.courseCode = patch.courseCode;
      }
      if (patch.nomenclature !== undefined) {
        next.nomenclature = patch.nomenclature;
      }
      if (patch.priorities !== undefined) {
        next.priorities = patch.priorities;
      }
      if (patch.locked !== undefined) {
        next.locked = patch.locked;
      }
      if (patch.links !== undefined) {
        next.links = patch.links;
      }
      if (patch.cslStyle !== undefined) {
        next.cslStyle = patch.cslStyle;
      }
      if (patch.createSubcollections !== undefined) {
        next.createSubcollections = patch.createSubcollections;
      }
      if (patch.classes !== undefined) {
        next.classes = mergeNumberKeyedClasses(document.classes, patch.classes);
      }

      return next;
    },
    { createNote: options.createNote ?? "prompt" },
  );
}

export async function setItemAssignmentsInDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
  itemKey: string,
  assignments: ItemSyllabusAssignment[],
): Promise<CollectionSyllabusDocument> {
  return mutateCollectionDocument(
    collectionId,
    (document) => {
      const items = { ...document.items };
      if (!assignments.length) {
        delete items[itemKey];
      } else {
        items[itemKey] = assignments;
      }
      return { ...document, items };
    },
    { createNote: "prompt" },
  );
}

export async function mergeItemAssignmentsInDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
  updates: Record<string, ItemSyllabusAssignment[]>,
): Promise<CollectionSyllabusDocument> {
  return mutateCollectionDocument(collectionId, (document) => ({
    ...document,
    items: { ...document.items, ...updates },
  }));
}

function parseCollectionItemId(id: number | string): number | null {
  if (typeof id === "number") {
    return id;
  }
  const parts = String(id).split("-");
  const itemId = parseInt(parts[parts.length - 1], 10);
  return Number.isNaN(itemId) ? null : itemId;
}

function parseCollectionItemCollectionId(id: number | string): number | null {
  if (typeof id === "number") {
    return null;
  }
  const dash = String(id).indexOf("-");
  if (dash <= 0) {
    return null;
  }
  const collectionId = parseInt(String(id).slice(0, dash), 10);
  return Number.isNaN(collectionId) ? null : collectionId;
}

function collectDesiredReadingScheduleItems(): ReturnType<
  typeof buildReadingScheduleDesiredByLibrary
> {
  const sources: ReadingScheduleSource[] = [];
  for (const [ref, entry] of documentCache.entries()) {
    if (!entry.noteId) {
      continue;
    }
    const colon = ref.indexOf(":");
    if (colon <= 0) {
      continue;
    }
    const entryLibraryID = parseInt(ref.slice(0, colon), 10);
    if (Number.isNaN(entryLibraryID)) {
      continue;
    }
    const entryKey = ref.slice(colon + 1);
    if (entryKey && isManagedReadingScheduleRootKey(entryLibraryID, entryKey)) {
      continue;
    }
    sources.push({
      libraryID: entryLibraryID,
      document: entry.document,
    });
  }
  return buildReadingScheduleDesiredByLibrary(sources);
}

function restoreManagedSubcollectionItems(collectionId: number): void {
  const parent = parentCollectionForManagedId(collectionId);
  if (parent) {
    const document = documentCache.get(
      collectionRefFromCollection(parent),
    )?.document;
    if (document) {
      enqueueClassSubcollectionItemSync(parent, document);
    }
  }
  restoreReadingScheduleCollectionItems(
    collectionId,
    collectDesiredReadingScheduleItems,
  );
}

function handleManagedCollectionChange(
  event: string,
  ids: (number | string)[],
): void {
  for (const id of ids) {
    const collectionId = typeof id === "number" ? id : parseInt(String(id), 10);
    if (Number.isNaN(collectionId)) {
      continue;
    }
    if (event === "delete" || event === "trash") {
      const parent = parentCollectionForManagedId(collectionId);
      if (!parent) {
        continue;
      }
      const parentRef = collectionRefFromCollection(parent);
      if (
        isClassFolderSyncHeld(parent.id) ||
        isDocumentWriteInFlight(parentRef)
      ) {
        // We deleted this folder from ensureClassSubcollections. Nested
        // mutateCollectionDocument would wait on the in-flight write.
        forgetManagedSubcollection(collectionId);
        continue;
      }
      const cached = documentCache.get(parentRef)?.document;
      if (!cached || !shouldCreateSubcollections(cached)) {
        forgetManagedSubcollection(collectionId);
        continue;
      }
      mutateCollectionDocument(parent, (document) =>
        clearStaleSubcollectionKey(document, collectionId),
      ).catch((error) => {
        ztoolkit.log("Error recreating class subcollection:", error);
      });
      continue;
    }
    if (event !== "modify") {
      continue;
    }
    const parent = parentCollectionForManagedId(collectionId);
    if (!parent) {
      continue;
    }
    const parentRef = collectionRefFromCollection(parent);
    const cachedForModify = documentCache.get(parentRef)?.document;
    if (
      !cachedForModify ||
      !shouldCreateSubcollections(cachedForModify) ||
      isClassFolderSyncHeld(parent.id) ||
      isDocumentWriteInFlight(parentRef)
    ) {
      continue;
    }
    enqueueClassFolderEnsure(parent, async () => {
      if (
        isClassFolderSyncHeld(parent.id) ||
        isDocumentWriteInFlight(parentRef)
      ) {
        return;
      }
      const cached = documentCache.get(parentRef)?.document;
      if (!cached) {
        return;
      }
      return ensureClassSubcollections(parent, cached, cached);
    }).catch((error) => {
      ztoolkit.log("Error restoring class subcollection name:", error);
    });
  }
}

function handleNoteChange(item: Zotero.Item, event: string): void {
  if (!item.isNote()) {
    return;
  }
  if (event === "delete" || event === "remove" || item.deleted) {
    detachNoteFromCache(item.id);
    return;
  }

  const tagged = itemHasSyllabusTag(item);
  if (tagged === false) {
    detachNoteFromCache(item.id);
    return;
  }
  if (tagged === null && !collectionRefByNoteId.has(item.id)) {
    return;
  }

  const collectionIds = item.getCollections();
  if (collectionIds.length === 0) {
    detachNoteFromCache(item.id);
    return;
  }
  let parsed: CollectionSyllabusDocument | null = null;
  try {
    parsed = parseSyllabusNote(readItemNote(item));
  } catch (error) {
    ztoolkit.log("Error parsing syllabus note from notifier:", error);
  }
  for (const collectionId of collectionIds) {
    const collection = getCachedCollectionById(collectionId);
    if (!collection) {
      continue;
    }
    const ref = collectionRefFromCollection(collection);
    const cached = documentCache.get(ref);
    const decision = shouldAdoptIncomingNote({
      writeInFlight: isDocumentWriteInFlight(ref),
      cached,
      itemId: item.id,
      itemVersion: item.version,
      parsed,
    });
    if (decision === "ignore") {
      continue;
    }
    if (decision === "keep-cache") {
      if (cached?.document) {
        cached.noteId = item.id;
        cached.noteVersion = item.version;
        collectionRefByNoteId.set(item.id, ref);
      }
      continue;
    }
    if (parsed) {
      setCacheEntry(ref, item.id, item.version, parsed);
    }
  }
}

export function initializeSyllabusNotes(): void {
  // Hot reload can leave a hung write promise in this map. Always drop it so
  // Add Class / Create assignment are not queued behind a dead lock.
  documentWrites.clear();
  if (notifierID) {
    indexReady = rebuildDocumentIndex().catch((error) => {
      ztoolkit.log("Error rebuilding syllabus note index:", error);
    });
    return;
  }

  const observer = {
    notify(
      event: string,
      type: string,
      ids: (number | string)[],
      _extraData: { [key: string]: unknown },
    ) {
      if (type === "item") {
        const numericIds = ids
          .map((id) => (typeof id === "number" ? id : parseInt(String(id), 10)))
          .filter((id) => !Number.isNaN(id));
        if (event === "delete") {
          const deletedIds = [...numericIds];
          afterDatabaseTransaction()
            .then(() => remapMergedKeysFromItemIds(deletedIds, "trash"))
            .then(() => dropMissingItemKeysFromCachedDocuments())
            .catch((error) => {
              ztoolkit.log(
                "Error remapping merged item keys in syllabus notes:",
                error,
              );
            });
          for (const id of numericIds) {
            detachNoteFromCache(id);
          }
          return;
        }

        if (event === "trash" || event === "modify") {
          const queuedIds = [...numericIds];
          const queuedEvent = event;
          afterDatabaseTransaction()
            .then(() => remapMergedKeysFromItemIds(queuedIds, queuedEvent))
            .catch((error) => {
              ztoolkit.log(
                "Error remapping merged item keys in syllabus notes:",
                error,
              );
            });
        }

        const extrasToAbsorb: Zotero.Item[] = [];
        for (const id of numericIds) {
          const item = getCachedItem(id) || Zotero.Items.get(id);
          if (!item) {
            detachNoteFromCache(id);
            continue;
          }
          if (item.isNote()) {
            handleNoteChange(item, event);
            continue;
          }
          if (
            isSyllabusMemberItem(item) &&
            (event === "add" || event === "modify")
          ) {
            extrasToAbsorb.push(item);
          }
        }
        if (extrasToAbsorb.length > 0) {
          absorbSyllabusExtraFromItems(extrasToAbsorb).catch((error) => {
            ztoolkit.log("Error absorbing syllabus Extra into note:", error);
          });
        }
      }

      if (type === "collection-item") {
        const extrasToAbsorb: Zotero.Item[] = [];
        for (const id of ids) {
          const itemId = parseCollectionItemId(id);
          if (itemId === null) {
            continue;
          }
          const item = getCachedItem(itemId) || Zotero.Items.get(itemId);
          if (!item) {
            continue;
          }
          if (item.isNote()) {
            handleNoteChange(item, event);
          } else if (isSyllabusMemberItem(item)) {
            extrasToAbsorb.push(item);
          }
        }
        if (extrasToAbsorb.length > 0) {
          absorbSyllabusExtraFromItems(extrasToAbsorb).catch((error) => {
            ztoolkit.log("Error absorbing syllabus Extra into note:", error);
          });
        }
        documentGeneration++;
        notifyDocumentListeners();
        for (const id of ids) {
          const collectionId = parseCollectionItemCollectionId(id);
          if (collectionId == null) {
            continue;
          }
          restoreManagedSubcollectionItems(collectionId);
        }
      }

      if (type === "collection") {
        if (event === "trash" || event === "delete") {
          pruneStaleCollectionPrefs(ids);
        }
        handleManagedCollectionChange(event, ids);
        handleReadingScheduleCollectionChange(
          event,
          ids,
          collectDesiredReadingScheduleItems,
        );
      }
    },
  };

  notifierID = Zotero.Notifier.registerObserver(observer, [
    "item",
    "collection-item",
    "collection",
  ]);
  registerReadingSchedulePrefObserver(collectDesiredReadingScheduleItems);
  indexReady = rebuildDocumentIndex().catch((error) => {
    ztoolkit.log("Error rebuilding syllabus note index:", error);
  });
}

export function whenSyllabusNotesReady(): Promise<void> {
  return indexReady;
}

export function shutdownSyllabusNotes(): void {
  if (notifierID) {
    Zotero.Notifier.unregisterObserver(notifierID);
    notifierID = null;
  }
  unregisterReadingSchedulePrefObserver();
  documentCache.clear();
  collectionRefByNoteId.clear();
  documentWrites.clear();
  documentListeners.clear();
  clearManagedSubcollections();
  clearManagedReadingScheduleCollection();
  indexBuilt = false;
  itemDataReady = false;
  documentGeneration = 0;
  indexReady = Promise.resolve();
}

export function invalidateCollectionDocument(
  collectionId: CollectionIdentifier | Zotero.Collection,
): void {
  const collection = resolveSyllabusCollection(collectionId);
  if (!collection) {
    return;
  }
  const ref = collectionRefFromCollection(collection);
  const cached = documentCache.get(ref);
  if (cached?.noteId) {
    collectionRefByNoteId.delete(cached.noteId);
  }
  documentCache.delete(ref);
  documentGeneration++;
}
