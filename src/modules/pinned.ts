/**
 * Pinned items (tag on regular items) and pinned collections (tag on the
 * Syllabus note, or a marker note for non-syllabus collections). Optional
 * intention child notes for items. Pinned syllabi always appear: next-up is
 * the first incomplete class assignment, then further reading in stored
 * order; a caught-up or empty syllabus still stays on the shelf.
 */

import * as z from "zod";
import { config } from "../../package.json";
import {
  assignmentClassNumber,
  orderedClassIds,
  type CollectionSyllabusDocument,
  type ItemSyllabusAssignment,
} from "../utils/schemas";
import {
  getCachedCollectionById,
  getCachedItem,
  getCachedPref,
  zoteroCache,
} from "../utils/cache";
import { compareLocale, getString } from "../utils/locale";
import {
  getItemTitle,
  isSyllabusMemberItem,
  readItemNote,
} from "../utils/items";
import { confirmExPrompt, confirmPrompt } from "../utils/window";
import {
  collectionHasSyllabusNote,
  getCollectionDocument,
  getSyllabusNoteId,
  SYLLABUS_NOTE_TAG,
} from "./syllabusNote";

const pinnedListeners = new Set<() => void>();

/** Pref: libraryID → ordered shelf entry keys (`i:<itemKey>` / `c:<collectionKey>`). */
const PinnedShelfOrderSchema = z.record(z.string(), z.array(z.string()));

function pinnedShelfOrderPrefKey() {
  return `${config.prefsPrefix}.pinnedShelfOrder`;
}

export type PinnedShelfEntryKind = "item" | "collection";

export function pinnedShelfEntryKey(
  kind: PinnedShelfEntryKind,
  key: string,
): string {
  return `${kind === "item" ? "i" : "c"}:${key}`;
}

export function getPinnedShelfOrder(libraryID: number): string[] {
  const map =
    getCachedPref(pinnedShelfOrderPrefKey(), PinnedShelfOrderSchema) || {};
  const raw = map[String(libraryID)];
  return Array.isArray(raw)
    ? raw.filter((entry) => typeof entry === "string")
    : [];
}

export function setPinnedShelfOrder(libraryID: number, order: string[]): void {
  const key = pinnedShelfOrderPrefKey();
  const map = getCachedPref(key, PinnedShelfOrderSchema) || {};
  map[String(libraryID)] = order;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

/** Stable reorder: known keys first (saved order), then remaining in input order. */
export function applyPinnedShelfOrder<T>(
  entries: T[],
  getKey: (entry: T) => string,
  order: string[],
): T[] {
  if (order.length === 0 || entries.length <= 1) {
    return entries;
  }
  const byKey = new Map<string, T>();
  for (const entry of entries) {
    byKey.set(getKey(entry), entry);
  }
  const used = new Set<string>();
  const next: T[] = [];
  for (const key of order) {
    const entry = byKey.get(key);
    if (!entry || used.has(key)) {
      continue;
    }
    next.push(entry);
    used.add(key);
  }
  for (const entry of entries) {
    const key = getKey(entry);
    if (used.has(key)) {
      continue;
    }
    next.push(entry);
  }
  return next;
}

/** Move `from` → `to` (to is index in the list before removal; same as explorer catalog). */
export function movePinnedShelfEntry<T>(
  entries: T[],
  from: number,
  to: number,
): T[] {
  if (from === to || from < 0 || to < 0 || to > entries.length) {
    return entries;
  }
  const next = [...entries];
  const [row] = next.splice(from, 1);
  next.splice(to > from ? to - 1 : to, 0, row);
  return next;
}

/**
 * Library used for pinned shelf order prefs. The Reading Schedule tab passes
 * no libraryID (all libraries); if every pin shares one library, use that so
 * reorder still works.
 */
export function resolvePinnedOrderLibraryID(
  libraryID: number | undefined,
  items: Array<{ libraryID: number }>,
  collections: Array<{ libraryID: number }>,
): number | undefined {
  if (libraryID != null) {
    return libraryID;
  }
  let found: number | undefined;
  for (const entry of items) {
    if (found == null) {
      found = entry.libraryID;
    } else if (found !== entry.libraryID) {
      return undefined;
    }
  }
  for (const entry of collections) {
    if (found == null) {
      found = entry.libraryID;
    } else if (found !== entry.libraryID) {
      return undefined;
    }
  }
  return found;
}

export function subscribePinnedChanges(listener: () => void): () => void {
  pinnedListeners.add(listener);
  return () => {
    pinnedListeners.delete(listener);
  };
}

export function notifyPinnedChanges(): void {
  for (const listener of [...pinnedListeners]) {
    try {
      listener();
    } catch (error) {
      ztoolkit.log("Error in pinned listener:", error);
    }
  }
}

/** Stored tag on pinned items and pinned Syllabus / collection notes. Do not localize. */
export const PINNED_TAG = "pinned";

/** Stored tag on optional intention child notes. Do not localize. */
export const INTENTION_NOTE_TAG = "zotero-syllabus-pinned-intention";

/**
 * Marker note tag for pinning a collection that has no Syllabus note.
 * Do not localize.
 */
export const PINNED_COLLECTION_TAG = "zotero-syllabus-pinned-collection";

/** Stored Reading Schedule child folder name. Do not localize. */
export const PINNED_FOLDER_NAME = "Pinned";

/** Item counts for a pinned syllabus: done classes count all their items. */
export type SyllabusItemProgress = {
  done: number;
  total: number;
  percent: number;
};

export type NextUpReading = {
  collection: Zotero.Collection;
  libraryID: number;
  /** True when the collection has a Syllabus note (progress + class next-up). */
  isSyllabus: boolean;
  classNumber: number | null;
  classTitle: string;
  /** First incomplete assignment / first collection item (deep-link target). */
  item: Zotero.Item | null;
  assignment: ItemSyllabusAssignment | null;
  /** Up to 3 items for the cover stack (unread assignments or collection items). */
  unreadItems: Zotero.Item[];
  /** Class-aware progress; null for non-syllabus collections. */
  progress: SyllabusItemProgress | null;
};

function resolveItem(id: number): Zotero.Item | null {
  return getCachedItem(id) || Zotero.Items.get(id) || null;
}

function hasTagSafe(item: Zotero.Item, tag: string): boolean {
  try {
    return item.hasTag(tag);
  } catch {
    return false;
  }
}

export function isPinnedItem(item: Zotero.Item): boolean {
  try {
    if (!item.isRegularItem() || item.deleted) {
      return false;
    }
  } catch {
    return false;
  }
  return hasTagSafe(item, PINNED_TAG);
}

export function isPinnedSyllabusNote(item: Zotero.Item): boolean {
  try {
    if (!item.isNote() || !item.isTopLevelItem() || item.deleted) {
      return false;
    }
  } catch {
    return false;
  }
  return hasTagSafe(item, SYLLABUS_NOTE_TAG) && hasTagSafe(item, PINNED_TAG);
}

/** Marker note used to pin a collection that is not a syllabus. */
export function isPinnedCollectionMarkerNote(item: Zotero.Item): boolean {
  try {
    if (!item.isNote() || !item.isTopLevelItem() || item.deleted) {
      return false;
    }
  } catch {
    return false;
  }
  return (
    hasTagSafe(item, PINNED_COLLECTION_TAG) &&
    hasTagSafe(item, PINNED_TAG) &&
    !hasTagSafe(item, SYLLABUS_NOTE_TAG)
  );
}

export function isPinnedSyllabus(collection: Zotero.Collection): boolean {
  const note = findSyllabusNoteForCollection(collection);
  if (note != null && hasTagSafe(note, PINNED_TAG)) {
    return true;
  }
  return findPinnedCollectionMarker(collection) != null;
}

function findSyllabusNoteForCollection(
  collection: Zotero.Collection,
): Zotero.Item | null {
  const noteId = getSyllabusNoteId(collection);
  if (noteId == null) {
    return null;
  }
  const note = resolveItem(noteId);
  if (!note || note.deleted) {
    return null;
  }
  try {
    if (!note.isNote() || !hasTagSafe(note, SYLLABUS_NOTE_TAG)) {
      return null;
    }
  } catch {
    return null;
  }
  return note;
}

function findPinnedCollectionMarker(
  collection: Zotero.Collection,
): Zotero.Item | null {
  try {
    const children = collection.getChildItems(false, false) || [];
    for (const child of children) {
      if (isPinnedCollectionMarkerNote(child)) {
        return child;
      }
    }
  } catch (error) {
    ztoolkit.log("Error finding pinned collection marker:", error);
  }
  return null;
}

async function erasePinnedCollectionMarker(
  collection: Zotero.Collection,
): Promise<void> {
  const marker = findPinnedCollectionMarker(collection);
  if (!marker) {
    return;
  }
  try {
    await marker.eraseTx();
  } catch (error) {
    ztoolkit.log("Error erasing pinned collection marker:", error);
  }
}

async function ensurePinnedCollectionMarker(
  collection: Zotero.Collection,
): Promise<Zotero.Item | null> {
  const existing = findPinnedCollectionMarker(collection);
  if (existing) {
    if (!hasTagSafe(existing, PINNED_TAG)) {
      existing.addTag(PINNED_TAG);
      await existing.saveTx({ skipSelect: true });
    }
    return existing;
  }
  try {
    const note = new Zotero.Item("note");
    note.libraryID = collection.libraryID;
    // Zotero 8: save before setNote / addToCollection / addTag.
    await note.saveTx({ skipSelect: true });
    try {
      note.setNote("");
    } catch {
      // Ignore empty note failures.
    }
    try {
      note.addToCollection(collection.id);
    } catch (error) {
      ztoolkit.log(
        "addToCollection failed for pin marker, trying collection.addItem:",
        error,
      );
      if (note.id) {
        try {
          await collection.addItem(note.id);
        } catch (error2) {
          ztoolkit.log("collection.addItem failed for pin marker:", error2);
        }
      }
    }
    note.addTag(PINNED_COLLECTION_TAG);
    note.addTag(PINNED_TAG);
    await note.saveTx({ skipSelect: true });
    return note;
  } catch (error) {
    ztoolkit.log("Error creating pinned collection marker:", error);
    return null;
  }
}

async function searchTaggedItemIds(
  libraryID: number,
  tag: string,
): Promise<number[]> {
  try {
    const search = new Zotero.Search({ libraryID });
    search.addCondition("tag", "is", tag);
    const ids = await search.search();
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "number") : [];
  } catch (error) {
    ztoolkit.log("Error searching pinned tag:", error);
    return [];
  }
}

/** Sync listing of pinned regular items (uses in-memory tag checks after search). */
export async function listPinnedItems(
  libraryID?: number,
): Promise<Zotero.Item[]> {
  const libraryIDs =
    libraryID != null
      ? [libraryID]
      : Zotero.Libraries.getAll()
          .map((library) => library.libraryID)
          .filter((id): id is number => typeof id === "number");

  const out: Zotero.Item[] = [];
  const seen = new Set<number>();
  for (const id of libraryIDs) {
    const itemIds = await searchTaggedItemIds(id, PINNED_TAG);
    for (const itemId of itemIds) {
      if (seen.has(itemId)) {
        continue;
      }
      const item = resolveItem(itemId);
      if (!item || !isPinnedItem(item)) {
        continue;
      }
      seen.add(itemId);
      out.push(item);
    }
  }
  out.sort((a, b) => compareLocale(getItemTitle(a), getItemTitle(b)));
  return out;
}

/** Pinned item ids for one library (for auto-gen folder sync). */
export async function listPinnedItemIds(libraryID: number): Promise<number[]> {
  const items = await listPinnedItems(libraryID);
  return items.map((item) => item.id);
}

export async function listPinnedSyllabi(
  libraryID?: number,
): Promise<Zotero.Collection[]> {
  const libraryIDs =
    libraryID != null
      ? [libraryID]
      : Zotero.Libraries.getAll()
          .map((library) => library.libraryID)
          .filter((id): id is number => typeof id === "number");

  const out: Zotero.Collection[] = [];
  const seen = new Set<number>();
  for (const id of libraryIDs) {
    const itemIds = await searchTaggedItemIds(id, PINNED_TAG);
    for (const itemId of itemIds) {
      const note = resolveItem(itemId);
      if (
        !note ||
        (!isPinnedSyllabusNote(note) && !isPinnedCollectionMarkerNote(note))
      ) {
        continue;
      }
      for (const collectionId of note.getCollections()) {
        if (seen.has(collectionId)) {
          continue;
        }
        const collection =
          getCachedCollectionById(collectionId) ||
          Zotero.Collections.get(collectionId) ||
          null;
        if (!collection || collection.deleted) {
          continue;
        }
        if (libraryID != null && collection.libraryID !== libraryID) {
          continue;
        }
        seen.add(collectionId);
        out.push(collection);
      }
    }
  }
  out.sort((a, b) => compareLocale(a.name, b.name));
  return out;
}

export async function setPinnedItem(
  item: Zotero.Item,
  pinned: boolean,
): Promise<void> {
  try {
    if (!item.isRegularItem()) {
      return;
    }
  } catch {
    return;
  }
  const currently = hasTagSafe(item, PINNED_TAG);
  if (pinned === currently) {
    return;
  }
  if (pinned) {
    item.addTag(PINNED_TAG);
  } else {
    item.removeTag(PINNED_TAG);
  }
  await item.saveTx({ skipSelect: true });
  notifyPinnedChanges();
}

/**
 * Pin or unpin a collection. Syllabi store the pin on the Syllabus note;
 * other collections use a lightweight marker note (no syllabus is created).
 */
export async function setPinnedSyllabus(
  collection: Zotero.Collection,
  pinned: boolean,
): Promise<boolean> {
  const note = findSyllabusNoteForCollection(collection);
  if (note) {
    await erasePinnedCollectionMarker(collection);
    const currently = hasTagSafe(note, PINNED_TAG);
    if (pinned === currently) {
      return true;
    }
    if (pinned) {
      note.addTag(PINNED_TAG);
    } else {
      note.removeTag(PINNED_TAG);
    }
    await note.saveTx({ skipSelect: true });
    notifyPinnedChanges();
    return true;
  }

  if (pinned) {
    const marker = await ensurePinnedCollectionMarker(collection);
    if (!marker) {
      return false;
    }
    notifyPinnedChanges();
    return true;
  }

  await erasePinnedCollectionMarker(collection);
  notifyPinnedChanges();
  return true;
}

function childNoteIds(item: Zotero.Item): number[] {
  try {
    const getNotes = (
      item as Zotero.Item & { getNotes?: (asIDs?: boolean) => number[] }
    ).getNotes;
    if (typeof getNotes === "function") {
      const ids = getNotes.call(item, false);
      return Array.isArray(ids)
        ? ids.filter((id) => typeof id === "number")
        : [];
    }
  } catch {
    // Fall through.
  }
  return [];
}

export function findIntentionNote(item: Zotero.Item): Zotero.Item | null {
  for (const noteId of childNoteIds(item)) {
    const note = resolveItem(noteId);
    if (!note || note.deleted) {
      continue;
    }
    try {
      if (!note.isNote()) {
        continue;
      }
    } catch {
      continue;
    }
    if (hasTagSafe(note, INTENTION_NOTE_TAG)) {
      return note;
    }
  }
  return null;
}

export async function ensureIntentionNote(
  item: Zotero.Item,
): Promise<Zotero.Item | null> {
  const existing = findIntentionNote(item);
  if (existing) {
    return existing;
  }
  try {
    if (!item.isRegularItem() || !item.id) {
      return null;
    }
  } catch {
    return null;
  }
  const note = new Zotero.Item("note");
  note.libraryID = item.libraryID;
  note.parentID = item.id;
  note.setNote("");
  await note.saveTx({ skipSelect: true });
  try {
    note.addTag(INTENTION_NOTE_TAG);
    await note.saveTx({ skipSelect: true });
  } catch (error) {
    ztoolkit.log("Error tagging intention note:", error);
  }
  return note;
}

/** Strip note HTML to plain text for ProseText. */
export function noteHtmlToPlainText(html: string): string {
  const withBreaks = String(html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\/\s*div\s*>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  const normalize = (text: string) =>
    text
      .replace(/\u00A0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  try {
    const unescape = (
      Zotero.Utilities as { unescapeHTML?: (s: string) => string }
    )?.unescapeHTML;
    if (typeof unescape === "function") {
      return normalize(unescape(stripped));
    }
  } catch {
    // Fall through.
  }
  return normalize(
    stripped
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"'),
  );
}

export function readIntentionText(item: Zotero.Item): string {
  const note = findIntentionNote(item);
  if (!note) {
    return "";
  }
  return noteHtmlToPlainText(readItemNote(note));
}

export async function openIntentionNote(item: Zotero.Item): Promise<void> {
  const note = await ensureIntentionNote(item);
  if (!note) {
    return;
  }
  if (!hasTagSafe(item, PINNED_TAG)) {
    await setPinnedItem(item, true);
  }
  try {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    if (pane && typeof pane.selectItem === "function") {
      await pane.selectItem(note.id);
    }
  } catch (error) {
    ztoolkit.log("Error selecting intention note:", error);
  }
}

/**
 * Unpin item. If an intention note exists, ask Keep / Delete / Cancel.
 * Returns false if the user cancelled.
 */
export async function unpinItemWithNotePrompt(
  item: Zotero.Item,
): Promise<boolean> {
  const note = findIntentionNote(item);
  if (!note) {
    await setPinnedItem(item, false);
    return true;
  }

  const choice = confirmExPrompt(
    getString("pinned-unpin-note-title"),
    getString("pinned-unpin-note-message"),
    getString("pinned-unpin-keep"),
    getString("pinned-unpin-delete"),
    getString("pinned-unpin-cancel"),
  );
  // 0 = Keep, 1 = Delete, 2 = Cancel / closed
  if (choice === 2 || choice < 0) {
    return false;
  }
  if (choice === 1) {
    try {
      await note.eraseTx();
    } catch (error) {
      ztoolkit.log("Error deleting intention note:", error);
    }
  }
  await setPinnedItem(item, false);
  return true;
}

/**
 * Confirm unpin (checkbox “done” on the Reading Schedule pinned shelf).
 * Intention notes still get the keep/delete prompt.
 */
export async function confirmUnpinPinnedItem(
  item: Zotero.Item,
): Promise<boolean> {
  if (findIntentionNote(item)) {
    return unpinItemWithNotePrompt(item);
  }
  if (
    !confirmPrompt(
      getString("pinned-done-unpin-title"),
      getString("pinned-done-unpin-message"),
    )
  ) {
    return false;
  }
  await setPinnedItem(item, false);
  return true;
}

/** Confirm unpin for a class-based (syllabus) pin via checkbox. */
export async function confirmUnpinPinnedSyllabus(
  collection: Zotero.Collection,
): Promise<boolean> {
  if (
    !confirmPrompt(
      getString("pinned-done-unpin-syllabus-title"),
      getString("pinned-done-unpin-syllabus-message"),
    )
  ) {
    return false;
  }
  await setPinnedSyllabus(collection, false);
  return true;
}

function sortAssignmentsForClass(
  entries: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>,
  itemOrder: string[] | undefined,
  priorities: CollectionSyllabusDocument["priorities"],
): Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }> {
  if (itemOrder && itemOrder.length > 0) {
    const map = new Map(entries.map((entry) => [entry.assignment.id, entry]));
    const ordered: typeof entries = [];
    for (const assignmentId of itemOrder) {
      const entry = map.get(assignmentId);
      if (entry) {
        ordered.push(entry);
        map.delete(assignmentId);
      }
    }
    const rest = Array.from(map.values()).sort((a, b) =>
      compareLocale(getItemTitle(a.item), getItemTitle(b.item)),
    );
    return [...ordered, ...rest];
  }

  const priorityOrder = (id: string | null | undefined): number => {
    if (!id || !priorities?.length) {
      return 9999;
    }
    const found = priorities.find((priority) => priority.id === id);
    return found?.order ?? 9999;
  };

  return [...entries].sort((a, b) => {
    const orderA = priorityOrder(a.assignment.priority);
    const orderB = priorityOrder(b.assignment.priority);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return compareLocale(getItemTitle(a.item), getItemTitle(b.item));
  });
}

/**
 * Syllabus progress in item currency, driven by class completion:
 * items in a done class count as done even when unread.
 * Further-reading assignments count; unnumbered (priority / instruction)
 * rows do not. Missing/deleted items are skipped so the bar matches the UI.
 */
export function getSyllabusItemProgress(
  collection: Zotero.Collection,
  document?: CollectionSyllabusDocument,
): SyllabusItemProgress {
  const doc = document || getCollectionDocument(collection);
  const classIds = orderedClassIds(doc);
  const doneClassNumbers = new Set<number>();
  for (let index = 0; index < classIds.length; index++) {
    const classId = classIds[index];
    if (doc.classes?.[classId]?.status === "done") {
      doneClassNumbers.add(index + 1);
    }
  }

  let done = 0;
  let total = 0;
  const libraryID = collection.libraryID;
  for (const [itemKey, assignments] of Object.entries(doc.items || {})) {
    if (!resolveLibraryItem(libraryID, itemKey)) {
      continue;
    }
    for (const assignment of assignments || []) {
      const classNumber = assignmentClassNumber(
        assignment,
        doc.classes,
        doc.classOrder,
      );
      if (classNumber == null) {
        if (!isFurtherReadingAssignment(assignment, doc)) {
          continue;
        }
        total += 1;
        if (assignment.status === "done") {
          done += 1;
        }
        continue;
      }
      total += 1;
      if (doneClassNumbers.has(classNumber) || assignment.status === "done") {
        done += 1;
      }
    }
  }

  const percent =
    total <= 0
      ? 0
      : Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  return { done, total, percent };
}

function isFurtherReadingAssignment(
  assignment: ItemSyllabusAssignment,
  doc: CollectionSyllabusDocument,
): boolean {
  return (
    assignmentClassNumber(assignment, doc.classes, doc.classOrder) == null &&
    !assignment.priority &&
    !assignment.classInstruction
  );
}

function pickDocumentFurtherReadingAssignment(
  assignments: ItemSyllabusAssignment[] | undefined,
  doc: CollectionSyllabusDocument,
): ItemSyllabusAssignment | undefined {
  const classless = (assignments || []).filter((assignment) =>
    isFurtherReadingAssignment(assignment, doc),
  );
  return (
    classless.find((assignment) => assignment.status === "done") || classless[0]
  );
}

type ClassDisplayEntry = {
  item: Zotero.Item;
  assignment: ItemSyllabusAssignment;
  classNumber: number;
  classTitle: string;
  classDone: boolean;
};

function collectClassDisplayEntries(
  collection: Zotero.Collection,
  doc: CollectionSyllabusDocument,
): ClassDisplayEntry[] {
  const classIds = orderedClassIds(doc);
  const libraryID = collection.libraryID;
  const result: ClassDisplayEntry[] = [];

  for (let index = 0; index < classIds.length; index++) {
    const classId = classIds[index];
    const classNumber = index + 1;
    const classMeta = doc.classes?.[classId];
    const entries: Array<{
      item: Zotero.Item;
      assignment: ItemSyllabusAssignment;
    }> = [];

    for (const [itemKey, assignments] of Object.entries(doc.items || {})) {
      for (const assignment of assignments || []) {
        const num = assignmentClassNumber(
          assignment,
          doc.classes,
          doc.classOrder,
        );
        if (num !== classNumber) {
          continue;
        }
        const item = resolveLibraryItem(libraryID, itemKey);
        if (!item) {
          continue;
        }
        entries.push({ item, assignment });
      }
    }

    const sorted = sortAssignmentsForClass(
      entries,
      classMeta?.itemOrder,
      doc.priorities,
    );
    for (const entry of sorted) {
      result.push({
        ...entry,
        classNumber,
        classTitle: classMeta?.title || "",
        classDone: classMeta?.status === "done",
      });
    }
  }

  return result;
}

type FurtherReadingDisplayEntry = {
  item: Zotero.Item;
  assignment?: ItemSyllabusAssignment;
};

function collectFurtherReadingDisplayEntries(
  collection: Zotero.Collection,
  doc: CollectionSyllabusDocument,
): FurtherReadingDisplayEntry[] {
  const libraryID = collection.libraryID;
  const entries: FurtherReadingDisplayEntry[] = [];
  const seen = new Set<string>();

  const consider = (itemKey: string) => {
    if (!itemKey || seen.has(itemKey)) {
      return;
    }
    const assignments = doc.items?.[itemKey] || [];
    if (
      assignments.length > 0 &&
      !assignments.every((assignment) =>
        isFurtherReadingAssignment(assignment, doc),
      )
    ) {
      return;
    }
    const item = resolveLibraryItem(libraryID, itemKey);
    if (!item) {
      return;
    }
    seen.add(itemKey);
    entries.push({
      item,
      assignment: pickDocumentFurtherReadingAssignment(assignments, doc),
    });
  };

  for (const itemKey of Object.keys(doc.items || {})) {
    consider(itemKey);
  }
  for (const key of doc.furtherReadingOrder || []) {
    consider(key);
  }
  for (const item of collectionRegularItems(collection)) {
    consider(item.key);
  }

  const titled = [...entries].sort((a, b) =>
    compareLocale(getItemTitle(a.item), getItemTitle(b.item)),
  );
  return applyPinnedShelfOrder(
    titled,
    (entry) => entry.item.key,
    doc.furtherReadingOrder || [],
  );
}

/**
 * Pinned-shelf reading for a syllabus. Always returned so a pin stays visible
 * when classes are done, empty, or every item sits in further reading.
 * Next-up prefers the first incomplete class assignment (class `itemOrder`),
 * then further reading (`furtherReadingOrder`). The cover stack follows that
 * same order; if nothing is unread, it shows the first items instead.
 */
export function getNextUpAssignment(
  collection: Zotero.Collection,
  document?: CollectionSyllabusDocument,
): NextUpReading {
  const doc = document || getCollectionDocument(collection);
  const libraryID = collection.libraryID;
  const classEntries = collectClassDisplayEntries(collection, doc);
  const furtherEntries = collectFurtherReadingDisplayEntries(collection, doc);

  let next: {
    classNumber: number | null;
    classTitle: string;
    item: Zotero.Item;
    assignment: ItemSyllabusAssignment | null;
  } | null = null;
  const unreadItems: Zotero.Item[] = [];
  const seenUnread = new Set<number>();

  const pushCover = (item: Zotero.Item) => {
    if (seenUnread.has(item.id) || unreadItems.length >= 3) {
      return;
    }
    seenUnread.add(item.id);
    unreadItems.push(item);
  };

  for (const entry of classEntries) {
    if (entry.classDone || entry.assignment.status === "done") {
      continue;
    }
    if (!next) {
      next = {
        classNumber: entry.classNumber,
        classTitle: entry.classTitle,
        item: entry.item,
        assignment: entry.assignment,
      };
    }
    pushCover(entry.item);
    if (unreadItems.length >= 3) {
      break;
    }
  }

  if (unreadItems.length < 3) {
    for (const entry of furtherEntries) {
      if (entry.assignment?.status === "done") {
        continue;
      }
      if (!next) {
        next = {
          classNumber: null,
          classTitle: "",
          item: entry.item,
          assignment: entry.assignment ?? null,
        };
      }
      pushCover(entry.item);
      if (unreadItems.length >= 3) {
        break;
      }
    }
  }

  if (unreadItems.length === 0) {
    for (const entry of classEntries) {
      pushCover(entry.item);
      if (unreadItems.length >= 3) {
        break;
      }
    }
    if (unreadItems.length < 3) {
      for (const entry of furtherEntries) {
        pushCover(entry.item);
        if (unreadItems.length >= 3) {
          break;
        }
      }
    }
  }

  return {
    collection,
    libraryID,
    isSyllabus: true,
    classNumber: next?.classNumber ?? null,
    classTitle: next?.classTitle ?? "",
    item: next?.item ?? unreadItems[0] ?? null,
    assignment: next?.assignment ?? null,
    unreadItems,
    progress: getSyllabusItemProgress(collection, doc),
  };
}

/** Cover-stack reading for a pinned non-syllabus collection. */
export function getPinnedCollectionReading(
  collection: Zotero.Collection,
): NextUpReading {
  const unreadItems = collectionRegularItems(collection).slice(0, 3);
  return {
    collection,
    libraryID: collection.libraryID,
    isSyllabus: false,
    classNumber: null,
    classTitle: "",
    item: unreadItems[0] ?? null,
    assignment: null,
    unreadItems,
    progress: null,
  };
}

function collectionRegularItems(collection: Zotero.Collection): Zotero.Item[] {
  try {
    const children = collection.getChildItems(false, false) || [];
    return children.filter((item) => {
      try {
        return item.isRegularItem() && !item.deleted;
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

function resolveLibraryItem(
  libraryID: number,
  itemKey: string,
): Zotero.Item | null {
  if (!itemKey) {
    return null;
  }
  try {
    const byKey = Zotero.Items.getByLibraryAndKey(libraryID, itemKey);
    if (byKey && isSyllabusMemberItem(byKey)) {
      return byKey;
    }
  } catch {
    // Fall through.
  }
  try {
    const id = Zotero.Items.getIDFromLibraryAndKey(libraryID, itemKey);
    if (typeof id === "number" && id > 0) {
      const item = getCachedItem(id) || Zotero.Items.get(id);
      if (item && isSyllabusMemberItem(item)) {
        return item;
      }
    }
  } catch {
    // Fall through.
  }
  return null;
}

export async function listNextUpReadings(
  libraryID?: number,
): Promise<NextUpReading[]> {
  const collections = await listPinnedSyllabi(libraryID);
  const readings: NextUpReading[] = [];
  for (const collection of collections) {
    if (collectionHasSyllabusNote(collection)) {
      readings.push(getNextUpAssignment(collection));
      continue;
    }
    readings.push(getPinnedCollectionReading(collection));
  }
  return readings;
}
