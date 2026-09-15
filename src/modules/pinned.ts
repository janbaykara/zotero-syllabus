/**
 * Pinned items (tag on regular items) and pinned syllabi (tag on the
 * standalone Syllabus note). Optional intention child notes for items.
 * Next-up = first incomplete assignment in class order.
 */

import {
  assignmentClassNumber,
  orderedClassIds,
  type CollectionSyllabusDocument,
  type ItemSyllabusAssignment,
} from "../utils/schemas";
import { getCachedCollectionById, getCachedItem } from "../utils/cache";
import { compareLocale, getString } from "../utils/locale";
import { getItemTitle, isSyllabusMemberItem, readItemNote } from "../utils/items";
import { confirmExPrompt } from "../utils/window";
import {
  getCollectionDocument,
  getSyllabusNoteId,
  SYLLABUS_NOTE_TAG,
} from "./syllabusNote";

const pinnedListeners = new Set<() => void>();

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

/** Stored tag on pinned items and pinned Syllabus notes. Do not localize. */
export const PINNED_TAG = "pinned";

/** Stored tag on optional intention child notes. Do not localize. */
export const INTENTION_NOTE_TAG = "zotero-syllabus-pinned-intention";

/** Stored Reading Schedule child folder name. Do not localize. */
export const PINNED_FOLDER_NAME = "Pinned";

export type NextUpReading = {
  collection: Zotero.Collection;
  libraryID: number;
  classNumber: number;
  classTitle: string;
  item: Zotero.Item;
  assignment: ItemSyllabusAssignment;
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

export function isPinnedSyllabus(collection: Zotero.Collection): boolean {
  const note = findSyllabusNoteForCollection(collection);
  return note != null && hasTagSafe(note, PINNED_TAG);
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
      if (!note || !isPinnedSyllabusNote(note)) {
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

export async function setPinnedSyllabus(
  collection: Zotero.Collection,
  pinned: boolean,
): Promise<boolean> {
  const note = findSyllabusNoteForCollection(collection);
  if (!note) {
    return false;
  }
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

function childNoteIds(item: Zotero.Item): number[] {
  try {
    const getNotes = (
      item as Zotero.Item & { getNotes?: (asIDs?: boolean) => number[] }
    ).getNotes;
    if (typeof getNotes === "function") {
      const ids = getNotes.call(item, false);
      return Array.isArray(ids) ? ids.filter((id) => typeof id === "number") : [];
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
  try {
    const unescape = (Zotero.Utilities as { unescapeHTML?: (s: string) => string })
      ?.unescapeHTML;
    if (typeof unescape === "function") {
      return unescape(stripped).replace(/\n{3,}/g, "\n\n").trim();
    }
  } catch {
    // Fall through.
  }
  return stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
 * First incomplete class assignment in syllabus order, or null if caught up.
 */
export function getNextUpAssignment(
  collection: Zotero.Collection,
  document?: CollectionSyllabusDocument,
): NextUpReading | null {
  const doc = document || getCollectionDocument(collection);
  const classIds = orderedClassIds(doc);
  const libraryID = collection.libraryID;

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
        if (assignment.status === "done") {
          continue;
        }
        const item = Zotero.Items.getByLibraryAndKey(libraryID, itemKey);
        if (!item || !isSyllabusMemberItem(item)) {
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
    const first = sorted[0];
    if (first) {
      return {
        collection,
        libraryID,
        classNumber,
        classTitle: classMeta?.title || "",
        item: first.item,
        assignment: first.assignment,
      };
    }
  }

  return null;
}

export async function listNextUpReadings(
  libraryID?: number,
): Promise<NextUpReading[]> {
  const syllabi = await listPinnedSyllabi(libraryID);
  const readings: NextUpReading[] = [];
  for (const collection of syllabi) {
    const next = getNextUpAssignment(collection);
    if (next) {
      readings.push(next);
    }
  }
  return readings;
}
