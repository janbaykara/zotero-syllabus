// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { twMerge } from "tailwind-merge";
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
import { useZoteroItemDensity } from "./react-zotero-sync/itemDensity";
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
import { PinnedSection, usePinnedScheduleData } from "./PinnedSection";
import { SyllabusViewMenu } from "./SyllabusViewMenu";
import { useGalleryLayout } from "./galleryLayout";
import { GalleryViewportProvider } from "./galleryVisibility";
import {
  ScheduleStickyTopsContext,
  useScheduleStickyTop,
  type ScheduleStickyTops,
} from "./scheduleSticky";

setDefaultOptions({
  weekStartsOn: 1,
});

const READING_SCHEDULE_LAYOUT_KEY = "reading-schedule";

/** Fallbacks if sticky bands aren't in the DOM yet. */
const SCHEDULE_WEEK_BAND_PX = 40;
const SCHEDULE_DATE_BAND_PX = 36;
/** Clearance under the measured page header (same as Annotation Feed). */
const SCHEDULE_HEADER_GAP_PX = 12;

export function ReadingSchedule({ libraryID }: { libraryID?: number }) {
  const [density] = useZoteroItemDensity();
  const [layout, setLayout] = useGalleryLayout(
    READING_SCHEDULE_LAYOUT_KEY,
    "card",
  );
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [stickyTops, setStickyTops] = useState<ScheduleStickyTops>({
    week: 0,
    date: 0,
    class: 0,
  });

  const allSyllabi = useSyllabi();
  const syllabi = useMemo(
    () => filterSyllabiByLibrary(allSyllabi, libraryID),
    [allSyllabi, libraryID],
  );

  const { pinnedItems, nextUp, reload } = usePinnedScheduleData(libraryID);
  const hasPinned = pinnedItems.length > 0 || nextUp.length > 0;

  const readingsByWeek = useMemo(
    () => collectClassReadingsByWeek(syllabi),
    [syllabi],
  );

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
    (syllabiSpanMultipleLibraries(syllabi) ||
      new Set([
        ...pinnedItems.map((item) => item.libraryID),
        ...nextUp.map((reading) => reading.libraryID),
      ]).size > 1);

  const scheduleHeader = (
    <div
      ref={headerRef}
      className={twMerge(
        "sticky top-0 z-20 w-full bg-background py-1",
        isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
      )}
    >
      <div className="container-padded bg-background">
        <div className="flex flex-row items-center gap-2 justify-between">
          <div className="min-w-0">
            <div className="font-semibold text-3xl">
              {getString("view-tab-reading-schedule")}
            </div>
            <p className="text-secondary text-base mt-1">
              {getString("reading-schedule-desc")}
            </p>
          </div>
          <div className="inline-flex items-center gap-2.5 shrink grow-0">
            <SyllabusViewMenu
              showLayout
              layout={layout}
              onLayoutChange={setLayout}
              showCheckboxes={false}
              showScheduleCollection
            />
          </div>
        </div>
      </div>
    </div>
  );

  useLayoutEffect(() => {
    const page = pageRef.current;
    const header = headerRef.current;
    if (!page || !header) {
      return;
    }
    const observedBands = new WeakSet<Element>();
    const syncStickyTop = () => {
      const primary = Math.ceil(
        header.getBoundingClientRect().height + SCHEDULE_HEADER_GAP_PX,
      );
      const weekEl = page.querySelector(
        ".syllabus-schedule-sticky-week",
      ) as HTMLElement | null;
      const dateEl = page.querySelector(
        ".syllabus-schedule-sticky-date",
      ) as HTMLElement | null;
      for (const el of [weekEl, dateEl]) {
        if (el && !observedBands.has(el)) {
          observedBands.add(el);
          observer.observe(el);
        }
      }
      const weekH = Math.ceil(
        weekEl?.getBoundingClientRect().height || SCHEDULE_WEEK_BAND_PX,
      );
      const dateH = Math.ceil(
        dateEl?.getBoundingClientRect().height || SCHEDULE_DATE_BAND_PX,
      );
      const next: ScheduleStickyTops = {
        week: primary,
        date: primary + weekH,
        class: primary + weekH + dateH,
      };
      page.style.setProperty(
        "--syllabus-schedule-sticky-top",
        `${next.week}px`,
      );
      page.style.setProperty(
        "--syllabus-schedule-sticky-date",
        `${next.date}px`,
      );
      page.style.setProperty(
        "--syllabus-schedule-sticky-class",
        `${next.class}px`,
      );
      setStickyTops((prev) =>
        prev.week === next.week &&
        prev.date === next.date &&
        prev.class === next.class
          ? prev
          : next,
      );
    };
    const observer = new ResizeObserver(syncStickyTop);
    observer.observe(header);
    syncStickyTop();
    const win = page.ownerDocument.defaultView;
    win?.addEventListener("resize", syncStickyTop);
    const raf = win?.requestAnimationFrame(() => {
      syncStickyTop();
      win.requestAnimationFrame(syncStickyTop);
    });
    return () => {
      observer.disconnect();
      win?.removeEventListener("resize", syncStickyTop);
      if (raf != null) {
        win?.cancelAnimationFrame(raf);
      }
    };
  }, [hasPinned, sortedWeeks.length]);

  if (sortedWeeks.length === 0 && !hasPinned) {
    return (
      <div
        className={twMerge(
          "syllabus-page overflow-y-auto overflow-x-hidden h-full",
          `density-${density}`,
        )}
        data-item-density={density}
        dir={getUiDir()}
      >
        {scheduleHeader}
        <div className="container-padded py-12">
          <div className="text-center text-secondary">
            <div
              className={twMerge(
                "font-semibold mb-2",
                density !== "expanded" ? "text-xl" : "text-2xl",
              )}
            >
              {getString("schedule-empty-title")}
            </div>
            <p
              className={twMerge(
                density !== "expanded" ? "text-base" : "text-lg",
              )}
            >
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
      ref={pageRef}
      className={twMerge(
        "syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background",
        `density-${density}`,
        layout === "magazine" && "syllabus-magazine-page",
      )}
      data-item-density={density}
      dir={getUiDir()}
    >
      <div className="pb-12">
        {scheduleHeader}

        <ScheduleStickyTopsContext.Provider value={stickyTops}>
          <GalleryViewportProvider rootRef={pageRef}>
            <PinnedSection
              density={density}
              layout={layout}
              showLibraryName={showLibrarySource}
              pinnedItems={pinnedItems}
              nextUp={nextUp}
              onChanged={reload}
              showUnpinCheckboxes
            />

            {sortedWeeks.length > 0 ? (
              <div className={twMerge("flex flex-col gap-8 mt-8")}>
                {sortedWeeks.map((weekStartKey) => {
                  const weekData = readingsByWeek.get(weekStartKey)!;
                  const sortedDates = Array.from(weekData.keys()).sort(
                    (a, b) =>
                      parseReadingDate(a).getTime() -
                      parseReadingDate(b).getTime(),
                  );

                  const weekStartDate = parseReadingDate(weekStartKey);

                  return (
                    <div key={weekStartKey} className="syllabus-class-group">
                      <StickyWeekBand>
                        <div className="container-padded text-3xl text-tertiary">
                          <WeekHeader weekStartDate={weekStartDate} />
                        </div>
                      </StickyWeekBand>

                      <div className="space-y-12 my-6">
                        {sortedDates.map((dateTimestamp) => {
                          const classReadings = weekData.get(dateTimestamp)!;

                          return (
                            <div key={dateTimestamp}>
                              <StickyDateBand>
                                <div className="container-padded text-secondary text-2xl">
                                  {formatReadingDate(
                                    dateTimestamp,
                                    !isThisMonth(
                                      parseReadingDate(dateTimestamp),
                                    ),
                                  )}
                                </div>
                              </StickyDateBand>

                              <div className="space-y-8 mt-3">
                                {classReadings.map((classReading) => (
                                  <ClassReadingBlock
                                    key={`${classReading.collectionId}-${classReading.classNumber}`}
                                    classReading={classReading}
                                    density={density}
                                    layout={layout}
                                    showLibraryName={showLibrarySource}
                                    stickyHeading
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
                  );
                })}
              </div>
            ) : (
              <p className="container-padded text-secondary text-lg mt-4">
                {getString("schedule-empty-desc")}
              </p>
            )}
          </GalleryViewportProvider>
        </ScheduleStickyTopsContext.Provider>
      </div>
    </div>
  );
}

function StickyWeekBand({
  children,
  className,
}: {
  children: preact.ComponentChildren;
  className?: string;
}) {
  const top = useScheduleStickyTop("week");
  return (
    <div
      className={twMerge("syllabus-schedule-sticky-week", className)}
      style={top}
    >
      {children}
    </div>
  );
}

function StickyDateBand({ children }: { children: preact.ComponentChildren }) {
  const top = useScheduleStickyTop("date");
  return (
    <div className="syllabus-schedule-sticky-date" style={top}>
      {children}
    </div>
  );
}

function WeekHeader({ weekStartDate }: { weekStartDate: Date }) {
  const start = startOfWeek(weekStartDate);
  ztoolkit.log("WeekHeader: start:", differenceInDays(start, new Date()));
  let str: string;
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
