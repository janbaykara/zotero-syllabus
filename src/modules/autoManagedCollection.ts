import { getManagedParentCollectionId } from "./classSubcollections";
import {
  getReadingScheduleCollectionContext,
  isManagedReadingScheduleCollection,
} from "./readingScheduleCollection";

export type CollectionTreeKind =
  | "reading-schedule-root"
  | "calendar-date"
  | "class-folder"
  | "syllabus";

let isManagedClassFolder: ((collectionId: number) => boolean) | undefined;
let isSyllabusRoot: ((collectionId: number) => boolean) | undefined;

/** Fallback for class folders not yet in the in-memory map (name/key match). */
export function registerManagedClassFolderCheck(
  check: (collectionId: number) => boolean,
): void {
  isManagedClassFolder = check;
}

/** Syllabus parent collections (own note), not managed children. */
export function registerSyllabusRootCheck(
  check: (collectionId: number) => boolean,
): void {
  isSyllabusRoot = check;
}

export function isManagedClassFolderCollection(collectionId: number): boolean {
  return (
    getManagedParentCollectionId(collectionId) != null ||
    (isManagedClassFolder?.(collectionId) ?? false)
  );
}

/** Class folders and the Reading schedule tree — not parent syllabi. */
export function isAutoManagedCollection(collectionId: number): boolean {
  if (isManagedReadingScheduleCollection(collectionId)) {
    return true;
  }
  return isManagedClassFolderCollection(collectionId);
}

export function getCollectionTreeKind(
  collectionId: number,
): CollectionTreeKind | null {
  const reading = getReadingScheduleCollectionContext(collectionId);
  if (reading?.kind === "root") {
    return "reading-schedule-root";
  }
  if (reading?.kind === "date") {
    return "calendar-date";
  }
  if (isManagedClassFolderCollection(collectionId)) {
    return "class-folder";
  }
  if (isSyllabusRoot?.(collectionId)) {
    return "syllabus";
  }
  return null;
}
