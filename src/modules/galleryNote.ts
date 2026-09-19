/**
 * Collection-scoped gallery notes: child notes of regular items, tagged
 * `zotero-syllabus-gallery:{collectionKey}` so they only show in that
 * collection’s gallery / card views. Edited via Zotero’s built-in note UI.
 */

import { getCachedCollectionById, getCachedItem } from "../utils/cache";
import { readItemNote } from "../utils/items";
import { noteHtmlToPlainText } from "./pinned";

/** Tag prefix; full tag is prefix + collection key. Do not localize. */
export const GALLERY_NOTE_TAG_PREFIX = "zotero-syllabus-gallery:";

const galleryNoteListeners = new Set<() => void>();
let galleryNoteNotifierID: string | null = null;

export function subscribeGalleryNoteChanges(listener: () => void): () => void {
  galleryNoteListeners.add(listener);
  return () => {
    galleryNoteListeners.delete(listener);
  };
}

export function notifyGalleryNoteChanges(): void {
  for (const listener of [...galleryNoteListeners]) {
    try {
      listener();
    } catch (error) {
      ztoolkit.log("Error in gallery note listener:", error);
    }
  }
}

export function galleryNoteTag(collectionKey: string): string {
  return `${GALLERY_NOTE_TAG_PREFIX}${collectionKey}`;
}

export function isGalleryNoteTag(tag: string): boolean {
  return tag.startsWith(GALLERY_NOTE_TAG_PREFIX);
}

export function collectionKeyFromId(collectionId: number): string | null {
  if (!collectionId) {
    return null;
  }
  try {
    const collection =
      getCachedCollectionById(collectionId) ||
      Zotero.Collections.get(collectionId) ||
      null;
    const key = collection?.key;
    return key ? String(key) : null;
  } catch {
    return null;
  }
}

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

function itemHasGalleryNoteTag(item: Zotero.Item): boolean {
  try {
    const tags = item.getTags?.() || [];
    for (const entry of tags) {
      const tag =
        typeof entry === "string"
          ? entry
          : String((entry as { tag?: string })?.tag || "");
      if (isGalleryNoteTag(tag)) {
        return true;
      }
    }
  } catch {
    // Ignore.
  }
  return false;
}

export function findGalleryNote(
  item: Zotero.Item,
  collectionKey: string,
): Zotero.Item | null {
  if (!collectionKey) {
    return null;
  }
  const tag = galleryNoteTag(collectionKey);
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
    if (hasTagSafe(note, tag)) {
      return note;
    }
  }
  return null;
}

export function findGalleryNoteForCollection(
  item: Zotero.Item,
  collectionId: number,
): Zotero.Item | null {
  const key = collectionKeyFromId(collectionId);
  if (!key) {
    return null;
  }
  return findGalleryNote(item, key);
}

export async function ensureGalleryNote(
  item: Zotero.Item,
  collection: Zotero.Collection,
): Promise<Zotero.Item | null> {
  const key = String(collection.key || "");
  if (!key) {
    return null;
  }
  const existing = findGalleryNote(item, key);
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
    note.addTag(galleryNoteTag(key));
    await note.saveTx({ skipSelect: true });
  } catch (error) {
    ztoolkit.log("Error tagging gallery note:", error);
  }
  notifyGalleryNoteChanges();
  return note;
}

export function readGalleryNoteText(
  item: Zotero.Item,
  collectionId: number,
): string {
  const note = findGalleryNoteForCollection(item, collectionId);
  if (!note) {
    return "";
  }
  return noteHtmlToPlainText(readItemNote(note));
}

/** For memo / role features: note id + dateModified, or empty. */
export function galleryNoteFingerprint(
  item: Zotero.Item,
  collectionId: number,
): string {
  const note = findGalleryNoteForCollection(item, collectionId);
  if (!note) {
    return "";
  }
  try {
    return `${note.id}:${note.dateModified || ""}`;
  } catch {
    return String(note.id);
  }
}

export async function openGalleryNote(
  item: Zotero.Item,
  collection: Zotero.Collection,
): Promise<void> {
  const note = await ensureGalleryNote(item, collection);
  if (!note) {
    return;
  }
  try {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    if (pane && typeof pane.selectItem === "function") {
      await pane.selectItem(note.id);
    }
  } catch (error) {
    ztoolkit.log("Error selecting gallery note:", error);
  }
}

export async function openGalleryNoteByCollectionId(
  item: Zotero.Item,
  collectionId: number,
): Promise<void> {
  const collection =
    getCachedCollectionById(collectionId) ||
    Zotero.Collections.get(collectionId) ||
    null;
  if (!collection) {
    return;
  }
  await openGalleryNote(item, collection);
}

export async function deleteGalleryNote(
  item: Zotero.Item,
  collectionId: number,
): Promise<boolean> {
  const note = findGalleryNoteForCollection(item, collectionId);
  if (!note) {
    return false;
  }
  try {
    await note.eraseTx();
    notifyGalleryNoteChanges();
    return true;
  } catch (error) {
    ztoolkit.log("Error deleting gallery note:", error);
    return false;
  }
}

export function initializeGalleryNotes(): void {
  if (galleryNoteNotifierID) {
    return;
  }
  galleryNoteNotifierID = Zotero.Notifier.registerObserver(
    {
      notify(event: string, type: string, ids: (number | string)[]) {
        if (type !== "item") {
          return;
        }
        if (
          event !== "add" &&
          event !== "modify" &&
          event !== "trash" &&
          event !== "delete" &&
          event !== "restore"
        ) {
          return;
        }
        for (const id of ids) {
          if (typeof id !== "number") {
            continue;
          }
          const item = resolveItem(id);
          if (!item) {
            // Deleted — still notify so UIs clear stale text.
            notifyGalleryNoteChanges();
            return;
          }
          try {
            if (item.isNote() && itemHasGalleryNoteTag(item)) {
              notifyGalleryNoteChanges();
              return;
            }
          } catch {
            // Ignore.
          }
        }
      },
    },
    ["item"],
    "syllabus-gallery-notes",
  );
}

export function shutdownGalleryNotes(): void {
  if (galleryNoteNotifierID) {
    try {
      Zotero.Notifier.unregisterObserver(galleryNoteNotifierID);
    } catch {
      // Ignore.
    }
    galleryNoteNotifierID = null;
  }
}
