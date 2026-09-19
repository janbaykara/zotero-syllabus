import { useEffect, useMemo, useState } from "preact/hooks";
import {
  galleryNoteFingerprint,
  readGalleryNoteText,
  subscribeGalleryNoteChanges,
} from "./galleryNote";

/** Live plain text for the item’s gallery note in this collection. */
export function useGalleryNoteText(
  item: Zotero.Item,
  collectionId: number,
): string {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeGalleryNoteChanges(() => setTick((n) => n + 1)), []);
  const fingerprint = galleryNoteFingerprint(item, collectionId);
  return useMemo(() => {
    void tick;
    return readGalleryNoteText(item, collectionId);
  }, [item, collectionId, tick, fingerprint]);
}
