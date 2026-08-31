import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { ItemSyllabusAssignment } from "../syllabus";
import { getCachedItem } from "../../utils/cache";
import { isSyllabusMemberItem } from "../../utils/items";
import { createCollectionDocumentStore } from "./collectionDocument";
import {
  getCollectionDocument,
  getHydratedItemAssignments,
} from "../syllabusNote";

export type ItemAssignmentsSnapshot = {
  assignments: ItemSyllabusAssignment[];
};

export function useZoteroItemAssignments(
  itemId: number | null,
  collectionId: number | null,
): ItemSyllabusAssignment[] {
  const store = useMemo(() => {
    if (!collectionId) {
      return {
        getSnapshot: () => "0:",
        subscribe: () => () => {},
      };
    }
    return createCollectionDocumentStore(collectionId);
  }, [collectionId]);

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return useMemo(() => {
    void snapshot;
    if (!itemId || !collectionId) {
      return [];
    }
    const item = getCachedItem(itemId);
    if (!isSyllabusMemberItem(item)) {
      return [];
    }
    return getHydratedItemAssignments(
      getCollectionDocument(collectionId),
      item.key,
    );
  }, [snapshot, itemId, collectionId]);
}
