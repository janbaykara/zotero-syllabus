import { ExtraFieldTool } from "zotero-plugin-toolkit";
import {
  ItemSyllabusAssignmentEntity,
  ItemSyllabusDataEntity,
  type ItemSyllabusAssignment,
  type ItemSyllabusData,
} from "../utils/schemas";
import { getCachedCollectionByKey } from "../utils/cache";
import { attachStashedReadingListFiles } from "./readingListFileStash";
import {
  SYLLABUS_EXTRA_KEY,
  SYLLABUS_NOTE_TAG,
  collectionRefFromCollection,
  getClassSubcollectionContext,
  mergeItemAssignmentsInDocument,
} from "./syllabusNote";

const extraFieldTool = new ExtraFieldTool();

function pickAssignmentsFromExtra(
  extraData: ItemSyllabusData,
  collection: Zotero.Collection,
): ItemSyllabusAssignment[] | null {
  const assignments = extraData[collectionRefFromCollection(collection)];
  return Array.isArray(assignments) && assignments.length ? assignments : null;
}

function collectionFromExtraRef(ref: string): Zotero.Collection | undefined {
  const idx = ref.indexOf(":");
  if (idx <= 0) {
    return undefined;
  }
  const libraryID = Number(ref.slice(0, idx));
  const key = ref.slice(idx + 1);
  if (!Number.isInteger(libraryID) || !key) {
    return undefined;
  }
  return getCachedCollectionByKey(libraryID, key);
}

/** Class folders inherit a parent note; do not absorb Extra into them. */
function isSyllabusAbsorbTarget(collection: Zotero.Collection): boolean {
  return getClassSubcollectionContext(collection) == null;
}

function moveItemIntoCollection(
  item: Zotero.Item,
  destination: Zotero.Collection,
): void {
  const currentIds = item.getCollections();
  if (!currentIds.includes(destination.id)) {
    item.addToCollection(destination.id);
  }
  for (const collectionId of currentIds) {
    if (collectionId !== destination.id) {
      item.removeFromCollection(collectionId);
    }
  }
}

function addItemToCollection(
  item: Zotero.Item,
  destination: Zotero.Collection,
): void {
  if (!item.getCollections().includes(destination.id)) {
    item.addToCollection(destination.id);
  }
}

/**
 * One Extra destination is a reading-list import: move the item there.
 * Several destinations are several syllabi: add to each, don't strip the others.
 */
export function placeItemInSyllabusDestinations(
  item: Zotero.Item,
  destinations: Zotero.Collection[],
): void {
  if (destinations.length === 0) {
    return;
  }
  if (destinations.length === 1) {
    moveItemIntoCollection(item, destinations[0]);
    return;
  }
  for (const destination of destinations) {
    addItemToCollection(item, destination);
  }
}

function extraDestinationCollections(
  extraData: ItemSyllabusData,
): Zotero.Collection[] {
  const destinations: Zotero.Collection[] = [];
  const seen = new Set<number>();
  for (const ref of Object.keys(extraData)) {
    const collection = collectionFromExtraRef(ref);
    if (!collection || seen.has(collection.id)) {
      continue;
    }
    if (!isSyllabusAbsorbTarget(collection)) {
      continue;
    }
    seen.add(collection.id);
    destinations.push(collection);
  }
  return destinations;
}

function readSyllabusExtra(item: Zotero.Item): ItemSyllabusData | null {
  const extraText = item.getField("extra");
  if (!extraText || !String(extraText).includes(`${SYLLABUS_EXTRA_KEY}:`)) {
    return null;
  }
  const jsonStr = extraFieldTool.getExtraField(item, SYLLABUS_EXTRA_KEY);
  if (!jsonStr) {
    return null;
  }
  try {
    const parsed = JSON.parse(jsonStr);
    const result = ItemSyllabusDataEntity.safeParse(parsed);
    if (result.type !== "ok") {
      return null;
    }
    return result.value;
  } catch {
    return null;
  }
}

async function clearSyllabusExtra(item: Zotero.Item): Promise<void> {
  const fields = extraFieldTool.getExtraFields(item);
  if (!fields.has(SYLLABUS_EXTRA_KEY)) {
    return;
  }
  fields.delete(SYLLABUS_EXTRA_KEY);
  await extraFieldTool.replaceExtraFields(item, fields);
}

function citationIdsFromExtra(extraData: ItemSyllabusData): string[] {
  const ids: string[] = [];
  for (const assignments of Object.values(extraData)) {
    if (!Array.isArray(assignments)) {
      continue;
    }
    for (const assignment of assignments) {
      const id = String(assignment.id || "");
      if (id.startsWith("assignment-")) {
        ids.push(id.slice("assignment-".length));
      } else if (id) {
        ids.push(id);
      }
    }
  }
  return ids;
}

function stripAssignmentStatus(
  assignments: ItemSyllabusAssignment[],
): ItemSyllabusAssignment[] {
  return assignments.map((assignment) => {
    const parsed = ItemSyllabusAssignmentEntity.safeParse({
      ...assignment,
      status: null,
    });
    return parsed.type === "ok"
      ? parsed.value
      : { ...assignment, status: null };
  });
}

const READING_LIST_CATALOGS = new Set([
  "Ex Libris Leganto",
  "Talis Aspire",
  "KeyLinks",
  "eReserve Plus",
  "BLUEcloud Course Lists",
]);
const FILE_LOOKUP_DEBOUNCE_MS = 2500;
const pendingFileLookupIds = new Set<number>();
let fileLookupTimer: ReturnType<typeof setTimeout> | null = null;

function isReadingListCatalogItem(item: Zotero.Item): boolean {
  try {
    return READING_LIST_CATALOGS.has(
      String(item.getField("libraryCatalog") || ""),
    );
  } catch {
    return false;
  }
}

function itemAlreadyHasFile(item: Zotero.Item): boolean {
  for (const attId of item.getAttachments()) {
    const att = Zotero.Items.get(attId);
    if (att?.isPDFAttachment?.() || att?.isEPUBAttachment?.()) {
      return true;
    }
  }
  return false;
}

function queueAvailableFileLookup(items: Zotero.Item[]): void {
  for (const item of items) {
    if (
      !item?.id ||
      !isReadingListCatalogItem(item) ||
      itemAlreadyHasFile(item)
    ) {
      continue;
    }
    pendingFileLookupIds.add(item.id);
  }
  if (!pendingFileLookupIds.size) {
    return;
  }
  if (fileLookupTimer) {
    clearTimeout(fileLookupTimer);
  }
  fileLookupTimer = setTimeout(() => {
    fileLookupTimer = null;
    void lookupQueuedAvailableFiles();
  }, FILE_LOOKUP_DEBOUNCE_MS);
}

async function lookupQueuedAvailableFiles(): Promise<void> {
  const ids = Array.from(pendingFileLookupIds);
  pendingFileLookupIds.clear();
  const items = ids
    .map((id) => Zotero.Items.get(id))
    .filter((item): item is Zotero.Item =>
      Boolean(item?.isRegularItem?.() && !itemAlreadyHasFile(item)),
    );
  if (!items.length) {
    return;
  }
  const attachments = Zotero.Attachments as {
    addAvailableFiles?: (items: Zotero.Item[]) => Promise<void>;
    addAvailablePDFs?: (items: Zotero.Item[]) => Promise<void>;
  };
  const lookup = attachments.addAvailableFiles || attachments.addAvailablePDFs;
  if (typeof lookup !== "function") {
    ztoolkit.log(
      "Zotero.Attachments.addAvailableFiles is not available; skipping file lookup",
    );
    return;
  }
  ztoolkit.log("Looking up available files for reading-list import", {
    count: items.length,
  });
  try {
    await lookup.call(Zotero.Attachments, items);
  } catch (error) {
    ztoolkit.log(
      "Error looking up available files after reading-list import:",
      error,
    );
  }
}

export async function absorbSyllabusExtraFromItems(
  items: Zotero.Item[],
): Promise<void> {
  const byCollection = new Map<
    number,
    {
      collection: Zotero.Collection;
      updates: Record<string, ItemSyllabusAssignment[]>;
    }
  >();
  const toClear: Zotero.Item[] = [];
  const pendingFiles: Array<{ item: Zotero.Item; citationIds: string[] }> = [];

  for (const item of items) {
    if (!item?.isRegularItem()) {
      continue;
    }
    const extraData = readSyllabusExtra(item);
    if (!extraData) {
      continue;
    }

    const destinations = extraDestinationCollections(extraData);
    if (destinations.length === 0) {
      continue;
    }
    placeItemInSyllabusDestinations(item, destinations);

    let absorbed = false;
    for (const collection of destinations) {
      const assignments = pickAssignmentsFromExtra(extraData, collection);
      if (!assignments) {
        continue;
      }
      const bucket = byCollection.get(collection.id) || {
        collection,
        updates: {},
      };
      bucket.updates[item.key] = stripAssignmentStatus(assignments);
      byCollection.set(collection.id, bucket);
      absorbed = true;
    }

    if (absorbed) {
      toClear.push(item);
      pendingFiles.push({
        item,
        citationIds: citationIdsFromExtra(extraData),
      });
    }
  }

  for (const { collection, updates } of byCollection.values()) {
    await mergeItemAssignmentsInDocument(collection, updates);
  }
  const queuedIds = new Set(pendingFiles.map((entry) => entry.item.id));
  for (const item of items) {
    if (!item?.isRegularItem() || queuedIds.has(item.id)) {
      continue;
    }
    if (!isReadingListCatalogItem(item)) {
      continue;
    }
    pendingFiles.push({ item, citationIds: [] });
  }
  for (const { item, citationIds } of pendingFiles) {
    await attachStashedReadingListFiles(item, citationIds);
  }
  for (const item of toClear) {
    await clearSyllabusExtra(item);
  }
  for (const { collection } of byCollection.values()) {
    await trashDuplicateEmptyImportCollections(collection);
  }
  queueAvailableFileLookup(toClear);
}

/**
 * Connector translators sometimes POST list metadata more than once, which
 * used to leave extra top-level collections that only contain a duplicate
 * syllabus note. Remove those leftovers after items have been absorbed.
 */
async function trashDuplicateEmptyImportCollections(
  destination: Zotero.Collection,
): Promise<void> {
  const siblings = Zotero.Collections.getByLibrary(
    destination.libraryID,
  ).filter(
    (collection) =>
      !collection.parentID &&
      collection.id !== destination.id &&
      !collection.deleted &&
      collection.name === destination.name,
  );
  for (const sibling of siblings) {
    let children: Zotero.Item[] = [];
    try {
      children = sibling.getChildItems();
    } catch {
      continue;
    }
    const live = children.filter((item) => !item.deleted);
    if (live.some((item) => item.isRegularItem())) {
      continue;
    }
    const notes = live.filter((item) => item.isNote());
    if (!notes.length) {
      continue;
    }
    if (!notes.every((note) => note.hasTag(SYLLABUS_NOTE_TAG))) {
      continue;
    }
    ztoolkit.log("Trashing duplicate empty reading-list import collection", {
      destinationId: destination.id,
      siblingId: sibling.id,
      name: sibling.name,
    });
    try {
      await sibling.eraseTx({ deleteItems: true });
    } catch (error) {
      ztoolkit.log(
        "Could not trash duplicate reading-list import collection:",
        error,
      );
    }
  }
}
