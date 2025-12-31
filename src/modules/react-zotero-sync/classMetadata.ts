import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { SettingsClassMetadata, SyllabusManager } from "../syllabus";

export function useZoteroClassMetadata(collectionId: number) {
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

export function createClassMetadataStore(collectionId: number) {
  const prefKey = SyllabusManager.getPreferenceKey(
    SyllabusManager.settingsKeys.COLLECTION_METADATA,
  );

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
        // Listen to setting events for our preference key
        if (type === "setting" && extraData?.pref === prefKey) {
          onStoreChange();
        }
        // Also listen to collection modify/refresh events in case metadata is updated
        if (
          type === "collection" &&
          ids.includes(collectionId) &&
          (event === "modify" || event === "refresh")
        ) {
          onStoreChange();
        }
      },
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "setting",
      "collection",
    ]);

    // Also listen to the custom event emitter for collection metadata changes
    // (since preference changes aren't notifiable in Zotero)
    const unsubscribeEmitter =
      SyllabusManager.onCollectionMetadataChange(onStoreChange);

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
      unsubscribeEmitter();
    };
  }

  return { getSnapshot, subscribe };
}
