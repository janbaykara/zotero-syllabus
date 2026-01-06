import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import SuperJSON from "superjson";
import {
  SyllabusManager,
  ItemSyllabusData,
  GetByLibraryAndKeyArgs,
  ItemSyllabusAssignment,
} from "../syllabus";
import { getCachedItem } from "../../utils/cache";

export type ItemID = {
  [field in _ZoteroTypes.Item.ItemField]: string | unknown;
} & {
  id: number;
};

export type CollectionItemsSnapshot = {
  items: ItemID[];
};

export function useZoteroCollectionItems(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
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
    return snapshot.items
      .map((itemJSON) => {
        const zoteroItem = getCachedItem(itemJSON.id);
        if (!zoteroItem) {
          return null;
        }
        const assignments = SyllabusManager.getItemSyllabusDataForCollection(
          zoteroItem,
          collectionId,
        );
        return {
          zoteroItem,
          assignments,
        };
      })
      .filter(Boolean) as {
      zoteroItem: Zotero.Item;
      assignments: ItemSyllabusAssignment[];
    }[];
  }, [__itemsFromZotero]);

  return parsedItems;
}

export function createCollectionItemsStore(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  function getSnapshot() {
    // Read directly from Zotero
    const collection =
      SyllabusManager.getCollectionFromIdentifier(collectionId);
    if (!collection) {
      return SuperJSON.stringify({ items: [] });
    }
    const items: ItemID[] = collection
      .getChildItems()
      .filter((item) => item.isRegularItem())
      .map((item) => {
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
            const item = getCachedItem(itemId);
            if (item && item.isRegularItem()) {
              const collections = item.getCollections();
              const collection =
                SyllabusManager.getCollectionFromIdentifier(collectionId);
              if (collection && collections.includes(collection.id)) {
                shouldUpdate = true;
                break;
              }
            } else {
              // Item might not exist anymore, trigger update anyway
              shouldUpdate = true;
              break;
            }
          }
        }
        // Listen to collection modify/refresh events
        else if (
          type === "collection" &&
          (event === "modify" || event === "refresh")
        ) {
          const collection =
            SyllabusManager.getCollectionFromIdentifier(collectionId);
          if (collection && ids.includes(collection.id)) {
            shouldUpdate = true;
          }
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
