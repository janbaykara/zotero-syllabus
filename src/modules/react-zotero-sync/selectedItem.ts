import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";

export function useZoteroSelectedItemId(): number | null {
  // Create the store once
  const store = useMemo(() => createSelectedItemStore(), []);

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function createSelectedItemStore() {
  let selectedItemId: number | null = null;
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;
  let intervalID: NodeJS.Timeout | null = null;

  function getSnapshot() {
    return selectedItemId;
  }

  function subscribe(onStoreChange: () => void) {
    listeners.add(onStoreChange);

    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        // Listen to item selection changes
        if (type === "item" || type === "tab") {
          const pane = ztoolkit.getGlobal("ZoteroPane");
          const selectedItems = pane?.getSelectedItems() || [];
          const newSelectedItemId =
            selectedItems.length > 0 ? selectedItems[0].id : null;
          if (newSelectedItemId !== selectedItemId) {
            selectedItemId = newSelectedItemId;
            listeners.forEach((l) => l());
          }
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "item",
      "tab",
    ]);

    // Also poll for changes as a fallback (Zotero doesn't always fire selection events reliably)
    intervalID = setInterval(() => {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      const selectedItems = pane?.getSelectedItems() || [];
      const newSelectedItemId =
        selectedItems.length > 0 ? selectedItems[0].id : null;
      if (newSelectedItemId !== selectedItemId) {
        selectedItemId = newSelectedItemId;
        listeners.forEach((l) => l());
      }
    }, 200);

    // Initial load
    const pane = ztoolkit.getGlobal("ZoteroPane");
    const selectedItems = pane?.getSelectedItems() || [];
    selectedItemId = selectedItems.length > 0 ? selectedItems[0].id : null;

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

