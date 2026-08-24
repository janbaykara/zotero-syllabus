import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import {
  SettingsClassMetadata,
  SyllabusManager,
  GetByLibraryAndKeyArgs,
} from "../syllabus";
import { createCollectionDocumentStore } from "./collectionDocument";
import { getCollectionDocument, metadataFromDocument } from "../syllabusNote";

export function useZoteroClassMetadata(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  const store = useMemo(
    () => createCollectionDocumentStore(collectionId),
    [collectionId],
  );

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const metadataFromZotero = useMemo(() => {
    void snapshot;
    return metadataFromDocument(getCollectionDocument(collectionId));
  }, [snapshot, collectionId]);

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
  return createCollectionDocumentStore(collectionId);
}
