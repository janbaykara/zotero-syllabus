// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { twMerge } from "tailwind-merge";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import { SyllabusItemCard } from "./SyllabusPage";
import { formatDate, setDefaultOptions, startOfWeek } from "date-fns";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { getAllCollections } from "../utils/zotero";
import { getPref } from "../utils/prefs";

setDefaultOptions({
  weekStartsOn: 1,
});

interface ClassReading {
  collectionId: number;
  collectionName: string;
  classNumber: number;
  classTitle: string;
  classDescription: string;
  readingDate: string; // ISO date string
  items: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>;
}

function formatReadingDate(isoDate: string): string {
  const date = new Date(isoDate);
  return formatDate(date, "iiii do");
}

function formatWeekRange(weekStart: Date): string {
  const start = startOfWeek(weekStart);
  // Format as "6th Feb" without i18n
  const day = start.getDate();
  const daySuffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day}${daySuffix} ${monthNames[start.getMonth()]}`;
}

// Store to track changes to syllabus data (class metadata, assignments, etc.)
function createReadingScheduleStore() {
  let version = 0;

  function getSnapshot() {
    // Return a version number that changes when data updates
    return version;
  }

  function subscribe(onStoreChange: () => void) {
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusManager.settingsKeys.COLLECTION_METADATA,
    );

    const observer = {
      notify(
        event: string,
        type: string,
        ids: (number | string)[],
        extraData: any,
      ) {
        let shouldUpdate = false;

        // Listen to setting events for collection metadata (reading dates, class titles, etc.)
        if (type === "setting" && extraData?.pref === prefKey) {
          shouldUpdate = true;
        }

        // Listen to item modify/delete events (assignments changed)
        if (type === "item" && (event === "modify" || event === "delete")) {
          shouldUpdate = true;
        }

        // Listen to collection-item events (items added/removed from collections)
        if (type === "collection-item") {
          shouldUpdate = true;
        }

        // Listen to collection modify/refresh events
        if (
          type === "collection" &&
          (event === "modify" || event === "refresh")
        ) {
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          version++;
          onStoreChange();
        }
      },
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "setting",
      "item",
      "collection-item",
      "collection",
    ]);

    // Also listen to the custom event emitter for collection metadata changes
    const unsubscribeEmitter = SyllabusManager.onCollectionMetadataChange(
      () => {
        version++;
        onStoreChange();
      },
    );

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
      unsubscribeEmitter();
    };
  }

  return { getSnapshot, subscribe };
}

const readingScheduleStore = createReadingScheduleStore();

export function ReadingSchedule() {
  const [compactMode] = useZoteroCompactMode();

  // Subscribe to changes in syllabus data to trigger re-renders
  const dataVersion = useSyncExternalStore(
    readingScheduleStore.subscribe,
    readingScheduleStore.getSnapshot,
  );

  const allCollections = useMemo(() => getAllCollections(), [dataVersion]);

  // Get all readings across all collections
  // Recompute when dataVersion changes (when class metadata or assignments change)
  const readingsByWeek = useMemo(() => {
    const result = new Map<
      string, // ISO date string of week start
      Map<string, ClassReading[]>
    >(); // weekStart ISO string -> ISO date string -> ClassReading[]

    // Get all collections
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
        const weekStartKey = weekStartDate.toISOString().split("T")[0]; // Use date-only ISO string

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

        const classDescription = SyllabusManager.getClassDescription(
          collectionId,
          classNumber,
        );

        const classReading: ClassReading = {
          collectionId,
          collectionName,
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
  }, [dataVersion, allCollections]);

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
      const collection = Zotero.Collections.get(collectionId);
      if (!collection) return;

      // Try to select the collection via the tree view
      const win = Zotero.getMainWindow();
      const collectionTree = win.document.getElementById(
        "zotero-collections-tree",
      );
      if (collectionTree) {
        const treeView = (collectionTree as any).view;
        if (treeView && treeView.selection) {
          const row = treeView.getRowIndexByRef(collection);
          if (row !== -1) {
            treeView.selection.select(row);
          }
        }
      }
    } catch (err) {
      ztoolkit.log("Error selecting collection:", err);
    }
  };

  const handleItemClick = (item: Zotero.Item, collectionId: number) => {
    try {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      const collection = Zotero.Collections.get(collectionId);

      // First, try to select the collection via the tree view
      if (collection) {
        const win = Zotero.getMainWindow();
        const collectionTree = win.document.getElementById(
          "zotero-collections-tree",
        );
        if (collectionTree) {
          const treeView = (collectionTree as any).view;
          if (treeView && treeView.selection) {
            const row = treeView.getRowIndexByRef(collection);
            if (row !== -1) {
              treeView.selection.select(row);
              // Wait a bit for the collection to be selected before selecting the item
              Zotero.Promise.delay(100).then(() => {
                pane.selectItem(item.id);
              });
              return;
            }
          }
        }
      }

      // Fallback: just select the item (it will show in its collection context)
      pane.selectItem(item.id);
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
                      sortedWeeks,
                      allCollections,
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
        <div className="sticky top-0 z-20 bg-background py-1 md:pt-8">
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
                <div className="container-padded">
                  <div
                    className={twMerge(
                      "text-2xl sticky top-16 z-10 py-2 bg-background text-tertiary",
                    )}
                  >
                    Week starting{" "}
                    <span className="text-secondary">
                      {formatWeekRange(weekStartDate)}
                    </span>
                  </div>

                  <div className="space-y-8 my-6">
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
                            {formatReadingDate(dateTimestamp)}
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
                                <div className="flex flex-col gap-2 mb-2">
                                  <div className="flex flex-row items-start justify-between gap-2">
                                    <div
                                      onClick={() =>
                                        handleCollectionClick(
                                          classReading.collectionId,
                                        )
                                      }
                                      className="text-xl flex-1"
                                    >
                                      <span className="font-semibold">
                                        {classReading.collectionName}
                                      </span>
                                      ,{" "}
                                      <span className="text-secondary">
                                        {singularCapitalized}{" "}
                                        {classReading.classNumber}
                                      </span>
                                      {classReading.classTitle && (
                                        <>
                                          <span>:&nbsp;</span>
                                          <span className="font-semibold">
                                            {classReading.classTitle}
                                          </span>
                                        </>
                                      )}
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
                                          classNumber={classReading.classNumber}
                                          assignment={assignment}
                                          slim={
                                            compactMode ||
                                            !priority ||
                                            priority ===
                                            SyllabusManager.priorityKeys
                                              .OPTIONAL
                                          }
                                          compactMode={compactMode}
                                          isLocked={true}
                                          onClick={(item) =>
                                            handleItemClick(
                                              item,
                                              classReading.collectionId,
                                            )
                                          }
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
