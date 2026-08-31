// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { Settings } from "lucide-preact";
import {
  ClassReadingBlock,
  selectCollectionInLibrary,
  selectItemInCollection,
} from "./ClassReadingBlock";
import {
  collectClassReadingsByWeek,
  filterSyllabiByLibrary,
  syllabiSpanMultipleLibraries,
} from "./classReadings";
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
import { hasMultipleNonFeedLibraries, isZotero8OrLater } from "../utils/zotero";
import { getString, getUiDir } from "../utils/locale";
import { ReadingScheduleSettingsPage } from "./ReadingScheduleSettingsPage";

setDefaultOptions({
  weekStartsOn: 1,
});

export function ReadingSchedule({ libraryID }: { libraryID?: number }) {
  const [compactMode] = useZoteroCompactMode();
  const [showSettings, setShowSettings] = useState(false);

  const allSyllabi = useSyllabi();
  const syllabi = useMemo(
    () => filterSyllabiByLibrary(allSyllabi, libraryID),
    [allSyllabi, libraryID],
  );

  const readingsByWeek = useMemo(
    () => collectClassReadingsByWeek(syllabi),
    [syllabi],
  );

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

  const showLibrarySource =
    libraryID == null &&
    hasMultipleNonFeedLibraries() &&
    syllabiSpanMultipleLibraries(syllabi);

  if (showSettings) {
    return (
      <ReadingScheduleSettingsPage onBack={() => setShowSettings(false)} />
    );
  }

  const settingsButton = (
    <div
      className="grow-0 shrink-0 flex items-center cursor-pointer"
      title={getString("schedule-edit-settings")}
      aria-label={getString("schedule-edit-settings")}
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
      <div
        className="syllabus-page overflow-y-auto overflow-x-hidden h-full"
        dir={getUiDir()}
      >
        <div
          className={twMerge(
            "sticky top-0 z-20 bg-background py-1",
            isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
          )}
        >
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-2 justify-between">
              <div className={twMerge("font-semibold text-3xl")}>
                {getString("view-tab-reading-schedule")}
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
              {getString("schedule-empty-title")}
            </div>
            <p className={twMerge(compactMode ? "text-base" : "text-lg")}>
              {getString("schedule-empty-desc")}
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
    <div
      className="syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background"
      dir={getUiDir()}
    >
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
                {getString("view-tab-reading-schedule")}
              </div>
              {settingsButton}
            </div>
          </div>
        </div>

        <p className="container-padded text-secondary text-lg">
          {getString("schedule-empty-desc")}
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
                            {classReadings.map((classReading) => (
                              <ClassReadingBlock
                                key={`${classReading.collectionId}-${classReading.classNumber}`}
                                classReading={classReading}
                                compactMode={compactMode}
                                showLibraryName={showLibrarySource}
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
    str = getString("schedule-this-week");
  } else if (isSameWeek(start, addWeeks(new Date(), 1))) {
    str = getString("schedule-next-week");
  } else {
    const long = new Intl.RelativeTimeFormat(Zotero.locale || "en-US", {
      style: "long",
    });
    const diff = differenceInWeeks(startOfWeek(start), startOfWeek(new Date()));
    str = long.format(diff, "week");
  }

  return <span className="first-letter:capitalize">{str}</span>;
}
