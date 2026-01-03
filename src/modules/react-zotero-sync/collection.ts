import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";

export function useSelectedCollectionId(): number | null {
  // Create the store once
  const store = useMemo(() => createSelectedCollectionStore(), []);

  const collectionId = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return collectionId;
}

export function createSelectedCollectionStore() {
  let selectedCollectionId: number | null = null;
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;
  let intervalID: NodeJS.Timeout | null = null;

  function getSnapshot() {
    return selectedCollectionId;
  }

  function updateSelectedCollection() {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    const collection = pane?.getSelectedCollection();
    const newCollectionId = collection?.id || null;

    // Check if collection actually changed
    if (newCollectionId !== selectedCollectionId) {
      selectedCollectionId = newCollectionId;
      listeners.forEach((l) => l());
    }
  }

  function subscribe(onStoreChange: () => void) {
    listeners.add(onStoreChange);

    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        _extraData: { [key: string]: any },
      ) => {
        if (type === "collection") {
          // Collection selection changed
          updateSelectedCollection();
        } else if (type === "tab") {
          // Tab change - update selected collection
          updateSelectedCollection();
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "collection",
      "tab",
    ]);

    // Also poll for changes as a fallback (Zotero doesn't always fire selection events reliably)
    intervalID = setInterval(() => {
      updateSelectedCollection();
    }, 200);

    // Initial load
    updateSelectedCollection();

    // Return an unsubscribe fn
    return () => {
      listeners.delete(onStoreChange);
      if (intervalID) {
        clearInterval(intervalID);
        intervalID = null;
      }
      if (listeners.size === 0 && notifierID) {
        Zotero.Notifier.unregisterObserver(notifierID);
        notifierID = null;
      }
    };
  }

  return { getSnapshot, subscribe };
}

