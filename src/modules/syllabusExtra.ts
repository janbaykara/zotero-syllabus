import { ExtraFieldTool } from "zotero-plugin-toolkit";
import {
  ItemSyllabusAssignmentEntity,
  ItemSyllabusDataEntity,
  type ItemSyllabusAssignment,
  type ItemSyllabusData,
} from "../utils/schemas";
import { getCachedCollectionById } from "../utils/cache";
import {
  SYLLABUS_EXTRA_KEY,
  collectionRefFromCollection,
  mergeItemAssignmentsInDocument,
  resolveSyllabusRoot,
} from "./syllabusNote";

const extraFieldTool = new ExtraFieldTool();

function pickAssignmentsFromExtra(
  extraData: ItemSyllabusData,
  collection: Zotero.Collection,
): ItemSyllabusAssignment[] | null {
  const ref = collectionRefFromCollection(collection);
  if (extraData[ref]?.length) {
    return extraData[ref];
  }
  const keys = Object.keys(extraData);
  if (keys.length === 0) {
    return null;
  }
  const first = extraData[keys[0]];
  return Array.isArray(first) && first.length ? first : null;
}

function readSyllabusExtra(item: Zotero.Item): ItemSyllabusData | null {
  const extraText = item.getField("extra");
  if (!extraText || !String(extraText).includes(`${SYLLABUS_EXTRA_KEY}:`)) {
    return null;
  }
  const jsonStr = extraFieldTool.getExtraField(item, SYLLABUS_EXTRA_KEY);
  if (!jsonStr) {
    return null;
  }
  try {
    const parsed = JSON.parse(jsonStr);
    const result = ItemSyllabusDataEntity.safeParse(parsed);
    if (result.type !== "ok") {
      return null;
    }
    return result.value;
  } catch {
    return null;
  }
}

async function clearSyllabusExtra(item: Zotero.Item): Promise<void> {
  const fields = extraFieldTool.getExtraFields(item);
  if (!fields.has(SYLLABUS_EXTRA_KEY)) {
    return;
  }
  fields.delete(SYLLABUS_EXTRA_KEY);
  await extraFieldTool.replaceExtraFields(item, fields);
}

function stripAssignmentStatus(
  assignments: ItemSyllabusAssignment[],
): ItemSyllabusAssignment[] {
  return assignments.map((assignment) => {
    const parsed = ItemSyllabusAssignmentEntity.safeParse({
      ...assignment,
      status: null,
    });
    return parsed.type === "ok"
      ? parsed.value
      : { ...assignment, status: null };
  });
}

export async function absorbSyllabusExtraFromItems(
  items: Zotero.Item[],
): Promise<void> {
  const byCollection = new Map<
    number,
    {
      collection: Zotero.Collection;
      updates: Record<string, ItemSyllabusAssignment[]>;
    }
  >();
  const toClear: Zotero.Item[] = [];

  for (const item of items) {
    if (!item?.isRegularItem()) {
      continue;
    }
    const extraData = readSyllabusExtra(item);
    if (!extraData) {
      continue;
    }

    const collectionIds = item.getCollections();
    let absorbed = false;
    for (const collectionId of collectionIds) {
      const collection = getCachedCollectionById(collectionId);
      if (!collection) {
        continue;
      }
      if (resolveSyllabusRoot(collection).id !== collection.id) {
        continue;
      }
      const assignments = pickAssignmentsFromExtra(extraData, collection);
      if (!assignments) {
        continue;
      }
      const bucket = byCollection.get(collection.id) || {
        collection,
        updates: {},
      };
      bucket.updates[item.key] = stripAssignmentStatus(assignments);
      byCollection.set(collection.id, bucket);
      absorbed = true;
    }

    if (absorbed) {
      toClear.push(item);
    }
  }

  for (const { collection, updates } of byCollection.values()) {
    await mergeItemAssignmentsInDocument(collection, updates);
  }
  for (const item of toClear) {
    await clearSyllabusExtra(item);
  }
}
