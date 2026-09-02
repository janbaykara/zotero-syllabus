import { startOfWeek } from "date-fns";
import { SyllabusManager } from "./syllabus";
import type { ClassReading } from "./ClassReadingBlock";
import type { SyllabusData } from "./react-zotero-sync/useSyllabi";
import { parseReadingDate, toLocalDateKey } from "../utils/dates";
import { compareLocale } from "../utils/locale";

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

export function syllabiSpanMultipleLibraries(syllabi: SyllabusData[]): boolean {
  const libraryIDs = new Set(
    syllabi.map((syllabus) => syllabus.collection.libraryID),
  );
  return libraryIDs.size > 1;
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
        libraryID: collection.libraryID,
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
    const collectionCompare = compareLocale(a.collectionName, b.collectionName);
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

export const UPCOMING_DEADLINE_WEEK_DAYS = 7;
export const UPCOMING_DEADLINE_FALLBACK_DAYS = 30;

function localDayDelta(isoDate: string, now: Date): number | null {
  const date = parseReadingDate(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const today = parseReadingDate(toLocalDateKey(now));
  return Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** Soonest class readings: everything due in the next week, else the next date within a month. */
export function pickUpcomingClassReadings(
  readings: ClassReading[],
  now: Date = new Date(),
): ClassReading[] {
  const dated: Array<{ reading: ClassReading; days: number }> = [];
  for (const reading of readings) {
    if (!reading.readingDate) {
      continue;
    }
    const days = localDayDelta(reading.readingDate, now);
    if (days == null) {
      continue;
    }
    dated.push({ reading, days });
  }
  const inWeek = dated.filter(
    (entry) => entry.days >= 0 && entry.days <= UPCOMING_DEADLINE_WEEK_DAYS,
  );
  if (inWeek.length) {
    return sortUpcomingClassReadings(inWeek.map((entry) => entry.reading));
  }
  const later = dated
    .filter(
      (entry) =>
        entry.days > UPCOMING_DEADLINE_WEEK_DAYS &&
        entry.days <= UPCOMING_DEADLINE_FALLBACK_DAYS,
    )
    .sort(
      (a, b) =>
        a.days - b.days ||
        compareLocale(a.reading.collectionName, b.reading.collectionName) ||
        a.reading.classNumber - b.reading.classNumber,
    );
  if (!later.length) {
    return [];
  }
  const nextDays = later[0].days;
  return sortUpcomingClassReadings(
    later
      .filter((entry) => entry.days === nextDays)
      .map((entry) => entry.reading),
  );
}

function sortUpcomingClassReadings(readings: ClassReading[]): ClassReading[] {
  return [...readings].sort((a, b) => {
    const date = (a.readingDate || "").localeCompare(b.readingDate || "");
    if (date) {
      return date;
    }
    const collection = compareLocale(a.collectionName, b.collectionName);
    if (collection) {
      return collection;
    }
    return a.classNumber - b.classNumber;
  });
}

export type UpcomingCourseGroup = {
  collectionId: number;
  collectionName: string;
  libraryID: number;
  classes: ClassReading[];
};

export function groupUpcomingReadingsByCourse(
  readings: ClassReading[],
): UpcomingCourseGroup[] {
  const groups: UpcomingCourseGroup[] = [];
  const index = new Map<number, UpcomingCourseGroup>();
  for (const reading of sortUpcomingClassReadings(readings)) {
    let group = index.get(reading.collectionId);
    if (!group) {
      group = {
        collectionId: reading.collectionId,
        collectionName: reading.collectionName,
        libraryID: reading.libraryID,
        classes: [],
      };
      index.set(reading.collectionId, group);
      groups.push(group);
    }
    group.classes.push(reading);
  }
  return groups;
}
