// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { ChevronUp, ChevronDown } from "lucide-preact";
import {
  SyllabusManager,
  ItemSyllabusAssignment,
  SettingsSyllabusMetadata,
  classByNumber,
} from "./syllabus";
import { FEATURE_FLAG } from "./featureFlags";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { formatReadingDate } from "../utils/dates";
import { isZotero8OrLater } from "../utils/zotero";
import { TextInput, ReadingDateInput } from "./syllabusInputs";
import { SyllabusItemCard } from "./SyllabusItemCard";

export interface ClassGroupComponentProps {
  classNumber?: number | null;
  itemAssignments: Array<{
    item: Zotero.Item;
    assignment: ItemSyllabusAssignment;
  }>;
  collectionId: number;
  syllabusMetadata: SettingsSyllabusMetadata;
  onClassTitleSave: (classNumber: number, title: string) => void;
  onClassDescriptionSave: (classNumber: number, description: string) => void;
  onClassReadingDateSave: (
    classNumber: number,
    readingDate: string | undefined,
  ) => void;
  onDrop: (
    e: JSX.TargetedDragEvent<HTMLElement>,
    classNumber: number | null,
    targetItemId?: number,
    insertBefore?: boolean,
  ) => Promise<void>;
  onDragOver: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  onDragLeave: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  compactMode?: boolean;
  readerMode?: boolean;
  isLocked?: boolean;
  onResetSortOrder?: () => void;
  selectedIdentifiers?: Set<string>;
  onIdentifierClick?: (
    item: Zotero.Item,
    assignmentId: string | undefined,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
  selectedForDrag?: {
    assignments: Array<{ itemId: number; assignmentId: string }>;
    itemIds: number[];
  };
  onPriorityChange?: (
    priority: string | undefined,
    identifier: { assignmentId?: string; itemId?: number },
  ) => Promise<void>;
  onDelete?: (identifier: {
    assignmentId?: string;
    itemId?: number;
  }) => Promise<void>;
  onDuplicate?: (identifier: {
    assignmentId?: string;
    itemId?: number;
  }) => Promise<void>;
}

export function ClassGroupComponent({
  classNumber,
  itemAssignments,
  collectionId,
  syllabusMetadata,
  onClassTitleSave,
  onClassDescriptionSave,
  onClassReadingDateSave,
  onDrop,
  onDragOver,
  onDragLeave,
  compactMode = false,
  readerMode = false,
  isLocked = false,
  onResetSortOrder,
  selectedIdentifiers = new Set(),
  onIdentifierClick,
  selectedForDrag = { assignments: [], itemIds: [] },
  onPriorityChange,
  onDelete,
  onDuplicate,
}: ClassGroupComponentProps) {
  const selectedItemIds = useZoteroSelectedItemIds();

  // Get nomenclature for this collection
  const { singularCapitalized } =
    SyllabusManager.getNomenclatureFormatted(collectionId);

  // Get class title, description, reading date, and status from metadata
  const classMeta = classByNumber(syllabusMetadata, classNumber);
  const previousClassMeta = classByNumber(
    syllabusMetadata,
    classNumber != null ? classNumber - 1 : undefined,
  );
  const classTitle = classMeta?.title || "";
  const classDescription = classMeta?.description || "";
  const readingDate = classMeta?.readingDate;
  const classIsDone = classNumber
    ? SyllabusManager.getClassStatus(collectionId, classNumber) === "done"
    : false;

  // Check if there's a manual order for this class
  const hasManualOrder =
    classNumber !== null &&
    classNumber !== undefined &&
    SyllabusManager.getClassItemOrder(collectionId, classNumber).length > 0;

  const handleDeleteClass = async () => {
    if (classNumber == null) {
      return;
    }
    try {
      await SyllabusManager.deleteClass(collectionId, classNumber, "page");
    } catch (err) {
      ztoolkit.log("Error deleting class:", err);
    }
  };

  const classNumbers = SyllabusManager.getFullClassNumberRange(collectionId);
  const classIndex =
    classNumber == null ? -1 : classNumbers.indexOf(classNumber);
  const canMoveUp = classIndex > 0;
  const canMoveDown = classIndex >= 0 && classIndex < classNumbers.length - 1;

  const handleMoveClass = async (direction: "up" | "down") => {
    if (classNumber == null) {
      return;
    }
    try {
      await SyllabusManager.moveClass(
        collectionId,
        classNumber,
        direction,
        "page",
      );
    } catch (err) {
      ztoolkit.log("Error moving class:", err);
    }
  };

  const handleResetSortOrder = async () => {
    if (classNumber !== null && classNumber !== undefined) {
      try {
        // Clear manual order by setting it to empty array
        await SyllabusManager.setClassItemOrder(
          collectionId,
          classNumber,
          [],
          "page",
        );
        // Force immediate re-render
        if (onResetSortOrder) {
          onResetSortOrder();
        }
      } catch (err) {
        ztoolkit.log("Error resetting sort order:", err);
      }
    }
  };

  const handleClassStatusToggle = async () => {
    if (classNumber !== null && classNumber !== undefined) {
      try {
        const newStatus = classIsDone ? null : "done";
        await SyllabusManager.setClassStatus(
          collectionId,
          classNumber,
          newStatus,
          "page",
        );
      } catch (err) {
        ztoolkit.log("Error toggling class status:", err);
      }
    }
  };

  // Generate ID for TOC navigation
  const tocId = classNumber ? `toc-class-${classNumber}` : null;

  return (
    <div
      id={tocId || undefined}
      data-tour="syllabus-class-group"
      className={twMerge(
        "syllabus-class-group in-[.print]:scheme-light",
        readerMode && classIsDone ? "opacity-40" : "",
      )}
    >
      {classNumber && (
        <>
          <div
            className={twMerge(
              "sticky z-35 bg-background py-1 in-[.print]:static top-10",
              isZotero8OrLater() ? "md:pt-8" : "pt-8",
            )}
          >
            <div
              className={twMerge(
                "container-padded rounded-xs mb-1",
                // compactMode ? "py-0.5" : "py-1",
              )}
            >
              <div className="syllabus-class-heading flex gap-2 items-baseline justify-start w-full relative">
                {readerMode && (
                  <input
                    type="checkbox"
                    checked={classIsDone}
                    onChange={handleClassStatusToggle}
                    className={twMerge(
                      "mt-1! absolute right-full mr-1 w-4 h-4 cursor-pointer shrink-0 self-center in-[.print]:hidden",
                      isZotero8OrLater() ? "md:mr-2!" : "mr-2!",
                    )}
                    title={classIsDone ? "Mark as not done" : "Mark as done"}
                    aria-label={
                      classIsDone ? "Mark as not done" : "Mark as done"
                    }
                  />
                )}
                <div
                  className={twMerge(
                    "syllabus-class-header shrink-0 uppercase text-secondary font-semibold",
                    compactMode ? "text-sm" : "text-lg",
                  )}
                >
                  {singularCapitalized} {classNumber}
                </div>
                <div
                  className={twMerge(
                    "w-full font-semibold",
                    compactMode ? "text-xl" : "text-2xl",
                  )}
                >
                  <TextInput
                    elementType="input"
                    initialValue={classTitle}
                    onSave={(title) => onClassTitleSave(classNumber, title)}
                    className="w-full text-primary"
                    placeholder="Add a title..."
                    emptyBehavior="delete"
                    readOnly={isLocked}
                  />
                </div>
                <div className="ml-auto! shrink-0 inline-flex flex-row items-baseline gap-1 in-[.print]:hidden">
                  {FEATURE_FLAG.READING_SCHEDULE && !isLocked && (
                    <ReadingDateInput
                      initialValue={readingDate}
                      defaultDate={previousClassMeta?.readingDate}
                      onSave={(date) =>
                        onClassReadingDateSave(classNumber, date)
                      }
                      compactMode={compactMode}
                    />
                  )}
                  {FEATURE_FLAG.READING_SCHEDULE && isLocked && readingDate && (
                    <div className={twMerge("text-secondary")}>
                      <span className="text-tertiary">Due date: </span>
                      <span className="text-secondary">
                        {formatReadingDate(readingDate)}
                      </span>
                    </div>
                  )}
                  {!isLocked && (
                    <>
                      {hasManualOrder && (
                        <button
                          className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex flex-row items-center justify-center w-8 h-8"
                          onClick={handleResetSortOrder}
                          title="Reset sort order"
                          aria-label="Reset sort order"
                        >
                          <div className="text-lg text-center">⇅</div>
                        </button>
                      )}
                      <button
                        className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex flex-row items-center justify-center w-8 h-8 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-secondary"
                        onClick={() => handleMoveClass("up")}
                        disabled={!canMoveUp}
                        title={`Move ${SyllabusManager.getNomenclatureFormatted(collectionId).singular} up`}
                        aria-label={`Move ${SyllabusManager.getNomenclatureFormatted(collectionId).singular} up`}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex flex-row items-center justify-center w-8 h-8 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-secondary"
                        onClick={() => handleMoveClass("down")}
                        disabled={!canMoveDown}
                        title={`Move ${SyllabusManager.getNomenclatureFormatted(collectionId).singular} down`}
                        aria-label={`Move ${SyllabusManager.getNomenclatureFormatted(collectionId).singular} down`}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-red-500/15 text-secondary hover:text-red-400 inline-flex flex-row items-center justify-center w-8 h-8"
                        onClick={handleDeleteClass}
                        title={`Delete ${SyllabusManager.getNomenclatureFormatted(collectionId).singular}`}
                        aria-label={`Delete ${SyllabusManager.getNomenclatureFormatted(collectionId).singular}`}
                      >
                        <div className="text-2xl text-center">×</div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="container-padded">
            <div
              className={twMerge(compactMode ? "text-base" : "text-lg pt-2")}
            >
              <TextInput
                elementType="textarea"
                initialValue={classDescription}
                onSave={(desc) => onClassDescriptionSave(classNumber, desc)}
                className="w-full px-0! mx-0! text-primary"
                placeholder="Add a description..."
                emptyBehavior="delete"
                fieldSizing="content"
                readOnly={isLocked}
              />
            </div>
          </div>
        </>
      )}
      <div
        className={twMerge("container-padded", compactMode ? "mt-0" : "mt-2")}
      >
        <div
          className={twMerge(
            "syllabus-class-items box-border! rounded-lg",
            compactMode ? "mt-1 space-y-2 p-1 -m-1" : "mt-4 space-y-4 p-2 -m-2",
            "data-[dropzone-active='true']:bg-accent-blue/15! data-[dropzone-active='true']:outline-accent-blue! data-[dropzone-active='true']:text-accent-blue! transition-all duration-200 outline-transparent outline-2! outline-dashed!",
            !isZotero8OrLater() && "compat-space-y",
          )}
          onDrop={isLocked ? undefined : (e) => onDrop(e, classNumber ?? null)}
          onDragOver={isLocked ? undefined : onDragOver}
          onDragLeave={isLocked ? undefined : onDragLeave}
        >
          {!isLocked && itemAssignments.length === 0 && classNumber !== null ? (
            <div
              className={twMerge(
                "text-center bg-quinary/50 rounded-md p-8 text-secondary border-2 border-dashed border-tertiary/50 in-[.print]:hidden",
                compactMode ? "p-4" : "p-8",
              )}
            >
              Drag items to {singularCapitalized} {classNumber}
            </div>
          ) : itemAssignments.length > 0 ? (
            itemAssignments.map(({ item, assignment }) => {
              // Require assignment ID - if missing, skip this assignment
              if (!assignment.id) {
                ztoolkit.log(
                  "Warning: Assignment missing ID, skipping render",
                  assignment,
                );
                return null;
              }

              // Use assignment priority directly
              const priority = assignment.priority || "";
              // Generate unique key using assignment ID - REQUIRED
              const uniqueKey = `${item.id}-assignment-${assignment.id}`;

              return (
                <SyllabusItemCard
                  key={uniqueKey}
                  item={item}
                  collectionId={collectionId}
                  classNumber={classNumber ?? undefined}
                  assignment={assignment}
                  slim={compactMode || !priority || priority === "optional"}
                  compactMode={compactMode}
                  readerMode={readerMode}
                  isLocked={isLocked}
                  selectedIdentifiers={selectedIdentifiers}
                  onIdentifierClick={onIdentifierClick}
                  selectedForDrag={selectedForDrag}
                  onPriorityChange={onPriorityChange}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onDrop={(e, insertBefore) =>
                    onDrop(e, classNumber ?? null, item.id, insertBefore)
                  }
                  onDragOver={onDragOver}
                  isZoteroSelected={selectedItemIds?.includes(item.id) || false}
                  isIdentifierSelected={selectedIdentifiers.has(
                    `assignment:${assignment.id}`,
                  )}
                />
              );
            })
          ) : null}
        </div>
      </div>
    </div>
  );
}
