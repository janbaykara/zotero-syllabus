import type { ItemDensity } from "./react-zotero-sync/itemDensity";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { ChevronUp, ChevronDown, Plus } from "lucide-preact";
import {
  SyllabusManager,
  ItemSyllabusAssignment,
  SettingsSyllabusMetadata,
  classByNumber,
} from "./syllabus";
import { FEATURE_FLAG } from "./featureFlags";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { formatReadingDate } from "../utils/dates";
import { getString } from "../utils/locale";
import { isZotero8OrLater } from "../utils/zotero";
import { TextInput, ReadingDateInput } from "./syllabusInputs";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { isOsFileDrag } from "../utils/nativeFileDrop";

export type ItemDropIndicator = {
  classNumber: number | null;
  identifier: string;
  edge: "before" | "after";
};

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
  dropIndicator?: ItemDropIndicator | null;
  onDropIndicatorChange?: (indicator: ItemDropIndicator | null) => void;
  draggingIdentifiers?: Set<string>;
  draggingSourceClass?: number | null;
  density?: ItemDensity;
  readerMode?: boolean;
  isLocked?: boolean;
  onResetSortOrder?: () => void;
  selectedIdentifiers?: Set<string>;
  onIdentifierClick?: (
    item: Zotero.Item,
    assignmentId: string | undefined,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
  onContextMenu?: (
    item: Zotero.Item,
    e: JSX.TargetedMouseEvent<HTMLElement>,
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
  dropIndicator = null,
  onDropIndicatorChange,
  draggingIdentifiers = new Set(),
  draggingSourceClass = null,
  density = "expanded",
  readerMode = false,
  isLocked = false,
  onResetSortOrder,
  selectedIdentifiers = new Set(),
  onIdentifierClick,
  onContextMenu,
  selectedForDrag = { assignments: [], itemIds: [] },
  onPriorityChange,
  onDelete,
  onDuplicate,
}: ClassGroupComponentProps) {
  const selectedItemIds = useZoteroSelectedItemIds();

  // Get nomenclature for this collection
  const { singular, singularCapitalized } =
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

  const handleInsertClassBefore = async () => {
    if (classNumber == null) {
      return;
    }
    try {
      await SyllabusManager.insertClassBefore(
        collectionId,
        classNumber,
        "page",
      );
    } catch (err) {
      ztoolkit.log("Error inserting class:", err);
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

  const classNumberKey = classNumber ?? null;

  const assignmentIdentifier = (assignmentId: string) =>
    `assignment:${assignmentId}`;

  /** Place the insert line from a Y position over this class's item list. */
  const updateDropIndicatorFromY = (
    clientY: number,
    cardsRoot: HTMLElement,
  ) => {
    if (!onDropIndicatorChange) {
      return;
    }
    const cards = Array.from(
      cardsRoot.querySelectorAll(":scope > .syllabus-item-card"),
    ) as HTMLElement[];
    if (cards.length === 0) {
      onDropIndicatorChange(null);
      return;
    }
    for (const card of cards) {
      const identifier = card.dataset.syllabusIdentifier;
      if (!identifier) {
        continue;
      }
      const rect = card.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        onDropIndicatorChange({
          classNumber: classNumberKey,
          identifier,
          edge: "before",
        });
        return;
      }
    }
    const last = cards[cards.length - 1];
    const identifier = last.dataset.syllabusIdentifier;
    if (identifier) {
      onDropIndicatorChange({
        classNumber: classNumberKey,
        identifier,
        edge: "after",
      });
    }
  };

  const handleItemsDragOver = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    onDragOver(e);
    if (isOsFileDrag(e.dataTransfer)) {
      return;
    }
    updateDropIndicatorFromY(e.clientY, e.currentTarget);
  };

  const handleItemDragOver = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    // Keep dropzone effectAllowed / preventDefault behavior from the page.
    onDragOver(e);
    if (isOsFileDrag(e.dataTransfer)) {
      return;
    }
    // Use the list scanner so each gap has a single line (before next /
    // after last), matching the Home configure popover — not both
    // "after this" and "before next" in the same gap.
    const root = e.currentTarget.parentElement;
    if (root instanceof HTMLElement) {
      updateDropIndicatorFromY(e.clientY, root);
    }
  };

  const handleItemsDragLeave = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    onDragLeave(e);
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX: x, clientY: y } = e;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      onDropIndicatorChange?.(null);
    }
  };

  // Hide the line when it would not change order within the same class.
  const visibleDropIndicator = (() => {
    if (
      !dropIndicator ||
      dropIndicator.classNumber !== classNumberKey ||
      itemAssignments.length === 0
    ) {
      return null;
    }
    const sameClass =
      draggingSourceClass !== null &&
      draggingSourceClass !== undefined &&
      draggingSourceClass === classNumberKey;
    if (!sameClass || draggingIdentifiers.size !== 1) {
      return dropIndicator;
    }
    const draggedId = [...draggingIdentifiers][0];
    const from = itemAssignments.findIndex(
      ({ assignment }) =>
        assignment.id != null &&
        assignmentIdentifier(assignment.id) === draggedId,
    );
    const toItem = itemAssignments.findIndex(
      ({ assignment }) =>
        assignment.id != null &&
        assignmentIdentifier(assignment.id) === dropIndicator.identifier,
    );
    if (from < 0 || toItem < 0) {
      return dropIndicator;
    }
    const to = dropIndicator.edge === "after" ? toItem + 1 : toItem;
    if (to === from || to === from + 1) {
      return null;
    }
    return dropIndicator;
  })();

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
              "group/class-heading relative sticky z-35 bg-background py-1 in-[.print]:static top-10",
              isZotero8OrLater() ? "md:pt-8" : "pt-8",
            )}
          >
            {!isLocked && (
              <button
                type="button"
                className="absolute left-0 right-0 top-1.5 flex items-center gap-2 opacity-0 group-hover/class-heading:opacity-100 focus-visible:opacity-100 transition-opacity in-[.print]:hidden text-xs text-secondary hover:text-primary cursor-pointer bg-transparent border-0 p-0"
                onClick={handleInsertClassBefore}
                title={getString("class-insert-here", {
                  args: { nomenclature: singular },
                })}
                aria-label={getString("class-insert-here", {
                  args: { nomenclature: singular },
                })}
              >
                <span className="flex-1 h-px bg-quinary" />
                <span className="inline-flex items-center gap-1 shrink-0">
                  <Plus size={12} />
                  {getString("class-insert-here", {
                    args: { nomenclature: singular },
                  })}
                </span>
                <span className="flex-1 h-px bg-quinary" />
              </button>
            )}
            <div
              className={twMerge(
                "container-padded rounded-xs mb-1",
                // density !== "expanded" ? "py-0.5" : "py-1",
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
                    title={
                      classIsDone
                        ? getString("mark-not-done")
                        : getString("mark-done")
                    }
                    aria-label={
                      classIsDone
                        ? getString("mark-not-done")
                        : getString("mark-done")
                    }
                  />
                )}
                <div
                  className={twMerge(
                    "syllabus-class-header shrink-0 uppercase text-secondary font-semibold",
                    density !== "expanded" ? "text-sm" : "text-lg",
                  )}
                >
                  {singularCapitalized} {classNumber}
                </div>
                <div
                  className={twMerge(
                    "w-full font-semibold",
                    density !== "expanded" ? "text-xl" : "text-2xl",
                  )}
                >
                  <TextInput
                    elementType="input"
                    initialValue={classTitle}
                    onSave={(title) => onClassTitleSave(classNumber, title)}
                    className="w-full text-primary"
                    placeholder={getString("placeholder-add-title")}
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
                      density={density}
                    />
                  )}
                  {FEATURE_FLAG.READING_SCHEDULE && isLocked && readingDate && (
                    <div className={twMerge("text-secondary")}>
                      <span className="text-tertiary">
                        {getString("class-due-date-label")}{" "}
                      </span>
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
                          title={getString("class-reset-sort")}
                          aria-label={getString("class-reset-sort")}
                        >
                          <div className="text-lg text-center">⇅</div>
                        </button>
                      )}
                      <button
                        className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex flex-row items-center justify-center w-8 h-8 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-secondary"
                        onClick={() => handleMoveClass("up")}
                        disabled={!canMoveUp}
                        title={getString("class-move-up", {
                          args: { nomenclature: singular },
                        })}
                        aria-label={getString("class-move-up", {
                          args: { nomenclature: singular },
                        })}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex flex-row items-center justify-center w-8 h-8 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-secondary"
                        onClick={() => handleMoveClass("down")}
                        disabled={!canMoveDown}
                        title={getString("class-move-down", {
                          args: { nomenclature: singular },
                        })}
                        aria-label={getString("class-move-down", {
                          args: { nomenclature: singular },
                        })}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-red-500/15 text-secondary hover:text-red-400 inline-flex flex-row items-center justify-center w-8 h-8"
                        onClick={handleDeleteClass}
                        title={getString("class-delete", {
                          args: { nomenclature: singular },
                        })}
                        aria-label={getString("class-delete", {
                          args: { nomenclature: singular },
                        })}
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
              className={twMerge(
                density !== "expanded" ? "text-base" : "text-lg pt-2",
              )}
            >
              <TextInput
                elementType="textarea"
                initialValue={classDescription}
                onSave={(desc) => onClassDescriptionSave(classNumber, desc)}
                className="w-full px-0! mx-0! text-primary"
                placeholder={getString("placeholder-add-description")}
                emptyBehavior="delete"
                fieldSizing="content"
                readOnly={isLocked}
              />
            </div>
          </div>
        </>
      )}
      <div
        className={twMerge(
          "container-padded",
          density !== "expanded" ? "mt-0" : "mt-2",
        )}
      >
        <div
          className={twMerge(
            "syllabus-class-items box-border! rounded-lg",
            density !== "expanded"
              ? "mt-1 space-y-2 p-1 -m-1"
              : "mt-4 space-y-4 p-2 -m-2",
            "data-[dropzone-active='true']:bg-accent-blue/15! data-[dropzone-active='true']:outline-accent-blue! data-[dropzone-active='true']:text-accent-blue! transition-all duration-200 outline-transparent outline-2! outline-dashed!",
            !isZotero8OrLater() && "compat-space-y",
          )}
          onDrop={
            isLocked
              ? undefined
              : (e) => {
                  if (
                    dropIndicator &&
                    dropIndicator.classNumber === classNumberKey
                  ) {
                    const target = itemAssignments.find(
                      ({ assignment }) =>
                        assignment.id != null &&
                        `assignment:${assignment.id}` ===
                          dropIndicator.identifier,
                    );
                    if (target) {
                      void onDrop(
                        e,
                        classNumber ?? null,
                        target.item.id,
                        dropIndicator.edge === "before",
                      );
                      return;
                    }
                  }
                  void onDrop(e, classNumber ?? null);
                }
          }
          onDragOver={isLocked ? undefined : handleItemsDragOver}
          onDragLeave={isLocked ? undefined : handleItemsDragLeave}
        >
          {!isLocked && itemAssignments.length === 0 && classNumber !== null ? (
            <div
              className={twMerge(
                "text-center bg-quinary/50 rounded-md p-8 text-secondary border-2 border-dashed border-tertiary/50 in-[.print]:hidden",
                density !== "expanded" ? "p-4" : "p-8",
              )}
            >
              {getString("class-dropzone-hint", {
                args: {
                  nomenclature: singularCapitalized,
                  number: classNumber,
                },
              })}
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
                  slim={
                    density !== "expanded" ||
                    !priority ||
                    priority === "optional"
                  }
                  density={density}
                  readerMode={readerMode}
                  isLocked={isLocked}
                  selectedIdentifiers={selectedIdentifiers}
                  onIdentifierClick={onIdentifierClick}
                  onContextMenu={onContextMenu}
                  selectedForDrag={selectedForDrag}
                  onPriorityChange={onPriorityChange}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onDrop={(e, insertBefore) =>
                    onDrop(e, classNumber ?? null, item.id, insertBefore)
                  }
                  onDragOver={handleItemDragOver}
                  dropEdge={
                    visibleDropIndicator?.identifier ===
                    `assignment:${assignment.id}`
                      ? visibleDropIndicator.edge
                      : null
                  }
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
