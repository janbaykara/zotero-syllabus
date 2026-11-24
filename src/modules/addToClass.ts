import { getCachedCollectionById } from "@janbaykara/zotero-cache";
import { isSyllabusAssignableItem } from "../utils/items";
import { compareLocale } from "../utils/locale";
import {
  getAllCollections,
  libraryDisplayName,
  libraryIsEditable,
} from "../utils/zotero";
import {
  addItemsToClass as addItemsToNumberedClass,
  addItemsToFurtherReading,
} from "./addItemsToClass";
import { getSyllabusCollectionDictionary } from "./syllabusNote";
import { SyllabusManager } from "./syllabus";

export type AddToClassKind = "class" | "further-reading" | "new-class";

export type AddToClassRow = {
  collectionId: number;
  collectionName: string;
  libraryID: number;
  libraryName: string;
  classNumber: number | undefined;
  classTitle: string;
  kind: AddToClassKind;
  nomenclature: string;
};

export type AddToClassGroup = {
  collectionId: number;
  collectionName: string;
  libraryID: number;
  libraryName: string;
  isCurrent: boolean;
  rows: AddToClassRow[];
};

export function addToClassRowQueryHaystack(row: AddToClassRow): string {
  return [
    row.collectionName,
    row.libraryName,
    row.classTitle,
    row.classNumber != null ? String(row.classNumber) : "",
    row.nomenclature,
  ]
    .join(" ")
    .toLowerCase();
}

export function filterAddToClassGroups(
  groups: AddToClassGroup[],
  query: string,
): AddToClassGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return groups;
  }
  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) =>
        addToClassRowQueryHaystack(row).includes(needle),
      ),
    }))
    .filter((group) => group.rows.length > 0);
}

export function selectedAssignableItems(items?: Zotero.Item[]): Zotero.Item[] {
  const source =
    items ??
    (() => {
      try {
        return ztoolkit.getGlobal("ZoteroPane").getSelectedItems() || [];
      } catch {
        return [];
      }
    })();
  return source.filter((item) => isSyllabusAssignableItem(item));
}

export function libraryIDsForAddToClass(items: Zotero.Item[]): number[] {
  return [...new Set(items.map((item) => item.libraryID).filter(Boolean))];
}

export function listSyllabusCollectionsForAddToClass(options?: {
  libraryIDs?: number[];
  currentCollectionId?: number | null;
}): Zotero.Collection[] {
  const dictionary = getSyllabusCollectionDictionary();
  const libraryFilter =
    options?.libraryIDs && options.libraryIDs.length > 0
      ? new Set(options.libraryIDs)
      : null;
  const collections = getAllCollections().filter((collection) => {
    try {
      if (collection.deleted) {
        return false;
      }
      if (!libraryIsEditable(collection.libraryID)) {
        return false;
      }
      if (libraryFilter && !libraryFilter.has(collection.libraryID)) {
        return false;
      }
      const ref = `${collection.libraryID}:${collection.key}`;
      return Boolean(dictionary[ref]);
    } catch {
      return false;
    }
  });
  collections.sort((a, b) => {
    if (a.id === options?.currentCollectionId) return -1;
    if (b.id === options?.currentCollectionId) return 1;
    return compareLocale(a.name, b.name);
  });
  return collections;
}

export function buildAddToClassGroups(options?: {
  libraryIDs?: number[];
  currentCollectionId?: number | null;
}): AddToClassGroup[] {
  const collections = listSyllabusCollectionsForAddToClass(options);
  const showLibrary = new Set(collections.map((c) => c.libraryID)).size > 1;
  return collections.map((collection) => {
    const { singularCapitalized } = SyllabusManager.getNomenclatureFormatted(
      collection.id,
    );
    const classNumbers = SyllabusManager.getFullClassNumberRange(collection.id);
    const nextClassNumber = classNumbers.length + 1;
    const libraryName = showLibrary
      ? libraryDisplayName(collection.libraryID)
      : "";
    const base = {
      collectionId: collection.id,
      collectionName: collection.name,
      libraryID: collection.libraryID,
      libraryName,
      nomenclature: singularCapitalized,
    };
    const rows: AddToClassRow[] = [
      ...classNumbers.map((classNumber) => ({
        ...base,
        classNumber,
        classTitle: SyllabusManager.getClassTitle(
          collection.id,
          classNumber,
          false,
        ),
        kind: "class" as const,
      })),
      {
        ...base,
        classNumber: nextClassNumber,
        classTitle: "",
        kind: "new-class" as const,
      },
      {
        ...base,
        classNumber: undefined,
        classTitle: "",
        kind: "further-reading" as const,
      },
    ];
    return {
      collectionId: collection.id,
      collectionName: collection.name,
      libraryID: collection.libraryID,
      libraryName,
      isCurrent: collection.id === options?.currentCollectionId,
      rows,
    };
  });
}

export async function addItemsToClass(options: {
  items: Zotero.Item[];
  collectionId: number;
  classNumber: number | undefined;
}): Promise<void> {
  // Shared helpers resolve parents, ensure collection membership (skipSelect),
  // then write assignments — avoids #55 where notes updated but items stayed out.
  if (options.classNumber == null) {
    await addItemsToFurtherReading(options.items, options.collectionId);
    return;
  }
  await addItemsToNumberedClass(
    options.items,
    options.collectionId,
    options.classNumber,
  );
}
