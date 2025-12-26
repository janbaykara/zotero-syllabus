import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { SyllabusManager } from "../syllabus";

export function useZoteroCollectionTitle(collectionId: number) {
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
      SyllabusManager.setCollectionTitle(collectionId, title, "page");
    },
    [collectionId],
  );

  return [titleFromZotero, setTitle] as const;
}

export function createCollectionTitleStore(collectionId: number) {
  function getSnapshot() {
    // Read directly from Zotero
    const collection = Zotero.Collections.get(collectionId);
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
        if (
          type === "collection" &&
          ids.includes(collectionId) &&
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
