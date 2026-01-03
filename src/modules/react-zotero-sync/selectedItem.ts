import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { SyllabusManager } from "../syllabus";

export function useZoteroSelectedItemIds(): number[] | null {
  // Create the store once
  const store = useMemo(() => createSelectedItemStore(), []);

  const itemIds = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // Return the first item ID for backwards compatibility
  return !!itemIds && itemIds.length > 0 ? itemIds : null;
}

export function createSelectedItemStore() {
  let selectedItemIds: number[] = [];
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;
  let intervalID: NodeJS.Timeout | null = null;

  function getSnapshot() {
    return selectedItemIds;
  }

  function updateSelectedItems() {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    const selectedItems = pane?.getSelectedItems() || [];
    const newSelectedItemIds = selectedItems
      .filter((item) => item.isRegularItem())
      .map((item) => item.id);

    // Check if items actually changed
    if (
      newSelectedItemIds.length !== selectedItemIds.length ||
      !newSelectedItemIds.every((id, idx) => id === selectedItemIds[idx])
    ) {
      selectedItemIds = newSelectedItemIds;
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
        if (type === "item") {
          // Check if this is a modify/delete event for any currently selected item
          const itemIdsArray = ids as number[];
          const hasSelectedItem = selectedItemIds.some((id) =>
            itemIdsArray.includes(id),
          );

          if (hasSelectedItem && (event === "modify" || event === "delete")) {
            if (event === "modify") {
              // Items were modified, invalidate cache for affected items
              for (const itemId of selectedItemIds) {
                if (itemIdsArray.includes(itemId)) {
                  try {
                    const item = Zotero.Items.get(itemId);
                    if (item) {
                      SyllabusManager.invalidateSyllabusDataCache(item);
                    }
                  } catch (e) {
                    // Item might not exist anymore
                  }
                }
              }
              listeners.forEach((l) => l());
            } else if (event === "delete") {
              // Remove deleted items from selection
              selectedItemIds = selectedItemIds.filter(
                (id) => !itemIdsArray.includes(id),
              );
              listeners.forEach((l) => l());
            }
          } else {
            // Selection change or other item event - update selected items
            updateSelectedItems();
          }
        } else if (type === "tab") {
          // Tab change - update selected items
          updateSelectedItems();
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "item",
      "tab",
    ]);

    // Also poll for changes as a fallback (Zotero doesn't always fire selection events reliably)
    intervalID = setInterval(() => {
      updateSelectedItems();
    }, 200);

    // Initial load
    updateSelectedItems();

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
