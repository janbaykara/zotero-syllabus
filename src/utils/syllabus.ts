/**
 * Utility functions for managing syllabus data on Zotero items
 * Data is stored in the item's 'extra' field as JSON using ExtraFieldTool
 */

import { ExtraFieldTool } from "zotero-plugin-toolkit";

const SYLLABUS_DATA_KEY = "syllabus";

export const SYLLABUS_CLASS_NUMBER_FIELD = "syllabus-class-number";

// Create an ExtraFieldTool instance for safe extra field operations
const extraFieldTool = new ExtraFieldTool();

export enum SyllabusStatus {
  ESSENTIAL = "essential",
  RECOMMENDED = "recommended",
  OPTIONAL = "optional",
}

/**
 * Color definitions for syllabus statuses
 */
export const STATUS_COLORS: Record<SyllabusStatus, string> = {
  [SyllabusStatus.ESSENTIAL]: "#8B5CF6", // purple
  [SyllabusStatus.RECOMMENDED]: "#3B82F6", // blue
  [SyllabusStatus.OPTIONAL]: "#CCC", // grey
};

/**
 * Human-readable labels for syllabus statuses
 */
export const STATUS_LABELS: Record<SyllabusStatus, string> = {
  [SyllabusStatus.ESSENTIAL]: "Essential",
  [SyllabusStatus.RECOMMENDED]: "Recommended",
  [SyllabusStatus.OPTIONAL]: "Optional",
};

export interface SyllabusData {
  [collectionId: string]: {
    status?: SyllabusStatus;
    description?: string;
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
 * Get syllabus status for a specific collection
 */
export function getSyllabusStatus(
  item: Zotero.Item,
  collectionId: number | string,
): SyllabusStatus | "" {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);
  return data[collectionIdStr]?.status || "";
}

/**
 * Set syllabus status for a specific collection
 */
export async function setSyllabusStatus(
  item: Zotero.Item,
  collectionId: number | string,
  status: SyllabusStatus | "",
): Promise<void> {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);

  if (!data[collectionIdStr]) {
    data[collectionIdStr] = {};
  }

  if (status) {
    data[collectionIdStr].status = status;
  } else {
    delete data[collectionIdStr].status;
    // Remove collection entry if status, description, and classNumber are all empty
    if (
      !data[collectionIdStr].description &&
      !data[collectionIdStr].classNumber
    ) {
      delete data[collectionIdStr];
    }
  }

  await setSyllabusData(item, data);
}

/**
 * Get syllabus description for a specific collection
 */
export function getSyllabusDescription(
  item: Zotero.Item,
  collectionId: number | string,
): string {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);
  return data[collectionIdStr]?.description || "";
}

/**
 * Set syllabus description for a specific collection
 */
export async function setSyllabusDescription(
  item: Zotero.Item,
  collectionId: number | string,
  description: string,
): Promise<void> {
  const data = getSyllabusData(item);
  const collectionIdStr = String(collectionId);

  if (!data[collectionIdStr]) {
    data[collectionIdStr] = {};
  }

  if (description && description.trim()) {
    data[collectionIdStr].description = description.trim();
  } else {
    delete data[collectionIdStr].description;
    // Remove collection entry if status, description, and classNumber are all empty
    if (
      !data[collectionIdStr].status &&
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
    // Remove collection entry if status, description, and classNumber are all empty
    if (
      !data[collectionIdStr].status &&
      !data[collectionIdStr].description
    ) {
      delete data[collectionIdStr];
    }
  }

  await setSyllabusData(item, data);
}

