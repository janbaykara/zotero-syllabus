import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import SuperJSON from "superjson";
import {
  SyllabusManager,
  GetByLibraryAndKeyArgs,
  ItemSyllabusAssignment,
} from "../syllabus";
import { getCachedItem } from "../../utils/cache";
import {
  getCollectionDocument,
  getDocumentGeneration,
  getHydratedItemAssignments,
  subscribeToSyllabusDocumentChanges,
} from "../syllabusNote";

export type ItemID = {
  [field in _ZoteroTypes.Item.ItemField]: string | unknown;
} & {
  id: number;
};

export type CollectionItemsSnapshot = {
  items: ItemID[];
  documentGeneration: number;
};

export type CollectionItemsOptions = {
  /**
   * Include items from descendant collections.
   * `"pref"` follows Zotero's `recursiveCollections` ("Show Items from Subcollections").
   */
  recursive?: boolean | "pref";
};

function shouldIncludeSubcollections(
  recursive: CollectionItemsOptions["recursive"],
): boolean {
  if (recursive === true) {
    return true;
  }
  if (recursive === "pref") {
    try {
      return !!Zotero.Prefs.get("recursiveCollections");
    } catch {
      return false;
    }
  }
  return false;
}

function collectRegularItems(
  collection: Zotero.Collection,
  recursive: boolean,
): Zotero.Item[] {
  if (!recursive) {
    return collection.getChildItems().filter((item) => item.isRegularItem());
  }

  const seen = new Set<number>();
  const items: Zotero.Item[] = [];
  const walk = (col: Zotero.Collection) => {
    for (const item of col.getChildItems()) {
      if (!item.isRegularItem() || seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
    let children: Zotero.Collection[] = [];
    try {
      children = col.getChildCollections();
    } catch {
      children = [];
    }
    for (const child of children) {
      walk(child);
    }
  };
  walk(collection);
  return items;
}

export function useZoteroCollectionItems(
  collectionId: number | GetByLibraryAndKeyArgs,
  options?: CollectionItemsOptions,
) {
  const recursive = options?.recursive ?? false;
  // Create the store once per ID + recursive mode
  const store = useMemo(
    () => createCollectionItemsStore(collectionId, { recursive }),
    [collectionId, recursive],
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
        const document = getCollectionDocument(collectionId);
        const assignments = getHydratedItemAssignments(
          document,
          zoteroItem.key,
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
  }, [__itemsFromZotero, collectionId]);

  return parsedItems;
}

export function createCollectionItemsStore(
  collectionId: number | GetByLibraryAndKeyArgs,
  options?: CollectionItemsOptions,
) {
  const recursiveMode = options?.recursive ?? false;

  function getSnapshot() {
    // Read directly from Zotero
    const collection =
      SyllabusManager.getCollectionFromIdentifier(collectionId);
    if (!collection) {
      return SuperJSON.stringify({ items: [] });
    }
    const recursive = shouldIncludeSubcollections(recursiveMode);
    const items: ItemID[] = collectRegularItems(collection, recursive).map(
      (item) => {
        return {
          id: item.id,
          ...item.toJSON(),
        };
      },
    );
    return SuperJSON.stringify({
      items,
      documentGeneration: getDocumentGeneration(),
    });
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify(
        event: string,
        type: string,
        ids: (number | string)[],
        _extraData: any,
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
              // When listing subcollections, also refresh for items in descendants.
              if (
                collection &&
                shouldIncludeSubcollections(recursiveMode) &&
                itemInCollectionTree(item, collection)
              ) {
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
          (event === "modify" ||
            event === "refresh" ||
            event === "add" ||
            event === "delete")
        ) {
          const collection =
            SyllabusManager.getCollectionFromIdentifier(collectionId);
          if (collection && ids.includes(collection.id)) {
            shouldUpdate = true;
          } else if (
            collection &&
            shouldIncludeSubcollections(recursiveMode) &&
            (ids as number[]).some((id) =>
              collectionIsDescendantOf(id, collection),
            )
          ) {
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
    const unsubscribeDocuments =
      subscribeToSyllabusDocumentChanges(onStoreChange);

    let prefObserverID: ReturnType<
      typeof Zotero.Prefs.registerObserver
    > | null = null;
    if (recursiveMode === "pref") {
      prefObserverID = Zotero.Prefs.registerObserver(
        "recursiveCollections",
        () => {
          onStoreChange();
        },
        true,
      );
    }

    return () => {
      unsubscribeDocuments();
      Zotero.Notifier.unregisterObserver(notifierId);
      if (prefObserverID != null) {
        Zotero.Prefs.unregisterObserver(prefObserverID);
      }
    };
  }

  return { getSnapshot, subscribe };
}

function itemInCollectionTree(
  item: Zotero.Item,
  root: Zotero.Collection,
): boolean {
  const ids = new Set(item.getCollections());
  if (ids.has(root.id)) {
    return true;
  }
  const walk = (col: Zotero.Collection): boolean => {
    let children: Zotero.Collection[] = [];
    try {
      children = col.getChildCollections();
    } catch {
      return false;
    }
    for (const child of children) {
      if (ids.has(child.id) || walk(child)) {
        return true;
      }
    }
    return false;
  };
  return walk(root);
}

function collectionIsDescendantOf(
  collectionId: number,
  root: Zotero.Collection,
): boolean {
  const walk = (col: Zotero.Collection): boolean => {
    let children: Zotero.Collection[] = [];
    try {
      children = col.getChildCollections();
    } catch {
      return false;
    }
    for (const child of children) {
      if (child.id === collectionId || walk(child)) {
        return true;
      }
    }
    return false;
  };
  return walk(root);
}
