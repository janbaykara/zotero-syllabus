import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import SuperJSON from "superjson";

export type ItemID = {
  id: number;
}

export function useZoteroCollectionItems(collectionId: number) {
  // Create the store once per ID
  const store = useMemo(
    () => createCollectionItemsStore(collectionId),
    [collectionId]
  );

  const __itemsFromZotero = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot
  );

  const parsedItems = useMemo(() => {
    const items = SuperJSON.parse(__itemsFromZotero) as ItemID[]
    return items.map(item => Zotero.Items.get(item.id));
  }, [__itemsFromZotero]);

  return parsedItems;

}

export function createCollectionItemsStore(collectionId: number) {
  function getSnapshot() {
    // Read directly from Zotero
    const collection = Zotero.Collections.get(collectionId);
    if (!collection) {
      return SuperJSON.stringify([]);
    }
    const items: ItemID[] = collection.getChildItems().filter(item => item.isRegularItem()).map(item => ({
      id: item.id,
    }))
    return SuperJSON.stringify(items);
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify(event: string, type: string, ids: (number | string)[], extraData: any) {
        onStoreChange();
        // Listen to collection-item events (items added/removed from collections)
        if (type === 'collection-item') {
          onStoreChange();
        }
        // Also listen to item events (add, modify, delete) that might affect items in this collection
        if (type === 'item' && (event === 'add' || event === 'modify' || event === 'delete')) {
          // Check if the item belongs to our collection
          const itemIds = ids as number[];
          for (const itemId of itemIds) {
            try {
              const item = Zotero.Items.get(itemId);
              if (item && item.isRegularItem()) {
                const collections = item.getCollections();
                if (collections.includes(collectionId)) {
                  onStoreChange();
                  break;
                }
              }
            } catch (e) {
              // Item might not exist anymore, trigger update anyway
              onStoreChange();
              break;
            }
          }
        }
        // Listen to collection modify/refresh events
        if (type === 'collection' && ids.includes(collectionId) && (event === 'modify' || event === 'refresh')) {
          onStoreChange();
        }
      }
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, ['collection-item', 'item', 'collection']);

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}

