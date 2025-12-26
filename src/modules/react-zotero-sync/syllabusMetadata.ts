import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { SettingsSyllabusMetadata, SyllabusManager } from "../syllabus";
import SuperJSON from "superjson";

export function useZoteroSyllabusMetadata(collectionId: number) {
  // Create the store once per ID
  const store = useMemo(
    () => createSyllabusMetadataStore(collectionId),
    [collectionId],
  );

  const __syllabusMetadata = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  const syllabusMetadata = useMemo(() => {
    return SuperJSON.parse(__syllabusMetadata) as SettingsSyllabusMetadata;
  }, [__syllabusMetadata]);

  const setDescription = useCallback(
    (description: string) => {
      SyllabusManager.setCollectionDescription(
        collectionId,
        description,
        "page",
      );
    },
    [collectionId],
  );

  const setClassDescription = useCallback(
    (classNumber: number, description: string) => {
      SyllabusManager.setClassDescription(
        collectionId,
        classNumber,
        description,
        "page",
      );
    },
    [collectionId],
  );

  const setClassTitle = useCallback(
    (classNumber: number, title: string) => {
      SyllabusManager.setClassTitle(collectionId, classNumber, title, "page");
    },
    [collectionId],
  );

  return [
    syllabusMetadata,
    setDescription,
    setClassDescription,
    setClassTitle,
  ] as const;
}

export function createSyllabusMetadataStore(collectionId: number) {
  const prefKey = SyllabusManager.getPreferenceKey(
    SyllabusManager.settingsKeys.COLLECTION_METADATA,
  );

  function getSnapshot() {
    // Read from preferences via SyllabusManager
    return SuperJSON.stringify(
      SyllabusManager.getSyllabusMetadata(collectionId),
    );
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
        // Also listen to collection modify/refresh events in case description is updated
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

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}
