import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import SuperJSON from "superjson";
import {
  SyllabusManager,
  SettingsSyllabusMetadata,
  ItemSyllabusAssignment,
} from "../syllabus";
import { getAllCollections } from "../../utils/zotero";
import { getCachedItem, getCachedCollectionById } from "../../utils/cache";
import {
  getCollectionDocument,
  getDocumentGeneration,
  getHydratedItemAssignments,
  getSyllabusCollectionDictionary,
  subscribeToSyllabusDocumentChanges,
} from "../syllabusNote";

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

        const document = getCollectionDocument(collection);
        const items = syllabusData.itemIds
          .map((itemId) => {
            const item = getCachedItem(itemId);
            if (!item || !item.isRegularItem()) {
              return null;
            }
            return {
              zoteroItem: item,
              assignments: getHydratedItemAssignments(document, item.key),
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
  function getSnapshot() {
    const allCollections = getAllCollections();
    const allData = getSyllabusCollectionDictionary();

    const syllabi: SyllabiSnapshot["syllabi"] = [];

    for (const collection of allCollections) {
      const collectionKeyStr = SyllabusManager.getCollectionReferenceString(
        collection.libraryID,
        collection.key,
      );
      const collectionData = allData[collectionKeyStr];
      if (!collectionData) {
        continue;
      }

      const itemIds = collection
        .getChildItems()
        .filter((item) => item.isRegularItem())
        .map((item) => item.id);

      syllabi.push({
        collectionId: collection.id,
        collectionName: collection.name,
        metadata: collectionData,
        itemIds,
      });
    }

    return SuperJSON.stringify({ syllabi, version: getDocumentGeneration() });
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify(
        event: string,
        type: string,
        _ids: (number | string)[],
        _extraData: unknown,
      ) {
        if (
          type === "item" ||
          type === "collection-item" ||
          (type === "collection" && (event === "modify" || event === "refresh"))
        ) {
          onStoreChange();
        }
      },
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "item",
      "collection-item",
      "collection",
    ]);
    const unsubscribeDocuments =
      subscribeToSyllabusDocumentChanges(onStoreChange);

    return () => {
      unsubscribeDocuments();
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}
