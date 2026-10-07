import { useAtomValue } from "jotai";
import { readGalleryNoteHtml, subscribeGalleryNoteChanges } from "./galleryNote";
import { atomFamilyFromExternal } from "./react-zotero-sync/jotaiExternal";

type GalleryNoteKey = { itemId: number; collectionId: number };

const galleryNoteHtmlAtomFamily = atomFamilyFromExternal(
  (key: GalleryNoteKey) => ({
    getSnapshot: () => {
      const item = Zotero.Items.get(key.itemId);
      if (!item) {
        return "";
      }
      return readGalleryNoteHtml(item, key.collectionId);
    },
    subscribe: (onStoreChange) => subscribeGalleryNoteChanges(onStoreChange),
  }),
  (a, b) => a.itemId === b.itemId && a.collectionId === b.collectionId,
);

/** Live sanitized HTML for the item’s gallery note in this collection. */
export function useGalleryNoteText(
  item: Zotero.Item,
  collectionId: number,
): string {
  return (
    useAtomValue(
      galleryNoteHtmlAtomFamily({ itemId: item.id, collectionId }),
    ) ?? ""
  );
}
