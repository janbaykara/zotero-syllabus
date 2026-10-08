import { useMemo } from "preact/hooks";
import { useAtomValue } from "jotai";
import SuperJSON from "superjson";
import {
  SyllabusManager,
  GetByLibraryAndKeyArgs,
  ItemSyllabusAssignment,
} from "../syllabus";
import {
  isAssignedStandaloneAttachment,
  isClassNoteItem,
  isSyllabusMemberItem,
} from "../../utils/items";
import {
  getCachedItem,
  isItemRemovalEvent,
  isObjectLifecycleEvent,
} from "../../utils/cache";
import { subscribePref } from "../../utils/prefSubscribe";
import {
  getCollectionDocument,
  getDocumentGeneration,
  getHydratedItemAssignments,
  subscribeToSyllabusDocumentChanges,
} from "../syllabusNote";
import { atomFamilyFromExternal } from "./jotaiExternal";

/** Snapshot only needs ids — live `Zotero.Item`s are resolved from the cache. */
export type CollectionItemsSnapshot = {
  items: Array<{ id: number }>;
  documentGeneration: number;
};

const EMPTY_COLLECTION_ITEMS_SNAPSHOT = SuperJSON.stringify({
  items: [],
  documentGeneration: 0,
} satisfies CollectionItemsSnapshot);

export type CollectionItemsOptions = {
  /**
   * Include items from descendant collections.
   * `"pref"` follows Zotero's `recursiveCollections` ("Show Items from Subcollections").
   */
  recursive?: boolean | "pref";
  /**
   * Include standalone class notes (assigned or not) for Syllabus / Gallery.
   * Home shelves and Reading Schedule keep notes out.
   */
  includeAssignedClassNotes?: boolean;
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

function assignedDocumentItemKeys(collection: Zotero.Collection): Set<string> {
  const document = getCollectionDocument(collection);
  const keys = new Set<string>();
  for (const [key, assignments] of Object.entries(document.items || {})) {
    if (assignments?.length) {
      keys.add(key);
    }
  }
  return keys;
}

function isSyllabusViewItem(
  item: Zotero.Item,
  assignedKeys: ReadonlySet<string>,
  includeAssignedClassNotes: boolean,
): boolean {
  if (
    isSyllabusMemberItem(item) ||
    isAssignedStandaloneAttachment(item, assignedKeys)
  ) {
    return true;
  }
  // Syllabus / Gallery list all top-level class notes (Personal + assigned).
  return includeAssignedClassNotes && isClassNoteItem(item);
}

function collectRegularItems(
  collection: Zotero.Collection,
  recursive: boolean,
  includeAssignedClassNotes: boolean,
): Zotero.Item[] {
  const assignedKeys = assignedDocumentItemKeys(collection);
  if (!recursive) {
    return collection
      .getChildItems()
      .filter((item) =>
        isSyllabusViewItem(item, assignedKeys, includeAssignedClassNotes),
      );
  }

  const seen = new Set<number>();
  const items: Zotero.Item[] = [];
  const walk = (col: Zotero.Collection) => {
    for (const item of col.getChildItems()) {
      if (
        !isSyllabusViewItem(item, assignedKeys, includeAssignedClassNotes) ||
        seen.has(item.id)
      ) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
    let children: Zotero.Collection[] = [];
    try {
      children = col.getChildCollections();
    } catch {
      // Keep empty when child collections cannot be read.
    }
    for (const child of children) {
      walk(child);
    }
  };
  walk(collection);
  return items;
}

type CollectionItemsFamilyKey = {
  collectionId: number | GetByLibraryAndKeyArgs;
  recursive: CollectionItemsOptions["recursive"];
  includeAssignedClassNotes: boolean;
};

function collectionItemsFamilyKeyToString(
  key: CollectionItemsFamilyKey,
): string {
  const id =
    typeof key.collectionId === "number"
      ? String(key.collectionId)
      : `${key.collectionId[0]}:${key.collectionId[1]}`;
  return `${id}:${String(key.recursive)}:${key.includeAssignedClassNotes ? 1 : 0}`;
}

const collectionItemsAtomFamily = atomFamilyFromExternal(
  (key: CollectionItemsFamilyKey) =>
    createCollectionItemsStore(key.collectionId, {
      recursive: key.recursive,
      includeAssignedClassNotes: key.includeAssignedClassNotes,
    }),
  (a, b) =>
    collectionItemsFamilyKeyToString(a) === collectionItemsFamilyKeyToString(b),
);

export function useZoteroCollectionItems(
  collectionId: number | GetByLibraryAndKeyArgs,
  options?: CollectionItemsOptions,
) {
  const recursive = options?.recursive ?? false;
  const includeAssignedClassNotes = options?.includeAssignedClassNotes ?? false;
  const __itemsFromZotero = useAtomValue(
    collectionItemsAtomFamily({
      collectionId,
      recursive,
      includeAssignedClassNotes,
    }),
  );

  const parsedItems = useMemo(() => {
    let snapshot: CollectionItemsSnapshot;
    try {
      snapshot = SuperJSON.parse(
        __itemsFromZotero ?? EMPTY_COLLECTION_ITEMS_SNAPSHOT,
      ) as CollectionItemsSnapshot;
    } catch (error) {
      ztoolkit.log("useZoteroCollectionItems: failed to parse snapshot", error);
      return [];
    }
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
          zoteroItem,
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
  const includeAssignedClassNotes = options?.includeAssignedClassNotes ?? false;

  function getSnapshot() {
    try {
      const collection =
        SyllabusManager.getCollectionFromIdentifier(collectionId);
      if (!collection) {
        return EMPTY_COLLECTION_ITEMS_SNAPSHOT;
      }
      const recursive = shouldIncludeSubcollections(recursiveMode);
      // Ids only — full `toJSON()` was unused and could blow SuperJSON.parse
      // when the jotai atom fell back to `undefined` after a snapshot throw.
      const items = collectRegularItems(
        collection,
        recursive,
        includeAssignedClassNotes,
      ).map((item) => ({ id: item.id }));
      return SuperJSON.stringify({
        items,
        documentGeneration: getDocumentGeneration(),
      } satisfies CollectionItemsSnapshot);
    } catch (error) {
      ztoolkit.log("collectionItems getSnapshot failed", error);
      return EMPTY_COLLECTION_ITEMS_SNAPSHOT;
    }
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
        else if (type === "item" && isObjectLifecycleEvent(event)) {
          if (isItemRemovalEvent(event) || event === "restore") {
            shouldUpdate = true;
          } else {
            const itemIds = ids as number[];
            for (const itemId of itemIds) {
              const item = getCachedItem(itemId);
              const isMember =
                item &&
                (isSyllabusMemberItem(item) ||
                  (includeAssignedClassNotes && isClassNoteItem(item)));
              if (isMember) {
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
        }
        // Listen to collection modify/refresh events
        else if (
          type === "collection" &&
          (isObjectLifecycleEvent(event) || event === "refresh")
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

    const unsubscribeRecursivePref =
      recursiveMode === "pref"
        ? subscribePref("recursiveCollections", onStoreChange)
        : null;

    return () => {
      unsubscribeDocuments();
      Zotero.Notifier.unregisterObserver(notifierId);
      unsubscribeRecursivePref?.();
    };
  }

  return {
    getSnapshot,
    subscribe,
    initial: EMPTY_COLLECTION_ITEMS_SNAPSHOT,
  };
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
    let children: Zotero.Collection[];
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
    let children: Zotero.Collection[];
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
