import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { SyllabusManager } from "../syllabus";
import { getCachedItem } from "../../utils/cache";

export function useZoteroItem(itemId: number | null) {
  // Create the store once per item ID
  const store = useMemo(() => createItemStore(itemId), [itemId]);

  const version = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const item = useMemo(() => {
    // ztoolkit.log("useZoteroItem.useMemo", { itemId, version });
    if (!itemId) {
      return null;
    }
    return getCachedItem(itemId);
  }, [itemId, version]);

  // We return the number because the extra field isn't gettable, by default, so we need a concrete indication of change or invalidation.
  return { item, version } as { item: Zotero.Item | null; version: number };
}

export function createItemStore(itemId: number | null) {
  let version = 0;
  // ztoolkit.log("useZoteroItem.createItemStore", { itemId, version });
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;

  function getSnapshot() {
    // ztoolkit.log("useZoteroItem.createItemStore.getSnapshot", {
    //   itemId,
    //   version,
    // });
    return version;
  }

  function subscribe(onStoreChange: () => void) {
    if (!itemId) {
      return () => {}; // No-op unsubscribe
    }

    listeners.add(onStoreChange);

    const observer = {
      notify(
        event: string,
        type: string,
        ids: (number | string)[],
        _extraData: any,
      ) {
        // ztoolkit.log("useZoteroItem.subscriber.notify", {
        //     event,
        //       type,
        //       ids,
        //       version,
        // });
        // Listen to item modify/delete events for this specific item
        if (type === "item" && ids.includes(itemId)) {
          version++;
          if (event === "modify") {
            listeners.forEach((l) => l());
          } else if (event === "delete") {
            // Item was deleted, increment version to signal it's gone
            listeners.forEach((l) => l());
          }
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(observer, ["item"]);

    // Return an unsubscribe fn
    return () => {
      listeners.delete(onStoreChange);
      if (listeners.size === 0 && notifierID) {
        Zotero.Notifier.unregisterObserver(notifierID);
        notifierID = null;
      }
    };
  }

  return { getSnapshot, subscribe };
}
