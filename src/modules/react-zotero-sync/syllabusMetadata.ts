import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { SyllabusManager, GetByLibraryAndKeyArgs } from "../syllabus";
import { Priority } from "../../utils/schemas";
import { createCollectionDocumentStore } from "./collectionDocument";
import { getCollectionDocument, metadataFromDocument } from "../syllabusNote";

export function useZoteroSyllabusMetadata(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  const store = useMemo(
    () => createCollectionDocumentStore(collectionId),
    [collectionId],
  );

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const syllabusMetadata = useMemo(() => {
    void snapshot;
    return metadataFromDocument(getCollectionDocument(collectionId));
  }, [snapshot, collectionId]);

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

  const setCslStyle = useCallback(
    (cslStyle: string | null) => {
      SyllabusManager.setCslStyle(collectionId, cslStyle, "page");
    },
    [collectionId],
  );

  const setCreateSubcollections = useCallback(
    (createSubcollections: boolean) => {
      SyllabusManager.setCreateSubcollections(
        collectionId,
        createSubcollections,
        "page",
      );
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
    setCslStyle,
    setCreateSubcollections,
  ] as const;
}

export function createSyllabusMetadataStore(
  collectionId: number | GetByLibraryAndKeyArgs,
) {
  return createCollectionDocumentStore(collectionId);
}
