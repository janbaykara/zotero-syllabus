/**
 * Utility functions for managing syllabus data on Zotero items
 * Data is stored in the item's 'extra' field as JSON
 */

const SYLLABUS_DATA_KEY = "syllabus";

export interface SyllabusData {
  [collectionId: string]: {
    status?: "essential" | "recommended" | "optional";
    description?: string;
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
): "essential" | "recommended" | "optional" | "" {
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
  status: "essential" | "recommended" | "optional" | "",
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
    // Remove collection entry if both status and description are empty
    if (!data[collectionIdStr].description) {
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
    // Remove collection entry if both status and description are empty
    if (!data[collectionIdStr].status) {
      delete data[collectionIdStr];
    }
  }
  
  setSyllabusData(item, data);
}

