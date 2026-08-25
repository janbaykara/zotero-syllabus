// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { ChevronLeft, ChevronRight } from "lucide-preact";
import { SyllabusManager } from "./syllabus";
import {
  ClassReadingBlock,
  selectCollectionInLibrary,
  selectItemInCollection,
} from "./ClassReadingBlock";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { useSyllabi } from "./react-zotero-sync/useSyllabi";
import { formatReadingDate, toLocalDateKey } from "../utils/dates";
import { isZotero8OrLater } from "../utils/zotero";
import {
  getReadingScheduleCollectionContext,
  listReadingScheduleDateFolders,
} from "./readingScheduleCollection";
import { collectClassReadingsByDate } from "./classReadings";

function pickInitialDateKey(
  availableKeys: string[],
  preferred: string | null,
): string | null {
  if (!availableKeys.length) {
    return null;
  }
  if (preferred && availableKeys.includes(preferred)) {
    return preferred;
  }
  const today = toLocalDateKey(new Date());
  if (availableKeys.includes(today)) {
    return today;
  }
  const upcoming = availableKeys.find((key) => key >= today);
  if (upcoming) {
    return upcoming;
  }
  return availableKeys[availableKeys.length - 1];
}

export function ReadingScheduleDayPage({
  collectionId,
}: {
  collectionId: number;
}) {
  const [compactMode] = useZoteroCompactMode();
  const syllabi = useSyllabi();
  const context = useMemo(
    () => getReadingScheduleCollectionContext(collectionId),
    [collectionId],
  );

  const dateFolders = useMemo(
    () => listReadingScheduleDateFolders(context?.root ?? null),
    [context?.root?.id, collectionId, context?.dateKey],
  );

  const readingsByDate = useMemo(
    () => collectClassReadingsByDate(syllabi),
    [syllabi],
  );

  const availableDateKeys = useMemo(() => {
    const fromFolders = dateFolders.map((folder) => folder.dateKey);
    const fromReadings = Array.from(readingsByDate.keys());
    return Array.from(new Set([...fromFolders, ...fromReadings])).sort();
  }, [dateFolders, readingsByDate]);

  const [rootDateOverride, setRootDateOverride] = useState<string | null>(null);

  useEffect(() => {
    setRootDateOverride(null);
  }, [collectionId]);

  const activeDateKey = useMemo(() => {
    if (!context) {
      return null;
    }
    if (context.kind === "date" && context.dateKey) {
      return context.dateKey;
    }
    return pickInitialDateKey(availableDateKeys, rootDateOverride);
  }, [context, availableDateKeys, rootDateOverride]);

  const activeIndex =
    activeDateKey != null ? availableDateKeys.indexOf(activeDateKey) : -1;
  const prevDateKey =
    activeIndex > 0 ? availableDateKeys[activeIndex - 1] : null;
  const nextDateKey =
    activeIndex >= 0 && activeIndex < availableDateKeys.length - 1
      ? availableDateKeys[activeIndex + 1]
      : null;

  const classReadings = activeDateKey
    ? readingsByDate.get(activeDateKey) || []
    : [];

  const goToDate = (dateKey: string) => {
    if (!context) {
      return;
    }
    const folder = dateFolders.find((entry) => entry.dateKey === dateKey);
    if (folder) {
      selectCollectionInLibrary(folder.collection.id);
      void SyllabusManager.setCollectionViewMode("syllabus").then(() => {
        SyllabusManager.setupPage();
      });
      return;
    }
    // No matching folder yet — keep selection, flip the displayed day.
    setRootDateOverride(dateKey);
    if (context.kind === "date") {
      selectCollectionInLibrary(context.root.id);
      void SyllabusManager.setCollectionViewMode("syllabus").then(() => {
        SyllabusManager.setupPage();
      });
    }
  };

  const openRoot = () => {
    if (!context) {
      return;
    }
    selectCollectionInLibrary(context.root.id);
    void SyllabusManager.setCollectionViewMode("syllabus").then(() => {
      SyllabusManager.setupPage();
    });
  };

  if (!context) {
    return (
      <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background">
        <div className="container-padded py-12 text-secondary">
          This collection is not part of the Reading schedule.
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
            {context.kind === "date" ? (
              <button
                type="button"
                onClick={openRoot}
                className="flex items-center gap-1 text-secondary hover:text-primary bg-transparent! border-none p-0 cursor-pointer text-base in-[.print]:hidden"
                title="Open Reading schedule"
              >
                <ChevronLeft size={18} />
                <span className="font-semibold">Reading schedule</span>
              </button>
            ) : (
              <div className={twMerge("font-semibold text-3xl")}>
                Reading schedule
              </div>
            )}
            <p className="text-sm text-secondary mt-1 in-[.print]:hidden">
              Auto-managed from your syllabi. Edits here are overwritten.
            </p>
          </div>
        </div>

        <div className="container-padded mt-6">
          <DayNavHeader
            dateKey={activeDateKey}
            prevDateKey={prevDateKey}
            nextDateKey={nextDateKey}
            onPrev={() => prevDateKey && goToDate(prevDateKey)}
            onNext={() => nextDateKey && goToDate(nextDateKey)}
            compactMode={compactMode}
          />

          {classReadings.length === 0 ? (
            <p className="text-secondary text-lg mt-8">
              {activeDateKey
                ? "No readings scheduled for this day."
                : "No readings in the schedule window yet. Add reading dates to classes to see them here."}
            </p>
          ) : (
            <div className="space-y-8 mt-8">
              {classReadings.map((classReading) => (
                <ClassReadingBlock
                  key={`${classReading.collectionId}-${classReading.classNumber}`}
                  classReading={classReading}
                  compactMode={compactMode}
                  onCollectionClick={() =>
                    selectCollectionInLibrary(classReading.collectionId)
                  }
                  onItemClick={(item) =>
                    selectItemInCollection(item, classReading.collectionId)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayNavHeader({
  dateKey,
  prevDateKey,
  nextDateKey,
  onPrev,
  onNext,
  compactMode,
}: {
  dateKey: string | null;
  prevDateKey: string | null;
  nextDateKey: string | null;
  onPrev: () => void;
  onNext: () => void;
  compactMode: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={!prevDateKey}
        className={twMerge(
          "flex items-center gap-1 bg-transparent! border-none p-0 cursor-pointer text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-default disabled:hover:text-secondary",
          compactMode ? "text-sm" : "text-base",
        )}
        title={prevDateKey ? formatReadingDate(prevDateKey) : undefined}
      >
        <ChevronLeft size={18} />
        <span>Previous</span>
      </button>

      <div
        className={twMerge(
          "text-center text-secondary font-medium",
          compactMode ? "text-xl" : "text-2xl",
        )}
      >
        {dateKey ? formatReadingDate(dateKey) : "No dates"}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!nextDateKey}
        className={twMerge(
          "flex items-center gap-1 bg-transparent! border-none p-0 cursor-pointer text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-default disabled:hover:text-secondary",
          compactMode ? "text-sm" : "text-base",
        )}
        title={nextDateKey ? formatReadingDate(nextDateKey) : undefined}
      >
        <span>Next</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
