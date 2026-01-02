import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { SyllabusManager, GetByLibraryAndKeyArgs } from "../syllabus";

export function useZoteroCollectionTitle(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  // Create the store once per ID
  const store = useMemo(
    () => createCollectionTitleStore(collectionId),
    [collectionId],
  );

  const titleFromZotero = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  const setTitle = useCallback(
    (title: string) => {
      const collection =
        SyllabusManager.getCollectionFromIdentifier(collectionId);
      if (collection) {
        SyllabusManager.setCollectionTitle(collection.id, title, "page");
      }
    },
    [collectionId],
  );

  return [titleFromZotero, setTitle] as const;
}

export function createCollectionTitleStore(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  function getSnapshot() {
    // Read directly from Zotero
    const collection =
      SyllabusManager.getCollectionFromIdentifier(collectionId);
    return collection ? collection.name : "";
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify(
        event: string,
        type: string,
        ids: (number | string)[],
        extraData: any,
      ) {
        // Only care about this collection, and events that can change the title
        const collection =
          SyllabusManager.getCollectionFromIdentifier(collectionId);
        if (
          collection &&
          type === "collection" &&
          ids.includes(collection.id) &&
          (event === "modify" || event === "refresh")
        ) {
          onStoreChange();
        }
      },
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "collection",
    ]);

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}
