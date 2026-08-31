import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import SuperJSON from "superjson";
import { getCachedCollectionById, getCachedItem } from "../utils/cache";
import { SyllabusManager } from "./syllabus";
import { getString, compareLocale } from "../utils/locale";

export type SubcollectionNode = {
  collectionId: number;
  name: string;
  itemIds: number[];
  children: SubcollectionNode[];
};

export type SubcollectionTreeSnapshot = {
  root: SubcollectionNode | null;
};

function buildNode(collection: Zotero.Collection): SubcollectionNode {
  let childCollections: Zotero.Collection[] = [];
  try {
    childCollections = collection
      .getChildCollections()
      .filter((child) => {
        try {
          return !child.deleted;
        } catch {
          return false;
        }
      })
      .sort((a, b) => compareLocale(a.name || "", b.name || ""));
  } catch {
    childCollections = [];
  }

  let items: Zotero.Item[] = [];
  try {
    items = collection.getChildItems().filter((item) => {
      try {
        return item.isRegularItem();
      } catch {
        return false;
      }
    });
  } catch {
    items = [];
  }

  return {
    collectionId: collection.id,
    name: collection.name || getString("untitled"),
    itemIds: items.map((item) => item.id),
    children: childCollections.map(buildNode),
  };
}

function collectSubtreeIds(node: SubcollectionNode, into: Set<number>) {
  into.add(node.collectionId);
  for (const child of node.children) {
    collectSubtreeIds(child, into);
  }
}

/**
 * Nested subcollection tree for the selected collection (direct items + children).
 */
export function useSubcollectionTree(collectionId: number) {
  const store = useMemo(
    () => createSubcollectionTreeStore(collectionId),
    [collectionId],
  );

  const snapshotJson = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return useMemo(() => {
    const snapshot = SuperJSON.parse(snapshotJson) as SubcollectionTreeSnapshot;
    const root = snapshot.root;
    if (!root) {
      return {
        root: null as SubcollectionNode | null,
        resolveItems: (_ids: number[]) => [] as Zotero.Item[],
      };
    }

    const resolveItems = (ids: number[]) =>
      ids
        .map((id) => getCachedItem(id))
        .filter((item): item is Zotero.Item => !!item && item.isRegularItem());

    return { root, resolveItems };
  }, [snapshotJson]);
}

function createSubcollectionTreeStore(collectionId: number) {
  let cachedIds = new Set<number>([collectionId]);

  function getSnapshot() {
    const collection =
      SyllabusManager.getCollectionFromIdentifier(collectionId) ||
      getCachedCollectionById(collectionId);
    if (!collection || collection.deleted) {
      cachedIds = new Set([collectionId]);
      return SuperJSON.stringify({
        root: null,
      } satisfies SubcollectionTreeSnapshot);
    }

    const root = buildNode(collection);
    const ids = new Set<number>();
    collectSubtreeIds(root, ids);
    cachedIds = ids;

    return SuperJSON.stringify({
      root,
    } satisfies SubcollectionTreeSnapshot);
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify(
        event: string,
        type: string,
        ids: (number | string)[],
        _extraData: unknown,
      ) {
        let shouldUpdate = false;

        if (type === "collection-item") {
          shouldUpdate = true;
        } else if (
          type === "collection" &&
          (event === "add" ||
            event === "modify" ||
            event === "delete" ||
            event === "refresh")
        ) {
          shouldUpdate = true;
        } else if (
          type === "item" &&
          (event === "add" || event === "modify" || event === "delete")
        ) {
          for (const id of ids as number[]) {
            const item = getCachedItem(id);
            if (!item) {
              shouldUpdate = true;
              break;
            }
            try {
              if (
                item.isRegularItem() &&
                item.getCollections().some((cid) => cachedIds.has(cid))
              ) {
                shouldUpdate = true;
                break;
              }
            } catch {
              shouldUpdate = true;
              break;
            }
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

    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}
