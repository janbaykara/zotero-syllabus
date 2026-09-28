import { getCachedCollectionById } from "../utils/cache";
import { pickLibraryItems } from "../utils/itemPicker";
import { resolveItemsForClassAssignment } from "../utils/items";
import { SyllabusManager } from "./syllabus";

function itemIsAlreadyInClass(
  item: Zotero.Item,
  collectionId: number,
  classNumber: number,
): boolean {
  const classId = SyllabusManager.getClassIdByNumber(collectionId, classNumber);
  return SyllabusManager.getItemSyllabusDataForCollection(
    item,
    collectionId,
  ).some(
    (assignment) =>
      (classId != null && assignment.classId === classId) ||
      assignment.classNumber === classNumber,
  );
}

async function ensureItemInCollection(
  item: Zotero.Item,
  collection: Zotero.Collection,
): Promise<void> {
  try {
    if (item.getCollections().includes(collection.id)) {
      return;
    }
  } catch {
    // Still try addToCollection — the item may not be a member yet.
  }
  try {
    item.addToCollection(collection.id);
    await item.saveTx({ skipSelect: true });
  } catch (error) {
    ztoolkit.log("Error adding item to collection:", error);
  }
}

/**
 * Add library items to a numbered class: collection membership + assignment.
 * Items already assigned to this class are skipped. Manual order, when
 * present, appends the new assignment ids.
 */
export async function addItemsToClass(
  items: readonly Zotero.Item[],
  collectionId: number,
  classNumber: number,
): Promise<void> {
  const collection = getCachedCollectionById(collectionId);
  if (!collection || items.length === 0) {
    return;
  }

  const toAdd = resolveItemsForClassAssignment(items, collection);
  const addedAssignmentIds: string[] = [];

  for (const item of toAdd) {
    if (itemIsAlreadyInClass(item, collectionId, classNumber)) {
      continue;
    }

    await ensureItemInCollection(item, collection);

    const beforeIds = new Set(
      SyllabusManager.getItemSyllabusDataForCollection(item, collectionId)
        .map((assignment) => assignment.id)
        .filter((id): id is string => Boolean(id)),
    );

    await SyllabusManager.addClassAssignment(
      item,
      collectionId,
      classNumber,
      {},
      "page",
    );

    const added = SyllabusManager.getItemSyllabusDataForCollection(
      item,
      collectionId,
    ).find((assignment) => assignment.id && !beforeIds.has(assignment.id));
    if (added?.id) {
      addedAssignmentIds.push(added.id);
    }
  }

  if (addedAssignmentIds.length === 0) {
    return;
  }

  const order = SyllabusManager.getClassItemOrder(collectionId, classNumber);
  if (order.length === 0) {
    return;
  }
  const next = [
    ...order,
    ...addedAssignmentIds.filter((id) => !order.includes(id)),
  ];
  if (next.length !== order.length) {
    await SyllabusManager.setClassItemOrder(
      collectionId,
      classNumber,
      next,
      "page",
    );
  }
}

const pickingForClass = new Set<string>();

/** Open the library item picker and assign the confirmed selection. */
export async function pickAndAddItemsToClass(
  collectionId: number,
  classNumber: number,
): Promise<void> {
  const key = `${collectionId}:${classNumber}`;
  if (pickingForClass.has(key)) {
    return;
  }
  pickingForClass.add(key);
  try {
    const collection = getCachedCollectionById(collectionId);
    const items = await pickLibraryItems({
      libraryID: collection?.libraryID,
    });
    if (items.length === 0) {
      return;
    }
    await addItemsToClass(items, collectionId, classNumber);
  } finally {
    pickingForClass.delete(key);
  }
}
