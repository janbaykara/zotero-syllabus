import { useMemo } from "preact/hooks";
import { atom, useAtomValue } from "jotai";
import { ItemSyllabusAssignment } from "../syllabus";
import { getCachedItem } from "../../utils/cache";
import { isSyllabusAssignableItem } from "../../utils/items";
import { collectionDocumentSnapshotAtomFamily } from "./collectionDocument";
import {
  getCollectionDocument,
  getHydratedItemAssignments,
} from "../syllabusNote";

export type ItemAssignmentsSnapshot = {
  assignments: ItemSyllabusAssignment[];
};

const emptyDocumentSnapshotAtom = atom("0:");

export function useZoteroItemAssignments(
  itemId: number | null,
  collectionId: number | null,
): ItemSyllabusAssignment[] {
  const snapshot = useAtomValue(
    collectionId
      ? collectionDocumentSnapshotAtomFamily(collectionId)
      : emptyDocumentSnapshotAtom,
  );

  return useMemo(() => {
    void snapshot;
    if (!itemId || !collectionId) {
      return [];
    }
    const item = getCachedItem(itemId);
    if (!isSyllabusAssignableItem(item)) {
      return [];
    }
    return getHydratedItemAssignments(
      getCollectionDocument(collectionId),
      item.key,
      item,
    );
  }, [snapshot, itemId, collectionId]);
}
