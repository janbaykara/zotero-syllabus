import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import SuperJSON from "superjson";
import { SyllabusManager, ItemSyllabusData } from "../syllabus";

export type ItemID = {
  [field in _ZoteroTypes.Item.ItemField]: string | unknown;
} & {
  id: number;
};

export type CollectionItemsSnapshot = {
  items: ItemID[];
};

export function useZoteroCollectionItems(collectionId: number) {
  // Create the store once per ID
  const store = useMemo(
    () => createCollectionItemsStore(collectionId),
    [collectionId],
  );

  const __itemsFromZotero = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  const parsedItems = useMemo(() => {
    const snapshot = SuperJSON.parse(
      __itemsFromZotero,
    ) as CollectionItemsSnapshot;
    return snapshot.items.map((item) => Zotero.Items.get(item.id));
  }, [__itemsFromZotero]);

  return parsedItems;
}

export function createCollectionItemsStore(collectionId: number) {
  function getSnapshot() {
    // Read directly from Zotero
    const collection = Zotero.Collections.get(collectionId);
    if (!collection) {
      return SuperJSON.stringify({ items: [] });
    }
    const items: ItemID[] = collection
      .getChildItems()
      .filter((item) => item.isRegularItem())
      .map((item) => {
        const syllabusData = SyllabusManager.getItemSyllabusData(item);
        return {
          id: item.id,
          ...item.toJSON(),
        };
      });
    return SuperJSON.stringify({ items });
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify(
        event: string,
        type: string,
        ids: (number | string)[],
        extraData: any,
      ) {
        let shouldUpdate = false;

        // Listen to collection-item events (items added/removed from collections)
        if (type === "collection-item") {
          shouldUpdate = true;
        }
        // Also listen to item events (add, modify, delete) that might affect items in this collection
        else if (
          type === "item" &&
          (event === "add" || event === "modify" || event === "delete")
        ) {
          // Check if the item belongs to our collection
          const itemIds = ids as number[];
          for (const itemId of itemIds) {
            try {
              const item = Zotero.Items.get(itemId);
              if (item && item.isRegularItem()) {
                const collections = item.getCollections();
                if (collections.includes(collectionId)) {
                  shouldUpdate = true;
                  break;
                }
              }
            } catch (e) {
              // Item might not exist anymore, trigger update anyway
              shouldUpdate = true;
              break;
            }
          }
        }
        // Listen to collection modify/refresh events
        else if (
          type === "collection" &&
          ids.includes(collectionId) &&
          (event === "modify" || event === "refresh")
        ) {
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          onStoreChange();
        }
      },
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "collection-item",
      "item",
      "collection",
    ]);

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}
