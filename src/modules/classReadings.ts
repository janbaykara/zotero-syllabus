import { startOfWeek } from "date-fns";
import { SyllabusManager } from "./syllabus";
import type { ClassReading } from "./ClassReadingBlock";
import type { SyllabusData } from "./react-zotero-sync/useSyllabi";
import { parseReadingDate, toLocalDateKey } from "../utils/dates";

/** Restrict a syllabus list to one library, or keep all when `libraryID` is omitted. */
export function filterSyllabiByLibrary(
  syllabi: SyllabusData[],
  libraryID: number | undefined,
): SyllabusData[] {
  if (libraryID == null) {
    return syllabi;
  }
  return syllabi.filter(
    (syllabus) => syllabus.collection.libraryID === libraryID,
  );
}

export function buildClassReadings(syllabi: SyllabusData[]): ClassReading[] {
  const readings: ClassReading[] = [];

  for (const syllabus of syllabi) {
    const { collection, metadata, items } = syllabus;
    const collectionId = collection.id;
    if (!metadata.classes) {
      continue;
    }

    for (const [classNumStr, classMetadata] of Object.entries(
      metadata.classes,
    )) {
      if (!classMetadata?.readingDate) continue;
      const classNumber = parseInt(classNumStr, 10);
      if (isNaN(classNumber)) continue;

      const readingDate = classMetadata.readingDate;
      const date = parseReadingDate(readingDate);
      if (Number.isNaN(date.getTime())) continue;

      const classItems: ClassReading["items"] = [];
      for (const { zoteroItem, assignments } of items) {
        for (const assignment of assignments) {
          if (
            (SyllabusManager.getClassNumber(collectionId, assignment.classId) ??
              assignment.classNumber) === classNumber
          ) {
            classItems.push({ item: zoteroItem, assignment });
          }
        }
      }

      readings.push({
        collectionId,
        collectionName: collection.name,
        classNumber,
        classTitle:
          SyllabusManager.getClassTitle(collectionId, classNumber) || "",
        classDescription:
          SyllabusManager.getClassDescription(collectionId, classNumber) || "",
        readingDate,
        items: SyllabusManager.sortClassItems(
          classItems,
          collectionId,
          classNumber,
        ),
      });
    }
  }

  return readings;
}

export function sortClassReadings(readings: ClassReading[]): ClassReading[] {
  return [...readings].sort((a, b) => {
    const collectionCompare = a.collectionName.localeCompare(b.collectionName);
    if (collectionCompare !== 0) return collectionCompare;
    return a.classNumber - b.classNumber;
  });
}

/** Group syllabus class readings by local YYYY-MM-DD date key. */
export function collectClassReadingsByDate(
  syllabi: SyllabusData[],
): Map<string, ClassReading[]> {
  const result = new Map<string, ClassReading[]>();

  for (const reading of buildClassReadings(syllabi)) {
    const dateKey = toLocalDateKey(parseReadingDate(reading.readingDate!));
    if (!result.has(dateKey)) {
      result.set(dateKey, []);
    }
    result.get(dateKey)!.push(reading);
  }

  for (const [dateKey, dateReadings] of result) {
    result.set(dateKey, sortClassReadings(dateReadings));
  }

  return result;
}

/** Group syllabus class readings by local week start, then by reading date. */
export function collectClassReadingsByWeek(
  syllabi: SyllabusData[],
): Map<string, Map<string, ClassReading[]>> {
  const result = new Map<string, Map<string, ClassReading[]>>();

  for (const reading of buildClassReadings(syllabi)) {
    const weekStartKey = toLocalDateKey(
      startOfWeek(parseReadingDate(reading.readingDate!), { weekStartsOn: 1 }),
    );
    if (!result.has(weekStartKey)) {
      result.set(weekStartKey, new Map());
    }
    const weekData = result.get(weekStartKey)!;
    const readingDate = reading.readingDate!;
    if (!weekData.has(readingDate)) {
      weekData.set(readingDate, []);
    }
    weekData.get(readingDate)!.push(reading);
  }

  for (const [weekStartKey, weekData] of result) {
    const sortedDates = Array.from(weekData.keys()).sort(
      (a, b) => parseReadingDate(a).getTime() - parseReadingDate(b).getTime(),
    );
    const sortedWeekData = new Map<string, ClassReading[]>();
    for (const date of sortedDates) {
      sortedWeekData.set(date, sortClassReadings(weekData.get(date)!));
    }
    result.set(weekStartKey, sortedWeekData);
  }

  return result;
}
