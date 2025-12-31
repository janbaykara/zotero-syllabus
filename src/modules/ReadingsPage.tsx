// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { SyllabusItemCard } from "./SyllabusPage";
import { getLocaleID } from "../utils/locale";

interface ReadingsPageProps {
  collectionId: number;
}

function formatReadingDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ReadingsPage({ collectionId }: ReadingsPageProps) {
  const items = useZoteroCollectionItems(collectionId);
  const [syllabusMetadata] = useZoteroSyllabusMetadata(collectionId);
  const [compactMode] = useZoteroCompactMode();

  // Get readings grouped by date, then by class
  const readingsByDate = useMemo(() => {
    const result = new Map<
      number,
      Map<number, Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>>
    >();

    for (const item of items) {
      if (!item.isRegularItem()) continue;

      const assignments = SyllabusManager.getAllClassAssignments(
        item,
        collectionId,
      );

      for (const assignment of assignments) {
        if (assignment.classNumber === undefined) continue;

        const readingDate = SyllabusManager.getClassReadingDate(
          collectionId,
          assignment.classNumber,
        );

        // Only include classes with reading dates
        if (readingDate === undefined) continue;

        if (!result.has(readingDate)) {
          result.set(readingDate, new Map());
        }

        const classesForDate = result.get(readingDate)!;
        if (!classesForDate.has(assignment.classNumber)) {
          classesForDate.set(assignment.classNumber, []);
        }

        classesForDate.get(assignment.classNumber)!.push({ item, assignment });
      }
    }

    // Sort items within each class
    for (const [, classesForDate] of result) {
      for (const [classNumber, itemAssignments] of classesForDate) {
        const sorted = SyllabusManager.sortClassItems(
          itemAssignments,
          collectionId,
          classNumber,
        );
        classesForDate.set(classNumber, sorted);
      }
    }

    return result;
  }, [items, collectionId, syllabusMetadata]);

  // Convert to sorted array for rendering
  const sortedDates = useMemo(() => {
    return Array.from(readingsByDate.keys()).sort((a, b) => a - b);
  }, [readingsByDate]);

  const { singularCapitalized } =
    SyllabusManager.getNomenclatureFormatted(collectionId);

  if (sortedDates.length === 0) {
    return (
      <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full">
        <div className="container-padded py-12">
          <div className="text-center text-secondary">
            <div className={twMerge("font-semibold mb-2", compactMode ? "text-xl" : "text-2xl")}>
              {Zotero.locale ? Zotero.locale.getString(getLocaleID("no-readings-scheduled")) : "No readings scheduled"}
            </div>
            <p className={twMerge(compactMode ? "text-base" : "text-lg")}>
              {Zotero.locale ? Zotero.locale.getString(getLocaleID("no-readings-scheduled-description")) : "Add reading dates to classes to see them here."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full">
      <div className="pb-12">
        <div className="sticky top-0 z-10 bg-background py-1 md:pt-8">
          <div className="container-padded bg-background">
            <div className={twMerge("font-semibold", compactMode ? "text-2xl" : "text-3xl")}>
              {Zotero.locale ? Zotero.locale.getString(getLocaleID("readings-page-title")) : "All Readings"}
            </div>
          </div>
        </div>

        <div className={twMerge("flex flex-col", compactMode ? "gap-8 mt-4" : "gap-12 mt-6")}>
          {sortedDates.map((dateTimestamp) => {
            const classesForDate = readingsByDate.get(dateTimestamp)!;
            const sortedClassNumbers = Array.from(classesForDate.keys()).sort(
              (a, b) => a - b,
            );

            return (
              <div key={dateTimestamp} className="syllabus-class-group">
                <div className="container-padded">
                  <div
                    className={twMerge(
                      "font-semibold mb-4",
                      compactMode ? "text-xl" : "text-2xl",
                    )}
                  >
                    {formatReadingDate(dateTimestamp)}
                  </div>

                  {sortedClassNumbers.map((classNumber) => {
                    const itemAssignments = classesForDate.get(classNumber)!;
                    const classTitle = SyllabusManager.getClassTitle(
                      collectionId,
                      classNumber,
                    );

                    return (
                      <div key={classNumber} className="mb-6">
                        <div
                          className={twMerge(
                            "font-semibold mb-2",
                            compactMode ? "text-lg" : "text-xl",
                          )}
                        >
                          {singularCapitalized} {classNumber}
                          {classTitle && `: ${classTitle}`}
                        </div>
                        <div
                          className={twMerge(
                            "space-y-2",
                            compactMode ? "space-y-2" : "space-y-4",
                          )}
                        >
                          {itemAssignments.map(({ item, assignment }) => {
                            if (!assignment.id) return null;

                            const priority = assignment.priority || "";
                            const uniqueKey = `${item.id}-assignment-${assignment.id}`;

                            return (
                              <SyllabusItemCard
                                key={uniqueKey}
                                item={item}
                                collectionId={collectionId}
                                classNumber={classNumber}
                                assignment={assignment}
                                slim={
                                  compactMode ||
                                  !priority ||
                                  priority === SyllabusManager.priorityKeys.OPTIONAL
                                }
                                compactMode={compactMode}
                              />
                            );
                          })}
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
}

