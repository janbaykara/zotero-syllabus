import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import {
  SettingsClassMetadata,
  SyllabusManager,
  GetByLibraryAndKeyArgs,
} from "../syllabus";

export function useZoteroClassMetadata(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  // Create the store once per ID
  const store = useMemo(
    () => createClassMetadataStore(collectionId),
    [collectionId],
  );

  const metadataFromZotero = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  const setClassMetadata = useCallback(
    (classNumber: number, metadata: Partial<SettingsClassMetadata>) => {
      if (metadata.title !== undefined) {
        SyllabusManager.setClassTitle(
          collectionId,
          classNumber,
          metadata.title,
          "page",
        );
      }
      if (metadata.description !== undefined) {
        SyllabusManager.setClassDescription(
          collectionId,
          classNumber,
          metadata.description,
          "page",
        );
      }
      if (metadata.readingDate !== undefined) {
        SyllabusManager.setClassReadingDate(
          collectionId,
          classNumber,
          metadata.readingDate,
          "page",
        );
      }
    },
    [collectionId],
  );

  const setClassReadingDate = useCallback(
    (classNumber: number, readingDate: string | undefined) => {
      SyllabusManager.setClassReadingDate(
        collectionId,
        classNumber,
        readingDate,
        "page",
      );
    },
    [collectionId],
  );

  return [metadataFromZotero, setClassMetadata, setClassReadingDate] as const;
}

export function createClassMetadataStore(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  function getSnapshot() {
    // Read from preferences via SyllabusManager
    const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
    return metadata;
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify(
        event: string,
        type: string,
        ids: (number | string)[],
        extraData: any,
      ) {
        // Listen to collection modify/refresh events in case metadata is updated
        const collection =
          SyllabusManager.getCollectionFromIdentifier(collectionId);
        if (
          collection &&
          type === "collection" &&
          ids.includes(collection.id) &&
          (event === "modify" || event === "refresh")
        ) {
          onStoreChange();
        }
      },
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "collection",
    ]);

    // Register preference observer for collection metadata changes
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusManager.settingsKeys.COLLECTION_METADATA,
    );

    const prefObserverId = Zotero.Prefs.registerObserver(
      prefKey,
      (value) => {
        Zotero.debug(`Preference ${prefKey} changed to ${value}`);
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
