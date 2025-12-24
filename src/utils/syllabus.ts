/**
 * Utility functions for managing syllabus data on Zotero items
 * Data is stored in the item's 'extra' field as JSON using ExtraFieldTool
 */

import { ExtraFieldTool } from "zotero-plugin-toolkit";

const SYLLABUS_DATA_KEY = "syllabus";

export const SYLLABUS_CLASS_NUMBER_FIELD = "syllabus-class-number";

// Create an ExtraFieldTool instance for safe extra field operations
const extraFieldTool = new ExtraFieldTool();

export enum SyllabusPriority {
  COURSE_INFO = "course-info",
  ESSENTIAL = "essential",
  RECOMMENDED = "recommended",
  OPTIONAL = "optional",
}

/**
 * Color definitions for syllabus priorities
 */
export const PRIORITY_COLORS: Record<SyllabusPriority, string> = {
  [SyllabusPriority.COURSE_INFO]: "#F97316", // orange
  [SyllabusPriority.ESSENTIAL]: "#8B5CF6", // purple
  [SyllabusPriority.RECOMMENDED]: "#3B82F6", // blue
  [SyllabusPriority.OPTIONAL]: "#AAA", // darker grey for better readability
};

/**
 * Human-readable labels for syllabus priorities
 */
export const PRIORITY_LABELS: Record<SyllabusPriority, string> = {
  [SyllabusPriority.COURSE_INFO]: "Course Information",
  [SyllabusPriority.ESSENTIAL]: "Essential",
  [SyllabusPriority.RECOMMENDED]: "Recommended",
  [SyllabusPriority.OPTIONAL]: "Optional",
};

export interface SyllabusData {
  [collectionId: string]: {
    priority?: SyllabusPriority;
    classInstruction?: string;
    classNumber?: number;
  };
}

/**
 * Get syllabus data from an item's extra field
 */
export function getSyllabusData(item: Zotero.Item): SyllabusData {
  const jsonStr = extraFieldTool.getExtraField(item, SYLLABUS_DATA_KEY);

  if (!jsonStr) {
    return {};
  }

  try {
    return JSON.parse(jsonStr) as SyllabusData;
  } catch (e) {
    ztoolkit.log("Error parsing syllabus data:", e);
    return {};
  }
}

/**
 * Set syllabus data in an item's extra field
 */
export async function setSyllabusData(
  item: Zotero.Item,
  data: SyllabusData,
): Promise<void> {
  const jsonStr = JSON.stringify(data);
  await extraFieldTool.setExtraField(item, SYLLABUS_DATA_KEY, jsonStr);
}

/**
 * Get syllabus priority for a specific collection
 */
export function getSyllabusPriority(
  item: Zotero.Item,
  collectionId: number | string,
): SyllabusPriority | "" {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);
  return data[collectionIdStr]?.priority || "";
}

/**
 * Set syllabus priority for a specific collection
 */
export async function setSyllabusPriority(
  item: Zotero.Item,
  collectionId: number | string,
  priority: SyllabusPriority | "",
): Promise<void> {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);

  if (!data[collectionIdStr]) {
    data[collectionIdStr] = {};
  }

  if (priority) {
    data[collectionIdStr].priority = priority;
  } else {
    delete data[collectionIdStr].priority;
    // Remove collection entry if priority, classInstruction, and classNumber are all empty
    if (
      !data[collectionIdStr].classInstruction &&
      !data[collectionIdStr].classNumber
    ) {
      delete data[collectionIdStr];
    }
  }

  await setSyllabusData(item, data);
}

/**
 * Get class instruction for a specific collection
 */
export function getSyllabusClassInstruction(
  item: Zotero.Item,
  collectionId: number | string,
): string {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);
  return data[collectionIdStr]?.classInstruction || "";
}

/**
 * Set class instruction for a specific collection
 */
export async function setSyllabusClassInstruction(
  item: Zotero.Item,
  collectionId: number | string,
  classInstruction: string,
): Promise<void> {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);

  if (!data[collectionIdStr]) {
    data[collectionIdStr] = {};
  }

  if (classInstruction && classInstruction.trim()) {
    data[collectionIdStr].classInstruction = classInstruction.trim();
  } else {
    delete data[collectionIdStr].classInstruction;
    // Remove collection entry if priority, classInstruction, and classNumber are all empty
    if (!data[collectionIdStr].priority && !data[collectionIdStr].classNumber) {
      delete data[collectionIdStr];
    }
  }

  await setSyllabusData(item, data);
}

/**
 * Get syllabus session number for a specific collection
 */
export function getSyllabusClassNumber(
  item: Zotero.Item,
  collectionId: number | string,
): number | undefined {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);
  return data[collectionIdStr]?.classNumber;
}

/**
 * Set syllabus session number for a specific collection
 */
export async function setSyllabusClassNumber(
  item: Zotero.Item,
  collectionId: number | string,
  classNumber: number | undefined,
): Promise<void> {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);

  if (!data[collectionIdStr]) {
    data[collectionIdStr] = {};
  }

  if (classNumber !== undefined && classNumber !== null) {
    data[collectionIdStr].classNumber = classNumber;
  } else {
    delete data[collectionIdStr].classNumber;
    // Remove collection entry if priority, classInstruction, and classNumber are all empty
    if (
      !data[collectionIdStr].priority &&
      !data[collectionIdStr].classInstruction
    ) {
      delete data[collectionIdStr];
    }
  }

  await setSyllabusData(item, data);
}

/**
 * Collection metadata stored in preferences
 * Structure: { [collectionId]: { description: string, classes: { [classNumber]: { title: string, description: string } } } }
 */
interface CollectionMetadata {
  [collectionId: string]: {
    description?: string;
    classes?: {
      [classNumber: string]: {
        title?: string;
        description?: string;
      };
    };
  };
}

/**
 * Get collection metadata from preferences
 */
function getCollectionMetadata(): CollectionMetadata {
  const prefKey = `${addon.data.config.prefsPrefix}.collectionMetadata`;
  const metadataStr = String(Zotero.Prefs.get(prefKey, true) || "");
  if (!metadataStr) {
    return {};
  }
  try {
    return JSON.parse(metadataStr) as CollectionMetadata;
  } catch (e) {
    ztoolkit.log("Error parsing collection metadata:", e);
    return {};
  }
}

/**
 * Set collection metadata in preferences
 */
async function setCollectionMetadata(
  metadata: CollectionMetadata,
): Promise<void> {
  const prefKey = `${addon.data.config.prefsPrefix}.collectionMetadata`;
  Zotero.Prefs.set(prefKey, JSON.stringify(metadata), true);
}

/**
 * Get collection description for a specific collection
 */
export function getCollectionDescription(
  collectionId: number | string,
): string {
  const metadata = getCollectionMetadata();
  const collectionIdStr = String(collectionId);
  return metadata[collectionIdStr]?.description || "";
}

/**
 * Set collection description for a specific collection
 */
export async function setCollectionDescription(
  collectionId: number | string,
  description: string,
): Promise<void> {
  const metadata = getCollectionMetadata();
  const collectionIdStr = String(collectionId);

  if (!metadata[collectionIdStr]) {
    metadata[collectionIdStr] = {};
  }

  if (description && description.trim()) {
    metadata[collectionIdStr].description = description.trim();
  } else {
    delete metadata[collectionIdStr].description;
    // Remove collection entry if it's empty
    if (!metadata[collectionIdStr].classes || Object.keys(metadata[collectionIdStr].classes || {}).length === 0) {
      delete metadata[collectionIdStr];
    }
  }

  await setCollectionMetadata(metadata);
}

/**
 * Get class title for a specific collection and class number
 */
export function getClassTitle(
  collectionId: number | string,
  classNumber: number,
): string {
  const metadata = getCollectionMetadata();
  const collectionIdStr = String(collectionId);
  const classNumberStr = String(classNumber);
  return metadata[collectionIdStr]?.classes?.[classNumberStr]?.title || "";
}

/**
 * Set class title for a specific collection and class number
 */
export async function setClassTitle(
  collectionId: number | string,
  classNumber: number,
  title: string,
): Promise<void> {
  const metadata = getCollectionMetadata();
  const collectionIdStr = String(collectionId);
  const classNumberStr = String(classNumber);

  if (!metadata[collectionIdStr]) {
    metadata[collectionIdStr] = {};
  }
  if (!metadata[collectionIdStr].classes) {
    metadata[collectionIdStr].classes = {};
  }
  if (!metadata[collectionIdStr].classes[classNumberStr]) {
    metadata[collectionIdStr].classes[classNumberStr] = {};
  }

  if (title && title.trim()) {
    metadata[collectionIdStr].classes[classNumberStr].title = title.trim();
  } else {
    delete metadata[collectionIdStr].classes[classNumberStr].title;
    // Remove class entry if it's empty
    if (!metadata[collectionIdStr].classes[classNumberStr].description) {
      delete metadata[collectionIdStr].classes[classNumberStr];
    }
    // Remove classes object if empty
    if (Object.keys(metadata[collectionIdStr].classes || {}).length === 0) {
      delete metadata[collectionIdStr].classes;
    }
    // Remove collection entry if it's empty
    if (!metadata[collectionIdStr].description && !metadata[collectionIdStr].classes) {
      delete metadata[collectionIdStr];
    }
  }

  await setCollectionMetadata(metadata);
}

/**
 * Get class description for a specific collection and class number
 */
export function getClassDescription(
  collectionId: number | string,
  classNumber: number,
): string {
  const metadata = getCollectionMetadata();
  const collectionIdStr = String(collectionId);
  const classNumberStr = String(classNumber);
  return metadata[collectionIdStr]?.classes?.[classNumberStr]?.description || "";
}

/**
 * Set class description for a specific collection and class number
 */
export async function setClassDescription(
  collectionId: number | string,
  classNumber: number,
  description: string,
): Promise<void> {
  const metadata = getCollectionMetadata();
  const collectionIdStr = String(collectionId);
  const classNumberStr = String(classNumber);

  if (!metadata[collectionIdStr]) {
    metadata[collectionIdStr] = {};
  }
  if (!metadata[collectionIdStr].classes) {
    metadata[collectionIdStr].classes = {};
  }
  if (!metadata[collectionIdStr].classes[classNumberStr]) {
    metadata[collectionIdStr].classes[classNumberStr] = {};
  }

  if (description && description.trim()) {
    metadata[collectionIdStr].classes[classNumberStr].description = description.trim();
  } else {
    delete metadata[collectionIdStr].classes[classNumberStr].description;
    // Remove class entry if it's empty
    if (!metadata[collectionIdStr].classes[classNumberStr].title) {
      delete metadata[collectionIdStr].classes[classNumberStr];
    }
    // Remove classes object if empty
    if (Object.keys(metadata[collectionIdStr].classes || {}).length === 0) {
      delete metadata[collectionIdStr].classes;
    }
    // Remove collection entry if it's empty
    if (!metadata[collectionIdStr].description && !metadata[collectionIdStr].classes) {
      delete metadata[collectionIdStr];
    }
  }

  await setCollectionMetadata(metadata);
}
