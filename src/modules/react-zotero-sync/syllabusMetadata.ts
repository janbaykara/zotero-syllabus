import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import {
  SettingsSyllabusMetadata,
  SyllabusManager,
  GetByLibraryAndKeyArgs,
} from "../syllabus";
import SuperJSON from "superjson";
import { Priority } from "../../utils/schemas";

export function useZoteroSyllabusMetadata(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
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

  const setNomenclature = useCallback(
    (nomenclature: string) => {
      SyllabusManager.setNomenclature(collectionId, nomenclature, "page");
    },
    [collectionId],
  );

  const setPriorities = useCallback(
    (priorities: Priority[]) => {
      SyllabusManager.setPriorities(collectionId, priorities, "page");
    },
    [collectionId],
  );

  const setInstitution = useCallback(
    (institution: string) => {
      SyllabusManager.setInstitution(collectionId, institution, "page");
    },
    [collectionId],
  );

  const setCourseCode = useCallback(
    (courseCode: string) => {
      SyllabusManager.setCourseCode(collectionId, courseCode, "page");
    },
    [collectionId],
  );

  const setLocked = useCallback(
    (locked: boolean) => {
      SyllabusManager.setLocked(collectionId, locked, "page");
    },
    [collectionId],
  );

  const setLinks = useCallback(
    (links: string[]) => {
      SyllabusManager.setCollectionLinks(collectionId, links, "page");
    },
    [collectionId],
  );

  return [
    syllabusMetadata,
    setDescription,
    setClassDescription,
    setClassTitle,
    setNomenclature,
    setPriorities,
    setInstitution,
    setCourseCode,
    setLocked,
    setLinks,
  ] as const;
}

export function createSyllabusMetadataStore(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
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
        ztoolkit.log("Syllabus metadata changed:", event, type, ids, extraData);

        // Listen to collection modify/refresh events in case description is updated
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
