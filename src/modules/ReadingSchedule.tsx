// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import { SyllabusItemCard } from "./SyllabusPage";
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
import { TabManager } from "../utils/tabManager";
import { getCachedCollectionById } from "../utils/cache";
import { isSameWeek } from "date-fns/fp";
import { formatReadingDate } from "../utils/dates";

setDefaultOptions({
  weekStartsOn: 1,
});

export function ReadingSchedule() {
  const [compactMode] = useZoteroCompactMode();

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

        // Get week start and normalize to ISO string for consistent grouping
        const weekStartDate = startOfWeek(new Date(readingDate));
        const weekStartKey = weekStartDate.toISOString().split("T")[0]; // Use date-only ISO string

        // Get items for this class
        const classItems: Array<{
          item: Zotero.Item;
          assignment: ItemSyllabusAssignment;
        }> = [];

        for (const { zoteroItem, assignments } of items) {
          for (const assignment of assignments) {
            if (assignment.classNumber === classNumber) {
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

        if (sortedItems.length === 0) continue;

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
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
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
    const currentWeekStart = startOfWeek(new Date());

    return Array.from(readingsByWeek.keys())
      .filter((weekKey) => {
        // Only include weeks from the current week onwards
        return new Date(weekKey).getTime() >= currentWeekStart.getTime();
      })
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [readingsByWeek]);

  const handleCollectionClick = (collectionId: number) => {
    try {
      const ZoteroPane = ztoolkit.getGlobal("ZoteroPane");
      const collection = getCachedCollectionById(collectionId);
      if (!collection) return;

      const collectionsView = ZoteroPane.collectionsView;
      if (collectionsView) {
        collectionsView.selectByID(collection.treeViewID);
        // switch to the collection tab
        TabManager.selectLibraryTab();
      }
    } catch (err) {
      ztoolkit.log("Error selecting collection:", err);
    }
  };

  const handleItemClick = (item: Zotero.Item, collectionId: number) => {
    try {
      const ZoteroPane = ztoolkit.getGlobal("ZoteroPane");
      const collection = getCachedCollectionById(collectionId);

      if (collection) {
        const collectionsView = ZoteroPane.collectionsView;
        if (collectionsView) {
          collectionsView.selectByID(collection.treeViewID);
          // Do not try to view deleted items in a collection.
          // They do not appear outside of trash, and selecting a deleted item
          // will re-open trash in collectionTree.
          if (!item.deleted) {
            ZoteroPane.selectItem(item.id);
          }
        }
      } else {
        // Fallback: just select the item (it will show in its collection context)
        ZoteroPane.selectItem(item.id);
      }
    } catch (err) {
      ztoolkit.log("Error selecting item in collection:", err);
    }
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
            Zotero.version.startsWith("8.") ? "pt-4 md:pt-8" : "pt-8",
          )}
        >
          <div className="container-padded bg-background">
            <div className={twMerge("font-semibold text-3xl")}>
              Reading Schedule
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
              (a, b) => new Date(a).getTime() - new Date(b).getTime(),
            );

            // Convert weekStartKey back to Date for formatting
            const weekStartDate = new Date(weekStartKey);

            return (
              <div key={weekStartKey} className="syllabus-class-group">
                <div
                  className={twMerge(
                    "container-padded",
                    "text-3xl sticky top-12 z-10 py-2 bg-background text-tertiary",
                    Zotero.version.startsWith("8.") ? "md:top-16" : "top-12",
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
                              !isThisMonth(new Date(dateTimestamp)),
                            )}
                          </div>

                          <div className="space-y-8">
                            {sortedClassReadings.map((classReading) => {
                              const { singularCapitalized, singular } =
                                SyllabusManager.getNomenclatureFormatted(
                                  classReading.collectionId,
                                );

                              const classStatus =
                                SyllabusManager.getClassStatus(
                                  classReading.collectionId,
                                  classReading.classNumber,
                                );

                              const handleClassStatusToggle = async () => {
                                try {
                                  const newStatus =
                                    classStatus === "done" ? null : "done";
                                  await SyllabusManager.setClassStatus(
                                    classReading.collectionId,
                                    classReading.classNumber,
                                    newStatus,
                                    "page",
                                  );
                                } catch (err) {
                                  ztoolkit.log(
                                    "Error toggling class status:",
                                    err,
                                  );
                                }
                              };

                              return (
                                <div
                                  key={`${classReading.collectionId}-${classReading.classNumber}`}
                                  className={twMerge(
                                    "relative",
                                    classStatus === "done" ? "opacity-40" : "",
                                  )}
                                >
                                  <div className="flex flex-col gap-2 mb-2">
                                    <div>
                                      <input
                                        type="checkbox"
                                        checked={classStatus === "done"}
                                        onChange={handleClassStatusToggle}
                                        className={twMerge(
                                          "absolute right-full mr-1 w-4 h-4 cursor-pointer shrink-0 self-center in-[.print]:hidden accent-accent-green!",
                                          Zotero.version.startsWith("8.")
                                            ? "md:mr-2!"
                                            : "mr-2!",
                                        )}
                                        title={
                                          classStatus === "done"
                                            ? "Mark as not done"
                                            : "Mark as done"
                                        }
                                        aria-label={
                                          classStatus === "done"
                                            ? "Mark as not done"
                                            : "Mark as done"
                                        }
                                      />
                                      <div
                                        className={twMerge(
                                          "text-xl flex-1",
                                          classStatus === "done"
                                            ? "line-through"
                                            : "",
                                          "hover:cursor-pointer hover:bg-quinary active:bg-quarternary rounded-md px-1 -mx-1 inline-block",
                                        )}
                                        onClick={() =>
                                          handleCollectionClick(
                                            classReading.collectionId,
                                          )
                                        }
                                      >
                                        {classReading.classTitle ? (
                                          <>
                                            <span className="font-semibold">
                                              {classReading.classTitle}
                                            </span>
                                            <span className="text-secondary">
                                              ,{" "}
                                            </span>
                                          </>
                                        ) : null}
                                        <span className="text-secondary">
                                          {classReading.classTitle
                                            ? singular
                                            : singularCapitalized}{" "}
                                          {classReading.classNumber}
                                        </span>
                                        <span className="text-secondary">
                                          {" "}
                                          of{" "}
                                        </span>
                                        <span
                                          className={twMerge("font-semibold")}
                                        >
                                          {classReading.collectionName}
                                        </span>
                                      </div>
                                    </div>
                                    {classReading.classDescription && (
                                      <div className="text-base mb-1">
                                        {classReading.classDescription}
                                      </div>
                                    )}
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

                                        const priority =
                                          assignment.priority || "";
                                        const uniqueKey = `${item.id}-assignment-${assignment.id}`;

                                        return (
                                          <SyllabusItemCard
                                            key={uniqueKey}
                                            item={item}
                                            collectionId={
                                              classReading.collectionId
                                            }
                                            classNumber={
                                              classReading.classNumber
                                            }
                                            assignment={assignment}
                                            slim={
                                              compactMode ||
                                              !priority ||
                                              priority === "optional"
                                            }
                                            compactMode={compactMode}
                                            isLocked={true}
                                            onClick={(item) =>
                                              handleItemClick(
                                                item,
                                                classReading.collectionId,
                                              )
                                            }
                                            readerMode
                                            className="cursor-pointer"
                                          />
                                        );
                                      },
                                    )}
                                  </div>
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
          })}
        </div>
      </div>
    </div>
  );
}

interface ClassReading {
  collectionId: number;
  collectionName: string;
  classNumber: number;
  classTitle: string;
  classDescription: string;
  readingDate: string; // ISO date string
  items: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>;
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
