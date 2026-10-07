import { useAtomValue } from "jotai";
import { GetByLibraryAndKeyArgs, SyllabusManager } from "../syllabus";
import {
  getCollectionDocumentSnapshot,
  getDocumentGeneration,
  getSyllabusNoteId,
  subscribeToSyllabusDocumentChanges,
} from "../syllabusNote";
import { getCachedItem } from "../../utils/cache";
import { atomFamilyFromExternal, atomFromExternal } from "./jotaiExternal";

export const documentGenerationAtom = atomFromExternal({
  getSnapshot: () => getDocumentGeneration(),
  subscribe: (onStoreChange) => {
    const unsubscribeDocuments =
      subscribeToSyllabusDocumentChanges(onStoreChange);
    const observer = {
      notify(_event: string, type: string) {
        if (type === "item" || type === "collection-item") {
          onStoreChange();
        }
      },
    };
    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "item",
      "collection-item",
    ]);
    return () => {
      unsubscribeDocuments();
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  },
});

export function useSyllabusDocumentGeneration() {
  return useAtomValue(documentGenerationAtom);
}

function collectionDocumentKey(
  collectionId: number | GetByLibraryAndKeyArgs,
): string {
  if (typeof collectionId === "number") {
    return String(collectionId);
  }
  return `${collectionId[0]}:${collectionId[1]}`;
}

export const collectionDocumentSnapshotAtomFamily = atomFamilyFromExternal(
  (collectionId: number | GetByLibraryAndKeyArgs) => ({
    getSnapshot: () =>
      `${getDocumentGeneration()}:${getCollectionDocumentSnapshot(collectionId)}`,
    subscribe: (onStoreChange: () => void) => {
      const observer = {
        notify(
          event: string,
          type: string,
          ids: (number | string)[],
          _extraData: unknown,
        ) {
          const noteId = getSyllabusNoteId(collectionId);
          if (type === "item") {
            if (noteId !== null && ids.includes(noteId)) {
              onStoreChange();
              return;
            }
            if (event === "add" || event === "modify") {
              for (const id of ids) {
                if (typeof id !== "number") continue;
                const item = getCachedItem(id);
                if (item?.isNote()) {
                  onStoreChange();
                  return;
                }
              }
            }
          }
          if (type === "collection-item") {
            onStoreChange();
            return;
          }
          if (
            type === "collection" &&
            (event === "modify" || event === "refresh")
          ) {
            const collection =
              SyllabusManager.getCollectionFromIdentifier(collectionId);
            if (collection && ids.includes(collection.id)) {
              onStoreChange();
            }
          }
        },
      };

      const notifierId = Zotero.Notifier.registerObserver(observer, [
        "item",
        "collection-item",
        "collection",
      ]);
      const unsubscribeDocuments =
        subscribeToSyllabusDocumentChanges(onStoreChange);

      return () => {
        unsubscribeDocuments();
        Zotero.Notifier.unregisterObserver(notifierId);
      };
    },
  }),
  (a, b) => collectionDocumentKey(a) === collectionDocumentKey(b),
);

export function useZoteroCollectionDocument(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  return useAtomValue(collectionDocumentSnapshotAtomFamily(collectionId));
}
