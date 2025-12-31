// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import { SyllabusItemCard } from "./SyllabusPage";
import { endOfWeek, startOfWeek } from "date-fns";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { getAllCollections } from "../utils/zotero";

interface ClassReading {
  collectionId: number;
  collectionName: string;
  classNumber: number;
  classTitle: string;
  readingDate: string; // ISO date string
  items: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>;
}

function formatReadingDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatWeekRange(weekStart: Date): string {
  const start = startOfWeek(weekStart);
  const end = endOfWeek(weekStart);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function ReadingSchedule() {
  const [compactMode] = useZoteroCompactMode();

  // Get all readings across all collections
  const readingsByWeek = useMemo(() => {
    const result = new Map<
      string, // ISO date string of week start
      Map<string, ClassReading[]>
    >(); // weekStart ISO string -> ISO date string -> ClassReading[]

    // Get all collections
    const allCollections = getAllCollections();
    const allData = SyllabusManager.getSettingsCollectionDictionaryData();

    for (const collection of allCollections) {
      const collectionId = collection.id;
      const collectionIdStr = String(collectionId);
      const collectionData = allData[collectionIdStr];

      // Skip if no syllabus metadata
      if (!collectionData || !collectionData.classes) {
        continue;
      }

      const collectionName = collection.name;
      const items = collection.getChildItems();

      // Get all classes with reading dates
      for (const [classNumStr, classMetadata] of Object.entries(
        collectionData.classes,
      )) {
        const classNumber = parseInt(classNumStr, 10);
        if (isNaN(classNumber)) continue;

        const readingDate = classMetadata.readingDate;
        if (!readingDate) continue;

        // Get week start and normalize to ISO string for consistent grouping
        const weekStartDate = startOfWeek(new Date(readingDate));
        const weekStartKey = weekStartDate.toISOString().split('T')[0]; // Use date-only ISO string

        // Get items for this class
        const classItems: Array<{
          item: Zotero.Item;
          assignment: ItemSyllabusAssignment;
        }> = [];

        for (const item of items) {
          if (!item.isRegularItem()) continue;

          const assignments = SyllabusManager.getAllClassAssignments(
            item,
            collectionId,
          );

          for (const assignment of assignments) {
            if (assignment.classNumber === classNumber) {
              classItems.push({ item, assignment });
            }
          }
        }

        // Sort items within class
        const sortedItems = SyllabusManager.sortClassItems(
          classItems,
          collectionId,
          classNumber,
        );

        if (sortedItems.length === 0) continue;

        const classTitle = SyllabusManager.getClassTitle(
          collectionId,
          classNumber,
        );

        const classReading: ClassReading = {
          collectionId,
          collectionName,
          classNumber,
          classTitle: classTitle || "",
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
      const sortedDates = Array.from(weekData.keys()).sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
      );
      const sortedWeekData = new Map<string, ClassReading[]>();
      for (const date of sortedDates) {
        sortedWeekData.set(date, weekData.get(date)!);
      }
      result.set(weekStartKey, sortedWeekData);
    }

    return result;
  }, []);

  // Convert to sorted array for rendering, filtering out past weeks
  const sortedWeeks = useMemo(() => {
    const currentWeekStart = startOfWeek(new Date());

    return Array.from(readingsByWeek.keys())
      .filter((weekKey) => {
        // Only include weeks from the current week onwards
        return new Date(weekKey).getTime() >= currentWeekStart.getTime();
      })
      .sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
      );
  }, [readingsByWeek]);

  const handleCollectionClick = (_collectionId: number) => {
    // const win = Zotero.getMainWindow();
    // const pane = win.ZoteroPane;
    // if (pane) {
    //   pane.selec
    // }
    // TODO: implement syllabus tab for collectionId
  };

  if (sortedWeeks.length === 0) {
    return (
      <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background">
      <div className="pb-12">
        <div className="sticky top-0 z-20 bg-background py-1 md:pt-8">
          <div className="container-padded bg-background">
            <div
              className={twMerge("font-semibold text-3xl")}
            >
              Reading Schedule
            </div>
          </div>
        </div>

        <p className="container-padded text-secondary text-lg">
          Add reading dates to classes to see them here.
        </p>

        <div
          className={twMerge(
            "flex flex-col",
            compactMode ? "gap-8 mt-4" : "gap-12 mt-6",
          )}
        >
          {sortedWeeks.map((weekStartKey) => {
            const weekData = readingsByWeek.get(weekStartKey)!;
            const sortedDates = Array.from(weekData.keys()).sort((a, b) =>
              new Date(a).getTime() - new Date(b).getTime()
            );

            // Convert weekStartKey back to Date for formatting
            const weekStartDate = new Date(weekStartKey);

            return (
              <div key={weekStartKey} className="syllabus-class-group">
                <div className="container-padded">
                  <div
                    className={twMerge(
                      "font-semibold text-2xl sticky top-16 py-3 z-10 bg-background",
                    )}
                  >
                    Week of {formatWeekRange(weekStartDate)}
                  </div>

                  {sortedDates.map((dateTimestamp) => {
                    const classReadings = weekData.get(dateTimestamp)!;
                    // Get ISO date string from first class reading (all have same date)
                    const isoDate = classReadings[0]?.readingDate || "";

                    // Sort classes by collection name, then by class number
                    const sortedClassReadings = [...classReadings].sort((a, b) => {
                      // First sort by collection name
                      const collectionCompare = a.collectionName.localeCompare(b.collectionName);
                      if (collectionCompare !== 0) return collectionCompare;
                      // Then sort by class number
                      return a.classNumber - b.classNumber;
                    });

                    return (
                      <div key={dateTimestamp} className="mb-6">
                        <div
                          className={twMerge(
                            "mb-3 text-secondary text-xl",
                          )}
                        >
                          {formatReadingDate(isoDate)}
                        </div>

                        {sortedClassReadings.map((classReading) => {
                          const { singularCapitalized } =
                            SyllabusManager.getNomenclatureFormatted(
                              classReading.collectionId,
                            );

                          return (
                            <div
                              key={`${classReading.collectionId}-${classReading.classNumber}`}
                              className="mb-4"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  onClick={() =>
                                    handleCollectionClick(
                                      classReading.collectionId,
                                    )
                                  }
                                  className="text-lg"
                                >
                                  <span className='font-semibold'>{classReading.collectionName}</span>, <span className='text-secondary'>{singularCapitalized} {classReading.classNumber}</span>{classReading.classTitle && <>
                                    <span>:&nbsp;</span>
                                    <span className='font-semibold'>
                                      {classReading.classTitle}
                                    </span>
                                  </>}
                                </div>
                              </div>
                              <div
                                className={twMerge(
                                  "space-y-2",
                                  compactMode ? "space-y-2" : "space-y-4",
                                )}
                              >
                                {classReading.items.map(
                                  ({ item, assignment }) => {
                                    if (!assignment.id) return null;

                                    const priority = assignment.priority || "";
                                    const uniqueKey = `${item.id}-assignment-${assignment.id}`;

                                    return (
                                      <SyllabusItemCard
                                        key={uniqueKey}
                                        item={item}
                                        collectionId={classReading.collectionId}
                                        classNumber={classReading.classNumber}
                                        assignment={assignment}
                                        slim={
                                          compactMode ||
                                          !priority ||
                                          priority ===
                                          SyllabusManager.priorityKeys.OPTIONAL
                                        }
                                        compactMode={compactMode}
                                        isLocked={true}
                                      />
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

