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
  ESSENTIAL = "essential",
  RECOMMENDED = "recommended",
  OPTIONAL = "optional",
}

/**
 * Color definitions for syllabus priorities
 */
export const PRIORITY_COLORS: Record<SyllabusPriority, string> = {
  [SyllabusPriority.ESSENTIAL]: "#8B5CF6", // purple
  [SyllabusPriority.RECOMMENDED]: "#3B82F6", // blue
  [SyllabusPriority.OPTIONAL]: "#AAA", // darker grey for better readability
};

/**
 * Human-readable labels for syllabus priorities
 */
export const PRIORITY_LABELS: Record<SyllabusPriority, string> = {
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
    if (
      !data[collectionIdStr].priority &&
      !data[collectionIdStr].classNumber
    ) {
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

