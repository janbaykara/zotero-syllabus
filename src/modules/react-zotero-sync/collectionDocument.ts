import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import {
  GetByLibraryAndKeyArgs,
  SyllabusManager,
} from "../syllabus";
import {
  getCollectionDocumentSnapshot,
  getDocumentGeneration,
  getSyllabusNoteId,
  subscribeToSyllabusDocumentChanges,
} from "../syllabusNote";
import { getCachedItem } from "../../utils/cache";

export function useSyllabusDocumentGeneration() {
  const store = useMemo(() => createDocumentGenerationStore(), []);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

function createDocumentGenerationStore() {
  function getSnapshot() {
    return getDocumentGeneration();
  }

  function subscribe(onStoreChange: () => void) {
    const unsubscribeDocuments = subscribeToSyllabusDocumentChanges(onStoreChange);
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
  }

  return { getSnapshot, subscribe };
}

export function useZoteroCollectionDocument(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  const store = useMemo(
    () => createCollectionDocumentStore(collectionId),
    [collectionId],
  );

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function createCollectionDocumentStore(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  function getSnapshot() {
    return `${getDocumentGeneration()}:${getCollectionDocumentSnapshot(collectionId)}`;
  }

  function subscribe(onStoreChange: () => void) {
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
        if (type === "collection" && (event === "modify" || event === "refresh")) {
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
    const unsubscribeDocuments = subscribeToSyllabusDocumentChanges(onStoreChange);

    return () => {
      unsubscribeDocuments();
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}
