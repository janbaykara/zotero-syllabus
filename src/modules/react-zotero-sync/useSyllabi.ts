import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import SuperJSON from "superjson";
import {
  SyllabusManager,
  SettingsSyllabusMetadata,
  ItemSyllabusAssignment,
} from "../syllabus";
import { getAllCollections } from "../../utils/zotero";
import {
  getCachedItem,
  getCachedCollectionById,
} from "../../utils/cache";

export type SyllabusData = {
  collection: Zotero.Collection;
  metadata: SettingsSyllabusMetadata;
  items: Array<{
    zoteroItem: Zotero.Item;
    assignments: ItemSyllabusAssignment[];
  }>;
};

export type SyllabiSnapshot = {
  syllabi: Array<{
    collectionId: number;
    collectionName: string;
    metadata: SettingsSyllabusMetadata;
    itemIds: number[];
  }>;
  version?: number;
};

// This function will return all syllabi, collections and items in a single object. It will also refresh when the data changes.
export function useSyllabi(): SyllabusData[] {
  const store = useMemo(() => createSyllabiStore(), []);

  const __syllabiSnapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  const syllabi = useMemo(() => {
    const snapshot = SuperJSON.parse(__syllabiSnapshot) as SyllabiSnapshot;

    return snapshot.syllabi
      .map((syllabusData) => {
        const collection = getCachedCollectionById(syllabusData.collectionId);
        if (!collection) {
          return null;
        }

        const items = syllabusData.itemIds
          .map((itemId) => {
            const item = getCachedItem(itemId);
            if (!item || !item.isRegularItem()) {
              return null;
            }
            const assignments =
              SyllabusManager.getItemSyllabusDataForCollection(
                item,
                syllabusData.collectionId,
              );
            return {
              zoteroItem: item,
              assignments,
            };
          })
          .filter(Boolean) as Array<{
            zoteroItem: Zotero.Item;
            assignments: ItemSyllabusAssignment[];
          }>;

        return {
          collection,
          metadata: syllabusData.metadata,
          items,
        };
      })
      .filter(Boolean) as SyllabusData[];
  }, [__syllabiSnapshot]);

  return syllabi;
}

function createSyllabiStore() {
  // Version counter to force snapshot changes even if data appears the same
  let version = 0;

  function getSnapshot() {
    // Get fresh data from Zotero
    const allCollections = getAllCollections();
    const allData = SyllabusManager.getSettingsCollectionDictionaryData();

    const syllabi: SyllabiSnapshot["syllabi"] = [];

    for (const collection of allCollections) {
      const collectionId = collection.id;
      // Use the correct key format: `${libraryID}:${collectionKey}`
      const collectionKeyStr = SyllabusManager.getCollectionReferenceString(
        collection.libraryID,
        collection.key,
      );
      const collectionData = allData[collectionKeyStr];

      // Only include collections that have syllabus metadata
      if (!collectionData) {
        continue;
      }

      const items = collection.getChildItems();
      const itemIds = items
        .filter((item) => item.isRegularItem())
        .map((item) => item.id);

      syllabi.push({
        collectionId,
        collectionName: collection.name,
        metadata: collectionData,
        itemIds,
      });
    }

    // Include version in snapshot to ensure it changes on every update
    return SuperJSON.stringify({ syllabi, version });
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

        // Listen to item modify/delete events (assignments changed)
        if (type === "item" && (event === "modify" || event === "delete")) {
          shouldUpdate = true;
        }

        // Listen to collection-item events (items added/removed from collections)
        if (type === "collection-item") {
          shouldUpdate = true;
        }

        // Listen to collection modify/refresh events
        if (
          type === "collection" &&
          (event === "modify" || event === "refresh")
        ) {
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          // Increment version to force snapshot change
          version++;
          onStoreChange();
        }
      },
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "item",
      "collection-item",
      "collection",
    ]);

    // Register preference observer for collection metadata changes
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusManager.settingsKeys.COLLECTION_METADATA,
    );

    const prefObserverId = Zotero.Prefs.registerObserver(
      prefKey,
      (value: SettingsSyllabusMetadata) => {
        Zotero.debug(`Preference ${prefKey} changed to ${value}`);
        // Increment version to force snapshot change
        version++;
        onStoreChange();
      },
      true,
    );

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
      Zotero.Prefs.unregisterObserver(prefObserverId);
    };
  }

  return { getSnapshot, subscribe };
}
