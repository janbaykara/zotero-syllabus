import { getCachedCollectionById } from "../utils/cache";
import { pickLibraryItems } from "../utils/itemPicker";
import { resolveItemsForClassAssignment } from "../utils/items";
import { collectionLibraryIsEditable } from "../utils/zotero";
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

function itemIsAlreadyUnnumbered(
  item: Zotero.Item,
  collectionId: number,
): boolean {
  return SyllabusManager.getItemSyllabusDataForCollection(
    item,
    collectionId,
  ).some((assignment) => {
    const resolved =
      SyllabusManager.getClassNumber(collectionId, assignment.classId) ??
      assignment.classNumber;
    return (
      resolved === undefined &&
      Boolean(assignment.priority || assignment.classInstruction)
    );
  });
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

async function appendAssignmentIdsToClassOrder(
  collectionId: number,
  classNumber: number | null,
  addedAssignmentIds: string[],
): Promise<void> {
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

  await appendAssignmentIdsToClassOrder(
    collectionId,
    classNumber,
    addedAssignmentIds,
  );
}

/**
 * Metadata so a drop into the unnumbered (Course Information) section does not
 * become classless Further reading. Keeps an existing priority/instruction;
 * otherwise uses the collection’s first priority (same as addItemsToUnnumbered).
 */
export function priorityPatchForUnnumbered(
  collectionId: number,
  existing?: { priority?: string; classInstruction?: string },
): { priority?: string } {
  if (existing?.priority || existing?.classInstruction) {
    return {};
  }
  const priority =
    SyllabusManager.getPrioritiesForCollection(collectionId)[0]?.id;
  return priority ? { priority } : {};
}

/**
 * Add items to the unnumbered (Course Information) top section.
 * Uses the collection’s first priority so readings stay out of Further reading.
 */
export async function addItemsToUnnumbered(
  items: readonly Zotero.Item[],
  collectionId: number,
): Promise<void> {
  const collection = getCachedCollectionById(collectionId);
  if (!collection || items.length === 0) {
    return;
  }

  const { priority } = priorityPatchForUnnumbered(collectionId);
  if (!priority) {
    return;
  }

  const toAdd = resolveItemsForClassAssignment(items, collection);
  const addedAssignmentIds: string[] = [];

  for (const item of toAdd) {
    if (itemIsAlreadyUnnumbered(item, collectionId)) {
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
      null,
      { priority },
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

  await appendAssignmentIdsToClassOrder(collectionId, null, addedAssignmentIds);
}

/**
 * Add items as further reading: collection membership + append to manual order.
 * Does not create a class assignment (items without a class land here).
 */
export async function addItemsToFurtherReading(
  items: readonly Zotero.Item[],
  collectionId: number,
): Promise<void> {
  const collection = getCachedCollectionById(collectionId);
  if (!collection || items.length === 0) {
    return;
  }

  const toAdd = resolveItemsForClassAssignment(items, collection);
  const addedKeys: string[] = [];

  for (const item of toAdd) {
    await ensureItemInCollection(item, collection);
    if (item.key) {
      addedKeys.push(item.key);
    }
  }

  if (addedKeys.length === 0) {
    return;
  }

  const current = SyllabusManager.getFurtherReadingOrder(collectionId);
  const unique = addedKeys.filter(
    (key, index) => addedKeys.indexOf(key) === index,
  );
  await SyllabusManager.setFurtherReadingOrder(
    collectionId,
    [...current.filter((key) => !unique.includes(key)), ...unique],
    "page",
  );
}

/** Add library items to a collection (no syllabus assignment). */
export async function addItemsToCollection(
  items: readonly Zotero.Item[],
  collectionId: number,
): Promise<void> {
  const collection = getCachedCollectionById(collectionId);
  if (!collection || items.length === 0) {
    return;
  }
  if (!collectionLibraryIsEditable(collection)) {
    return;
  }

  const toAdd = resolveItemsForClassAssignment(items, collection);
  for (const item of toAdd) {
    await ensureItemInCollection(item, collection);
  }
}

const pickingKeys = new Set<string>();

async function pickAndRun(
  key: string,
  collectionId: number,
  run: (items: Zotero.Item[]) => Promise<void>,
): Promise<void> {
  if (pickingKeys.has(key)) {
    return;
  }
  pickingKeys.add(key);
  try {
    const collection = getCachedCollectionById(collectionId);
    const items = await pickLibraryItems({
      libraryID: collection?.libraryID,
    });
    if (items.length === 0) {
      return;
    }
    await run(items);
  } finally {
    pickingKeys.delete(key);
  }
}

/** Open the library item picker and assign the confirmed selection. */
export async function pickAndAddItemsToClass(
  collectionId: number,
  classNumber: number,
): Promise<void> {
  await pickAndRun(
    `${collectionId}:class:${classNumber}`,
    collectionId,
    (items) => addItemsToClass(items, collectionId, classNumber),
  );
}

export async function pickAndAddItemsToUnnumbered(
  collectionId: number,
): Promise<void> {
  await pickAndRun(`${collectionId}:unnumbered`, collectionId, (items) =>
    addItemsToUnnumbered(items, collectionId),
  );
}

export async function pickAndAddItemsToFurtherReading(
  collectionId: number,
): Promise<void> {
  await pickAndRun(`${collectionId}:further-reading`, collectionId, (items) =>
    addItemsToFurtherReading(items, collectionId),
  );
}

export async function pickAndAddItemsToCollection(
  collectionId: number,
): Promise<void> {
  await pickAndRun(`${collectionId}:collection`, collectionId, (items) =>
    addItemsToCollection(items, collectionId),
  );
}
