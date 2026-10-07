/**
 * Pinned shelf + pin flags mirrored through Jotai.
 */

import { useCallback, useMemo } from "preact/hooks";
import { useAtomValue } from "jotai";
import { getCachedCollectionById, getCachedItem } from "../../utils/cache";
import {
  applyPinnedShelfOrder,
  getPinnedShelfOrder,
  isPinnedItem,
  isPinnedSyllabus,
  listNextUpReadings,
  listPinnedItems,
  notifyPinnedChanges,
  pinnedShelfEntryKey,
  resolvePinnedOrderLibraryID,
  subscribePinnedChanges,
  type NextUpReading,
} from "../pinned";
import { atomFamilyFromExternal, atomFromExternal } from "./jotaiExternal";

/** Bumps whenever pin tags / shelf order / related items change. */
let pinnedGeneration = 0;

function subscribePinnedSources(onStoreChange: () => void): () => void {
  const bump = () => {
    pinnedGeneration += 1;
    onStoreChange();
  };
  const unsubscribePinned = subscribePinnedChanges(bump);
  const notifierId = Zotero.Notifier.registerObserver(
    {
      notify(event: string, type: string) {
        if (type === "item" && (event === "modify" || event === "add")) {
          bump();
        }
      },
    },
    ["item"],
  );
  return () => {
    unsubscribePinned();
    Zotero.Notifier.unregisterObserver(notifierId);
  };
}

export const pinnedGenerationAtom = atomFromExternal({
  getSnapshot: () => pinnedGeneration,
  subscribe: subscribePinnedSources,
});

const pinnedSyllabusAtomFamily = atomFamilyFromExternal(
  (collectionId: number) => ({
    getSnapshot: () => {
      const collection = getCachedCollectionById(collectionId);
      return collection ? isPinnedSyllabus(collection) : false;
    },
    subscribe: subscribePinnedSources,
  }),
);

export function useIsPinnedSyllabus(collectionId: number): boolean {
  return useAtomValue(pinnedSyllabusAtomFamily(collectionId)) ?? false;
}

const pinnedItemAtomFamily = atomFamilyFromExternal((itemId: number) => ({
  getSnapshot: () => {
    const item = getCachedItem(itemId);
    return item ? isPinnedItem(item) : false;
  },
  subscribe: subscribePinnedSources,
}));

export function useIsPinnedItem(itemId: number): boolean {
  return useAtomValue(pinnedItemAtomFamily(itemId)) ?? false;
}

type PinnedScheduleKey = number | "all";

type PinnedScheduleCache = {
  pinnedItems: Zotero.Item[];
  nextUp: NextUpReading[];
  generation: number;
};

const pinnedScheduleCache = new Map<PinnedScheduleKey, PinnedScheduleCache>();

function scheduleKey(libraryID?: number): PinnedScheduleKey {
  return libraryID == null ? "all" : libraryID;
}

const pinnedScheduleAtomFamily = atomFamilyFromExternal(
  (key: PinnedScheduleKey) => {
    if (!pinnedScheduleCache.has(key)) {
      pinnedScheduleCache.set(key, {
        pinnedItems: [],
        nextUp: [],
        generation: 0,
      });
    }
    let loadToken = 0;
    const libraryID = key === "all" ? undefined : key;

    return {
      getSnapshot: () => pinnedScheduleCache.get(key)!.generation,
      subscribe: (onStoreChange: () => void) => {
        const reload = async () => {
          const token = ++loadToken;
          const [items, readings] = await Promise.all([
            listPinnedItems(libraryID),
            listNextUpReadings(libraryID),
          ]);
          if (token !== loadToken) {
            return;
          }
          const orderLibraryID = resolvePinnedOrderLibraryID(
            libraryID,
            items,
            readings,
          );
          const order =
            orderLibraryID != null ? getPinnedShelfOrder(orderLibraryID) : [];
          const cache = pinnedScheduleCache.get(key)!;
          cache.pinnedItems = applyPinnedShelfOrder(
            items,
            (item) => pinnedShelfEntryKey("item", item.key),
            order,
          );
          cache.nextUp = applyPinnedShelfOrder(
            readings,
            (reading) =>
              pinnedShelfEntryKey("collection", reading.collection.key),
            order,
          );
          cache.generation += 1;
          onStoreChange();
        };

        const unsubscribe = subscribePinnedSources(() => {
          void reload();
        });
        void reload();
        return () => {
          unsubscribe();
          loadToken += 1;
        };
      },
    };
  },
);

export function usePinnedScheduleData(libraryID?: number): {
  pinnedItems: Zotero.Item[];
  nextUp: NextUpReading[];
  reload: () => void;
} {
  const key = scheduleKey(libraryID);
  useAtomValue(pinnedScheduleAtomFamily(key));
  const cache = pinnedScheduleCache.get(key) ?? {
    pinnedItems: [] as Zotero.Item[],
    nextUp: [] as NextUpReading[],
    generation: 0,
  };

  const reload = useCallback(() => {
    notifyPinnedChanges();
  }, []);

  return useMemo(
    () => ({
      pinnedItems: cache.pinnedItems,
      nextUp: cache.nextUp,
      reload,
    }),
    [cache.pinnedItems, cache.nextUp, reload, cache.generation],
  );
}
