// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { Settings } from "lucide-preact";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import {
  ClassReadingBlock,
  selectCollectionInLibrary,
  selectItemInCollection,
  type ClassReading,
} from "./ClassReadingBlock";
import {
  addWeeks,
  differenceInDays,
  differenceInWeeks,
  isThisMonth,
  isThisWeek,
  setDefaultOptions,
  startOfWeek,
} from "date-fns";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { useSyllabi } from "./react-zotero-sync/useSyllabi";
import { getPref } from "../utils/prefs";
import { isSameWeek } from "date-fns/fp";
import {
  formatReadingDate,
  parseReadingDate,
  toLocalDateKey,
} from "../utils/dates";
import { isZotero8OrLater } from "../utils/zotero";
import { ReadingScheduleSettingsPage } from "./ReadingScheduleSettingsPage";

setDefaultOptions({
  weekStartsOn: 1,
});

export function ReadingSchedule() {
  const [compactMode] = useZoteroCompactMode();
  const [showSettings, setShowSettings] = useState(false);

  // Get all syllabi data (collections with metadata and items)
  const syllabi = useSyllabi();

  // Compute readings grouped by week and date
  const readingsByWeek = useMemo(() => {
    const result = new Map<
      string, // ISO date string of week start
      Map<string, ClassReading[]>
    >(); // weekStart ISO string -> ISO date string -> ClassReading[]

    for (const syllabus of syllabi) {
      const { collection, metadata, items } = syllabus;
      const collectionId = collection.id;

      // Skip if no classes metadata
      if (!metadata.classes) {
        continue;
      }

      // Get all classes with reading dates
      for (const [classNumStr, classMetadata] of Object.entries(
        metadata.classes,
      )) {
        if (!classMetadata?.readingDate) continue;
        const classNumber = parseInt(classNumStr, 10);
        if (isNaN(classNumber)) continue;

        const readingDate = classMetadata.readingDate;
        if (!readingDate) continue;

        // Group by local week start. Do not use toISOString() here: local
        // Monday midnight is the previous UTC date east of UTC, which then
        // fails the "current week onwards" filter.
        const weekStartDate = startOfWeek(parseReadingDate(readingDate));
        const weekStartKey = toLocalDateKey(weekStartDate);

        // Get items for this class
        const classItems: Array<{
          item: Zotero.Item;
          assignment: ItemSyllabusAssignment;
        }> = [];

        for (const { zoteroItem, assignments } of items) {
          for (const assignment of assignments) {
            if (
              (SyllabusManager.getClassNumber(
                collectionId,
                assignment.classId,
              ) ?? assignment.classNumber) === classNumber
            ) {
              classItems.push({ item: zoteroItem, assignment });
            }
          }
        }

        // Sort items within class
        const sortedItems = SyllabusManager.sortClassItems(
          classItems,
          collectionId,
          classNumber,
        );

        const classTitle = SyllabusManager.getClassTitle(
          collectionId,
          classNumber,
        );

        const classDescription = SyllabusManager.getClassDescription(
          collectionId,
          classNumber,
        );

        const classReading: ClassReading = {
          collectionId,
          collectionName: collection.name,
          classNumber,
          classTitle: classTitle || "",
          classDescription: classDescription || "",
          readingDate,
          items: sortedItems,
        };

        // Add to result
        if (!result.has(weekStartKey)) {
          result.set(weekStartKey, new Map());
        }
        const weekData = result.get(weekStartKey)!;

        // Use ISO date string as key
        if (!weekData.has(readingDate)) {
          weekData.set(readingDate, []);
        }
        weekData.get(readingDate)!.push(classReading);
      }
    }

    // Sort dates within each week
    for (const [weekStartKey, weekData] of result) {
      const sortedDates = Array.from(weekData.keys()).sort(
        (a, b) => parseReadingDate(a).getTime() - parseReadingDate(b).getTime(),
      );
      const sortedWeekData = new Map<string, ClassReading[]>();
      for (const date of sortedDates) {
        sortedWeekData.set(date, weekData.get(date)!);
      }
      result.set(weekStartKey, sortedWeekData);
    }

    return result;
  }, [syllabi]);

  // Convert to sorted array for rendering, filtering out past weeks
  const sortedWeeks = useMemo(() => {
    const currentWeekStartKey = toLocalDateKey(startOfWeek(new Date()));

    return Array.from(readingsByWeek.keys())
      .filter((weekKey) => weekKey >= currentWeekStartKey)
      .sort();
  }, [readingsByWeek]);

  const handleCollectionClick = (collectionId: number) => {
    selectCollectionInLibrary(collectionId);
  };

  const handleItemClick = (item: Zotero.Item, collectionId: number) => {
    selectItemInCollection(item, collectionId);
  };

  if (showSettings) {
    return (
      <ReadingScheduleSettingsPage onBack={() => setShowSettings(false)} />
    );
  }

  const settingsButton = (
    <div
      className="grow-0 shrink-0 flex items-center cursor-pointer"
      title="Edit reading schedule settings"
      aria-label="Edit reading schedule settings"
      data-tour="reading-schedule-settings-button"
      onClick={() => setShowSettings(true)}
    >
      <Settings
        size={20}
        className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
      />
    </div>
  );

  if (sortedWeeks.length === 0) {
    return (
      <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full">
        <div
          className={twMerge(
            "sticky top-0 z-20 bg-background py-1",
            isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
          )}
        >
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-2 justify-between">
              <div className={twMerge("font-semibold text-3xl")}>
                Reading Schedule
              </div>
              {settingsButton}
            </div>
          </div>
        </div>
        <div className="container-padded py-12">
          <div className="text-center text-secondary">
            <div
              className={twMerge(
                "font-semibold mb-2",
                compactMode ? "text-xl" : "text-2xl",
              )}
            >
              No readings scheduled
            </div>
            <p className={twMerge(compactMode ? "text-base" : "text-lg")}>
              Add reading dates to classes to see them here.
            </p>
            {getPref("debugMode") && (
              <div className="text-secondary text-sm text-left! w-full!">
                <h3 className="text-2xl mt-4">Debug information</h3>
                <pre>
                  {JSON.stringify(
                    {
                      syllabi,
                      sortedWeeks,
                      readingsByWeekSize: readingsByWeek.size,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background">
      <div className="pb-12">
        <div
          className={twMerge(
            "sticky top-0 z-20 bg-background py-1",
            isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
          )}
        >
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-2 justify-between">
              <div className={twMerge("font-semibold text-3xl")}>
                Reading Schedule
              </div>
              {settingsButton}
            </div>
          </div>
        </div>

        <p className="container-padded text-secondary text-lg">
          Add reading dates to classes to see them here.
        </p>

        <div className={twMerge("flex flex-col gap-8 mt-8")}>
          {sortedWeeks.map((weekStartKey) => {
            const weekData = readingsByWeek.get(weekStartKey)!;
            const sortedDates = Array.from(weekData.keys()).sort(
              (a, b) =>
                parseReadingDate(a).getTime() - parseReadingDate(b).getTime(),
            );

            const weekStartDate = parseReadingDate(weekStartKey);

            return (
              <div key={weekStartKey} className="syllabus-class-group">
                <div
                  className={twMerge(
                    "container-padded",
                    "text-3xl sticky top-12 z-10 py-2 bg-background text-tertiary",
                    isZotero8OrLater() ? "md:top-16" : "top-12",
                  )}
                >
                  <WeekHeader weekStartDate={weekStartDate} />
                </div>

                <div className="container-padded">
                  <div className="space-y-12 my-6">
                    {sortedDates.map((dateTimestamp) => {
                      const classReadings = weekData.get(dateTimestamp)!;

                      // Sort classes by collection name, then by class number
                      const sortedClassReadings = [...classReadings].sort(
                        (a, b) => {
                          // First sort by collection name
                          const collectionCompare =
                            a.collectionName.localeCompare(b.collectionName);
                          if (collectionCompare !== 0) return collectionCompare;
                          // Then sort by class number
                          return a.classNumber - b.classNumber;
                        },
                      );

                      return (
                        <div key={dateTimestamp}>
                          <div
                            className={twMerge("mb-3 text-secondary text-2xl")}
                          >
                            {formatReadingDate(
                              dateTimestamp,
                              !isThisMonth(parseReadingDate(dateTimestamp)),
                            )}
                          </div>

                          <div className="space-y-8">
                            {sortedClassReadings.map((classReading) => (
                              <ClassReadingBlock
                                key={`${classReading.collectionId}-${classReading.classNumber}`}
                                classReading={classReading}
                                compactMode={compactMode}
                                onCollectionClick={() =>
                                  handleCollectionClick(
                                    classReading.collectionId,
                                  )
                                }
                                onItemClick={(item) =>
                                  handleItemClick(
                                    item,
                                    classReading.collectionId,
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekHeader({ weekStartDate }: { weekStartDate: Date }) {
  const start = startOfWeek(weekStartDate);
  let str = "";
  ztoolkit.log("WeekHeader: start:", differenceInDays(start, new Date()));
  if (isThisWeek(start)) {
    str = "This week";
  } else if (isSameWeek(start, addWeeks(new Date(), 1))) {
    str = "Next week";
  } else {
    const long = new Intl.RelativeTimeFormat("en-us", { style: "long" });
    const diff = differenceInWeeks(startOfWeek(start), startOfWeek(new Date()));
    str = long.format(diff, "week");
  }

  return <span className="first-letter:capitalize">{str}</span>;
}
