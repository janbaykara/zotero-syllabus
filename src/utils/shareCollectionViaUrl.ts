/** Context-menu flow: Share via URL for a collection. */

import { isPublishApiConfigured } from "./publishAuth";
import { isClassNoteItem } from "./items";
import { runCollectionPublish } from "./runCollectionPublish";
import type { ShareKind } from "./sharePayload";
import { getPublishedSyllabusUrl } from "./publishUrls";
import {
  collectionHasSyllabusNote,
  metadataFromDocument,
  getCollectionDocument,
} from "../modules/syllabusNote";

export function canShareCollectionViaUrl(
  collection: Zotero.Collection | null | undefined,
): boolean {
  if (!collection || !isPublishApiConfigured()) return false;
  try {
    if (collection.deleted) return false;
    return true;
  } catch {
    return false;
  }
}

export function collectionHasPublishedUrl(
  collection: Zotero.Collection,
): boolean {
  try {
    return !!getPublishedSyllabusUrl(collection.id);
  } catch {
    return false;
  }
}

function collectionPublishItems(collection: Zotero.Collection): Zotero.Item[] {
  try {
    return (collection.getChildItems(false, false) || []).filter(
      (item) => item.isRegularItem?.() && !isClassNoteItem(item),
    );
  } catch {
    return [];
  }
}

/**
 * Open the collection share wizard and publish. Progress uses ProgressWindow
 * only (no in-page banner — context menu has no page chrome).
 */
export async function shareCollectionViaUrl(
  collection: Zotero.Collection,
  opts?: { initialKind?: ShareKind },
): Promise<boolean> {
  const items = collectionPublishItems(collection);
  const initialKind: ShareKind =
    opts?.initialKind ||
    (collectionHasSyllabusNote(collection.id) ? "syllabus" : "gallery");

  const meta = collectionHasSyllabusNote(collection.id)
    ? metadataFromDocument(getCollectionDocument(collection.id))
    : null;

  return runCollectionPublish({
    collectionId: collection.id,
    items,
    initialKind,
    title: collection.name || undefined,
    courseCode: meta?.courseCode || undefined,
    institution: meta?.institution || undefined,
    cslStyle: meta?.cslStyle || null,
    setStatus: () => {},
    onPublishedUrl: () => {},
  });
}
