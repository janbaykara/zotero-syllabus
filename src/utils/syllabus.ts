/**
 * Utility functions for managing syllabus data on Zotero items
 * Data is stored in the item's 'extra' field as JSON
 */

const SYLLABUS_DATA_KEY = "syllabus";

export enum SyllabusStatus {
  ESSENTIAL = "essential",
  RECOMMENDED = "recommended",
  OPTIONAL = "optional",
}

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
  const extra = item.getField("extra") || "";
  const lines = extra.split("\n");

  for (const line of lines) {
    if (line.startsWith(`${SYLLABUS_DATA_KEY}:`)) {
      try {
        const jsonStr = line.substring(`${SYLLABUS_DATA_KEY}:`.length).trim();
        return JSON.parse(jsonStr) as SyllabusData;
      } catch (e) {
        ztoolkit.log("Error parsing syllabus data:", e);
        return {};
      }
    }
  }

  return {};
}

/**
 * Set syllabus data in an item's extra field
 */
export function setSyllabusData(
  item: Zotero.Item,
  data: SyllabusData,
): void {
  const extra = item.getField("extra") || "";
  const lines = extra.split("\n");
  const syllabusLine = `${SYLLABUS_DATA_KEY}: ${JSON.stringify(data)}`;

  // Remove existing syllabus line if present
  const filteredLines = lines.filter(
    (line) => !line.startsWith(`${SYLLABUS_DATA_KEY}:`),
  );

  // Add new syllabus line
  filteredLines.push(syllabusLine);

  item.setField("extra", filteredLines.join("\n"));
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
export function setSyllabusStatus(
  item: Zotero.Item,
  collectionId: number | string,
  status: SyllabusStatus | "",
): void {
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

  setSyllabusData(item, data);
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
export function setSyllabusDescription(
  item: Zotero.Item,
  collectionId: number | string,
  description: string,
): void {
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

  setSyllabusData(item, data);
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
export function setSyllabusClassNumber(
  item: Zotero.Item,
  collectionId: number | string,
  classNumber: number | undefined,
): void {
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

  setSyllabusData(item, data);
}

