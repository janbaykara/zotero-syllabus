import type { ItemDensity } from "./react-zotero-sync/itemDensity";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
import { useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { ChevronUp, ChevronDown, Plus } from "lucide-preact";
import {
  SyllabusManager,
  ItemSyllabusAssignment,
  SettingsSyllabusMetadata,
  classByNumber,
} from "./syllabus";
import { partitionClassAssignmentsBySection } from "./classGroups";
import { FEATURE_FLAG } from "./featureFlags";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { formatReadingDate } from "../utils/dates";
import { getString } from "../utils/locale";
import { getCachedCollectionById } from "@janbaykara/zotero-cache";
import { collectionLibraryIsEditable, isZotero8OrLater } from "../utils/zotero";
import { TextInput, ReadingDateInput } from "./syllabusInputs";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { SyllabusDndSortable } from "./SyllabusDndSortable";
import { SyllabusDndZone } from "./SyllabusDndZone";
import { syllabusDndGroup } from "./syllabusDnd";
import { useSyllabusPageDnd } from "./SyllabusPageDnd";
import { isOsFileDrag } from "../utils/nativeFileDrop";
import type { GalleryLayout } from "./galleryLayout";
import type { MagazinePacking } from "./magazinePacking";
import { ReadingItemsLayout } from "./readingItemsLayout";
import { selectItemInCollection } from "./ClassReadingBlock";
import {
  pickAndAddItemsToClass,
  pickAndAddItemsToUnnumbered,
} from "./addItemsToClass";
import {
  createAndAssignClassNote,
  createStandaloneClassNote,
} from "./classNote";
import { useClassReadingDone } from "./react-zotero-sync/personalReadingOrder";

export type ItemDropIndicator = {
  classNumber: number | null;
  /** Distinguishes further-reading drops from a null class group. */
  zone?: "further-reading";
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
    extras?: { sectionId?: string },
  ) => Promise<void>;
  onDragOver: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  onDragLeave: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  dropIndicator?: ItemDropIndicator | null;
  onDropIndicatorChange?: (indicator: ItemDropIndicator | null) => void;
  draggingIdentifiers?: Set<string>;
  /** Numbered class, `"unnumbered"` for Course Information, or null when not from a class group. */
  draggingSourceClass?: number | "unnumbered" | null;
  density?: ItemDensity;
  readerMode?: boolean;
  isLocked?: boolean;
  /** Browse layout when locked (Card / Cover / Magazine). Ignored while editing. */
  layout?: GalleryLayout;
  magazinePacking?: MagazinePacking;
  colorFilterScope?: string;
  showItemsWithoutAnnotations?: boolean;
  /** Order among Syllabus annotation streams for shared cross-class selection. */
  annotationStreamOrder?: number;
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
  layout = "card",
  magazinePacking = "vertical",
  colorFilterScope,
  showItemsWithoutAnnotations,
  annotationStreamOrder = 0,
  onResetSortOrder,
  selectedIdentifiers = new Set(),
  onIdentifierClick,
  onContextMenu,
  selectedForDrag = { assignments: [], itemIds: [] },
  onPriorityChange,
  onDelete,
  onDuplicate,
}: ClassGroupComponentProps) {
  const chromeDnd = useSyllabusPageDnd()?.enabled ?? false;
  const selectedItemIds = useZoteroSelectedItemIds();
  const libraryEditable = collectionLibraryIsEditable(
    getCachedCollectionById(collectionId),
  );
  const canAddNote = !isLocked && libraryEditable;

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
  const classIsDone = useClassReadingDone(collectionId, classNumber);

  // Check if there's a manual order for this class (including unnumbered)
  const hasManualOrder =
    SyllabusManager.getClassItemOrder(collectionId, classNumber ?? null)
      .length > 0;

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
    try {
      // Clear manual order by setting it to empty array
      await SyllabusManager.setClassItemOrder(
        collectionId,
        classNumber ?? null,
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
  };

  const handleAddReadings = async () => {
    try {
      if (classNumber == null) {
        await pickAndAddItemsToUnnumbered(collectionId);
      } else {
        await pickAndAddItemsToClass(collectionId, classNumber);
      }
    } catch (err) {
      ztoolkit.log("Error adding readings:", err);
    }
  };

  const handleAddNote = async () => {
    if (!canAddNote) {
      return;
    }
    try {
      const created =
        classNumber == null
          ? await createStandaloneClassNote(collectionId)
          : await createAndAssignClassNote(collectionId, classNumber);
      if (created && onIdentifierClick) {
        // Select in Syllabus UI (blue highlight); Zotero select already ran.
        onIdentifierClick(created.note, created.assignmentId);
      }
    } catch (err) {
      ztoolkit.log("Error adding class note:", err);
    }
  };

  const handleAddSection = async () => {
    if (classNumber == null || isLocked) {
      return;
    }
    try {
      await SyllabusManager.addClassSection(collectionId, classNumber, "page");
    } catch (err) {
      ztoolkit.log("Error adding class section:", err);
    }
  };

  const handleSectionTitleSave = async (sectionId: string, title: string) => {
    if (classNumber == null) {
      return;
    }
    try {
      await SyllabusManager.setClassSectionMetadata(
        collectionId,
        classNumber,
        sectionId,
        { title },
        "page",
      );
    } catch (err) {
      ztoolkit.log("Error saving section title:", err);
    }
  };

  const handleSectionDescriptionSave = async (
    sectionId: string,
    description: string,
  ) => {
    if (classNumber == null) {
      return;
    }
    try {
      await SyllabusManager.setClassSectionMetadata(
        collectionId,
        classNumber,
        sectionId,
        { description },
        "page",
      );
    } catch (err) {
      ztoolkit.log("Error saving section description:", err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (classNumber == null) {
      return;
    }
    try {
      await SyllabusManager.removeClassSection(
        collectionId,
        classNumber,
        sectionId,
        "page",
      );
    } catch (err) {
      ztoolkit.log("Error removing section:", err);
    }
  };

  const handleMoveSection = async (
    sectionId: string,
    direction: "up" | "down",
  ) => {
    if (classNumber == null) {
      return;
    }
    try {
      await SyllabusManager.moveClassSection(
        collectionId,
        classNumber,
        sectionId,
        direction,
        "page",
      );
    } catch (err) {
      ztoolkit.log("Error moving section:", err);
    }
  };

  const { root: rootAssignments, sections: classSections } = useMemo(
    () =>
      partitionClassAssignmentsBySection(
        itemAssignments,
        classNumber != null ? classMeta : undefined,
      ),
    [itemAssignments, classNumber, classMeta],
  );

  /** Cumulative card-index offsets so section sortables stay contiguous. */
  const sectionIndexOffsets = useMemo(() => {
    const offsets: number[] = [];
    let running = rootAssignments.length;
    for (const section of classSections) {
      offsets.push(running);
      running += section.rows.length;
    }
    return offsets;
  }, [rootAssignments.length, classSections]);

  const renderAssignmentCards = (
    rows: typeof itemAssignments,
    indexOffset = 0,
    sectionId?: string,
  ) =>
    rows.map(({ item, assignment }, index) => {
      if (!assignment.id) {
        ztoolkit.log(
          "Warning: Assignment missing ID, skipping render",
          assignment,
        );
        return null;
      }
      const uniqueKey = `${item.id}-assignment-${assignment.id}`;
      const cardIdentifier = `assignment:${assignment.id}`;
      return (
        <SyllabusDndSortable
          key={uniqueKey}
          identifier={cardIdentifier}
          index={indexOffset + index}
          group={syllabusDndGroup(classNumber, undefined, sectionId)}
          draggingIdentifiers={draggingIdentifiers}
        >
          <SyllabusItemCard
            item={item}
            collectionId={collectionId}
            classNumber={classNumber ?? undefined}
            assignment={assignment}
            slim={true}
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
              onDrop(
                e,
                classNumber ?? null,
                item.id,
                insertBefore,
                sectionId ? { sectionId } : undefined,
              )
            }
            onDragOver={handleItemDragOver}
            dropEdge={
              chromeDnd
                ? null
                : visibleDropIndicator?.identifier === cardIdentifier
                  ? visibleDropIndicator.edge
                  : null
            }
            isZoteroSelected={selectedItemIds?.includes(item.id) || false}
            isIdentifierSelected={selectedIdentifiers.has(cardIdentifier)}
          />
        </SyllabusDndSortable>
      );
    });

  const renderLockedLayoutRows = (rows: typeof itemAssignments) => (
    <ReadingItemsLayout
      layout={layout}
      density={density}
      readerMode={readerMode}
      isLocked
      template="strip"
      magazinePacking={magazinePacking}
      colorFilterScope={colorFilterScope || String(collectionId)}
      showItemsWithoutAnnotations={showItemsWithoutAnnotations}
      annotationStreamOrder={annotationStreamOrder}
      rows={rows
        .filter(({ assignment }) => !!assignment.id)
        .map(({ item, assignment }) => ({
          key: `${item.id}-assignment-${assignment.id}`,
          item,
          collectionId,
          assignment,
          classNumber,
        }))}
      onItemClick={(item, _collectionId, e) => {
        const el = e?.currentTarget as HTMLElement | null;
        const identifier = el?.getAttribute?.("data-syllabus-identifier") || "";
        const assignmentId = identifier.startsWith("assignment:")
          ? identifier.slice("assignment:".length)
          : rows.find((row) => row.item.id === item.id)?.assignment.id;
        if (onIdentifierClick) {
          onIdentifierClick(item, assignmentId, e);
          return;
        }
        void selectItemInCollection(item, collectionId);
      }}
    />
  );

  const sectionDropzoneHint = (sectionId: string) => (
    <SyllabusDndZone
      group={syllabusDndGroup(classNumber, undefined, sectionId)}
      empty
      // Beat sibling class-root empty zones when the pointer is over a section.
      collisionPriority={80}
      className={twMerge(
        "syllabus-class-section-dropzone box-border! rounded-md group/section-items",
        "text-center bg-quinary/50 text-secondary border-2 border-dashed border-quinary in-[.print]:hidden",
        "data-[dropzone-active='true']:bg-accent-blue/15! data-[dropzone-active='true']:border-accent-blue! data-[dropzone-active='true']:text-accent-blue!",
        "group-data-[dropzone-active=true]/section-items:bg-accent-blue/15 group-data-[dropzone-active=true]/section-items:border-accent-blue group-data-[dropzone-active=true]/section-items:text-accent-blue",
        density !== "expanded" ? "p-3" : "p-5",
      )}
      onDrop={
        isLocked
          ? undefined
          : (e) => {
              void onDrop(e, classNumber ?? null, undefined, undefined, {
                sectionId,
              });
            }
      }
      onDragOver={
        isLocked
          ? undefined
          : (e) => {
              onDragOver(e);
              if (!isOsFileDrag(e.dataTransfer)) {
                (e.currentTarget as HTMLElement).dataset.dropzoneActive =
                  "true";
              }
            }
      }
      onDragLeave={
        isLocked
          ? undefined
          : (e) => {
              onDragLeave(e);
              delete (e.currentTarget as HTMLElement).dataset.dropzoneActive;
            }
      }
    >
      {getString("class-section-dropzone-hint")}
    </SyllabusDndZone>
  );

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
    if (!chromeDnd) {
      updateDropIndicatorFromY(e.clientY, e.currentTarget);
    }
  };

  const handleItemDragOver = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    // Keep dropzone effectAllowed / preventDefault behavior from the page.
    onDragOver(e);
    if (isOsFileDrag(e.dataTransfer)) {
      return;
    }
    if (chromeDnd) {
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
      dropIndicator.zone === "further-reading" ||
      dropIndicator.classNumber !== classNumberKey ||
      itemAssignments.length === 0
    ) {
      return null;
    }
    const dragSourceKey =
      classNumber != null && classNumber !== undefined
        ? classNumber
        : "unnumbered";
    const sameClass = draggingSourceClass === dragSourceKey;
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

  // Generate ID for TOC navigation / deep links from Home
  const tocId =
    classNumber != null ? `toc-class-${classNumber}` : "toc-class-unnumbered";

  // Empty unnumbered: thin in-band hint while dragging (idle layout stays put).
  const unnumberedDragDropzone =
    !isLocked &&
    classNumber == null &&
    itemAssignments.length === 0 &&
    draggingIdentifiers.size > 0;

  return (
    <div
      id={tocId}
      data-tour="syllabus-class-group"
      data-syllabus-file-drop={isLocked ? undefined : "class"}
      data-syllabus-class-number={
        isLocked
          ? undefined
          : classNumber == null
            ? "null"
            : String(classNumber)
      }
      className={twMerge(
        "syllabus-class-group group/class in-[.print]:scheme-light",
        readerMode && classIsDone ? "opacity-40" : "",
        classNumber == null &&
          itemAssignments.length === 0 &&
          "in-[.print]:hidden",
      )}
    >
      {classNumber ? (
        <>
          <div
            className={twMerge(
              "group/class-heading relative sticky z-35 bg-background py-1 in-[.print]:static top-10",
              isZotero8OrLater() ? "md:pt-8" : "pt-8",
            )}
          >
            {!isLocked && (
              <div className="absolute left-0 right-0 top-1.5 flex items-center gap-2 opacity-0 group-hover/class-heading:opacity-100 focus-within:opacity-100 transition-opacity in-[.print]:hidden pointer-events-none">
                <span className="flex-1 h-px bg-quinary" />
                <button
                  type="button"
                  className="pointer-events-auto inline-flex items-center gap-1 shrink-0 text-xs text-secondary hover:text-primary cursor-pointer bg-transparent border-0 p-0"
                  onClick={handleInsertClassBefore}
                  title={getString("class-insert-here", {
                    args: { nomenclature: singular },
                  })}
                  aria-label={getString("class-insert-here", {
                    args: { nomenclature: singular },
                  })}
                >
                  <Plus size={12} />
                  {getString("class-insert-here", {
                    args: { nomenclature: singular },
                  })}
                </button>
                <span className="flex-1 h-px bg-quinary" />
              </div>
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
                    <div
                      className={twMerge(
                        "flex-row items-baseline gap-1",
                        "hidden group-hover/class:inline-flex group-focus-within/class:inline-flex",
                      )}
                    >
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="container-padded">
            <div
              className={twMerge(
                density !== "expanded" ? "text-base mb-3" : "text-lg pt-2 mb-4",
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
      ) : !isLocked && hasManualOrder ? (
        <div className="container-padded flex flex-row justify-end in-[.print]:hidden">
          <button
            type="button"
            className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex flex-row items-center justify-center w-8 h-8"
            onClick={handleResetSortOrder}
            title={getString("class-reset-sort")}
            aria-label={getString("class-reset-sort")}
          >
            <div className="text-lg text-center">⇅</div>
          </button>
        </div>
      ) : null}
      <div
        className={twMerge(
          !isLocked ||
            layout === "card" ||
            layout === "annotations" ||
            layout === "magazine"
            ? "container-padded"
            : "w-full min-w-0 max-w-full",
          unnumberedDragDropzone && "relative",
        )}
      >
        {/* Match thin unnumbered hint height so drag doesn’t push/collapse. */}
        {unnumberedDragDropzone ? (
          <div
            className="invisible pointer-events-none w-full py-1.5 px-3 border-2 border-transparent text-sm in-[.print]:hidden"
            aria-hidden="true"
          >
            {getString("unnumbered-dropzone-hint")}
          </div>
        ) : null}
        <SyllabusDndZone
          group={syllabusDndGroup(classNumber)}
          empty={itemAssignments.length === 0 && classSections.length === 0}
          className={twMerge(
            "syllabus-class-items box-border! rounded-lg group/class-items",
            // Horizontal-only negative margin so dropzone outline can bleed;
            // keep real top margin as a breather after the class description.
            // Chrome DnD: gap is margin on .syllabus-personal-order-tile (gallery
            // pattern) — no space-y, or you get two blue lines in the gap.
            chromeDnd
              ? twMerge(
                  "syllabus-dnd-item-list",
                  density !== "expanded"
                    ? "px-1 pb-1 -mx-1"
                    : "mt-2 px-2 pb-2 -mx-2",
                )
              : density !== "expanded"
                ? "px-1 pb-1 -mx-1"
                : "mt-2 px-2 pb-2 -mx-2",
            // Filled lists: outline only while a drop is active. A persistent
            // transparent dashed outline still paints faintly in Gecko.
            itemAssignments.length > 0 &&
              "data-[dropzone-active='true']:bg-accent-blue/15! data-[dropzone-active='true']:outline-2! data-[dropzone-active='true']:outline-dashed! data-[dropzone-active='true']:outline-accent-blue! data-[dropzone-active='true']:text-accent-blue! transition-colors duration-200",
            // Sit on the unnumbered band (not above Add link).
            unnumberedDragDropzone &&
              "absolute left-0 right-0 top-0 z-30 mx-0! mt-0! px-1! pb-0!",
          )}
          data-density={
            chromeDnd && density !== "expanded" ? "compact" : undefined
          }
          onDrop={
            isLocked
              ? undefined
              : (e) => {
                  if (
                    dropIndicator &&
                    dropIndicator.zone !== "further-reading" &&
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
                        target.assignment.sectionId
                          ? { sectionId: target.assignment.sectionId }
                          : undefined,
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
          {!isLocked &&
          itemAssignments.length === 0 &&
          classSections.length === 0 &&
          // Numbered classes: always. Unnumbered top: only while dragging.
          (classNumber !== null || unnumberedDragDropzone) ? (
            <div
              className={twMerge(
                // border-quinary (not tertiary/50): tertiary is ~30% white and
                // transition-colors from accent→tertiary flashes pure white in
                // Gecko when a class loses its last card as the drop ends.
                "syllabus-class-dropzone-hint text-center bg-quinary/50 rounded-md text-secondary border-2 border-dashed border-quinary in-[.print]:hidden",
                "group-data-[dropzone-active=true]/class-items:bg-accent-blue/15 group-data-[dropzone-active=true]/class-items:border-accent-blue group-data-[dropzone-active=true]/class-items:text-accent-blue",
                unnumberedDragDropzone
                  ? "py-1.5 px-3 text-sm"
                  : density !== "expanded"
                    ? "p-4"
                    : "p-8",
              )}
            >
              {classNumber !== null
                ? getString("class-dropzone-hint", {
                    args: {
                      nomenclature: singularCapitalized,
                      number: classNumber,
                    },
                  })
                : getString("unnumbered-dropzone-hint")}
            </div>
          ) : rootAssignments.length > 0 || classSections.length > 0 ? (
            <div
              className={twMerge(
                chromeDnd && !isLocked
                  ? "syllabus-personal-order-section"
                  : density !== "expanded"
                    ? "space-y-2"
                    : "space-y-4",
                !chromeDnd && !isZotero8OrLater() && "compat-space-y",
              )}
            >
              {isLocked && layout !== "card" ? (
                <>
                  {rootAssignments.length > 0
                    ? renderLockedLayoutRows(rootAssignments)
                    : null}
                  {classSections.map((section) => (
                    <div
                      key={section.sectionId}
                      className="syllabus-class-section flex flex-col gap-2 pt-3 w-full min-w-0"
                      data-section-id={section.sectionId}
                    >
                      <div className="w-full min-w-0">
                        <div
                          className={twMerge(
                            "w-full font-semibold text-primary",
                            density !== "expanded" ? "text-lg" : "text-xl",
                          )}
                        >
                          {section.meta.title?.trim() ||
                            getString("class-section-title-placeholder")}
                        </div>
                        {section.meta.description?.trim() ? (
                          <div
                            className={twMerge(
                              density !== "expanded"
                                ? "text-base mt-1"
                                : "text-lg mt-2",
                            )}
                          >
                            <div className="w-full text-primary">
                              {section.meta.description}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {section.rows.length > 0
                        ? renderLockedLayoutRows(section.rows)
                        : null}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {!isLocked &&
                  rootAssignments.length === 0 &&
                  classSections.length > 0 ? (
                    // Distinct group id (`class:N:root`) so this empty zone does
                    // not collide with the outer class list droppable id.
                    <SyllabusDndZone
                      group={`${syllabusDndGroup(classNumber)}:root`}
                      empty
                      className={twMerge(
                        "syllabus-class-root-dropzone box-border! rounded-md group/root-items",
                        "text-center bg-quinary/50 text-secondary border-2 border-dashed border-quinary in-[.print]:hidden",
                        "data-[dropzone-active='true']:bg-accent-blue/15! data-[dropzone-active='true']:border-accent-blue! data-[dropzone-active='true']:text-accent-blue!",
                        density !== "expanded" ? "p-3" : "p-5",
                      )}
                      onDrop={(e) => {
                        void onDrop(e, classNumber ?? null);
                      }}
                      onDragOver={(e) => {
                        onDragOver(e);
                        if (!isOsFileDrag(e.dataTransfer)) {
                          (
                            e.currentTarget as HTMLElement
                          ).dataset.dropzoneActive = "true";
                        }
                      }}
                      onDragLeave={(e) => {
                        onDragLeave(e);
                        delete (e.currentTarget as HTMLElement).dataset
                          .dropzoneActive;
                      }}
                    >
                      {classNumber != null
                        ? getString("class-dropzone-hint", {
                            args: {
                              nomenclature: singularCapitalized,
                              number: classNumber,
                            },
                          })
                        : getString("unnumbered-dropzone-hint")}
                    </SyllabusDndZone>
                  ) : rootAssignments.length > 0 ? (
                    renderAssignmentCards(rootAssignments, 0)
                  ) : null}
                  {classSections.map((section, sectionIndex) => {
                    const sectionIndexOffset =
                      sectionIndexOffsets[sectionIndex] ?? 0;
                    const canMoveSectionUp = sectionIndex > 0;
                    const canMoveSectionDown =
                      sectionIndex < classSections.length - 1;
                    return (
                      <div
                        key={section.sectionId}
                        className="syllabus-class-section flex flex-col gap-2 pt-3 w-full min-w-0"
                        data-section-id={section.sectionId}
                      >
                        <div className="w-full min-w-0">
                          <div className="flex items-baseline gap-2 w-full">
                            <div
                              className={twMerge(
                                "min-w-0 flex-1 font-semibold",
                                density !== "expanded" ? "text-lg" : "text-xl",
                              )}
                            >
                              <TextInput
                                elementType="input"
                                initialValue={section.meta.title || ""}
                                onSave={(title) =>
                                  void handleSectionTitleSave(
                                    section.sectionId,
                                    title,
                                  )
                                }
                                className="w-full px-0! mx-0! text-primary"
                                placeholder={getString(
                                  "class-section-title-placeholder",
                                )}
                                emptyBehavior="reset"
                                readOnly={isLocked}
                              />
                            </div>
                            {!isLocked ? (
                              <div className="shrink-0 inline-flex flex-row items-baseline gap-0.5 in-[.print]:hidden opacity-0 group-hover/class:opacity-100 focus-within:opacity-100">
                                <button
                                  type="button"
                                  className="bg-transparent border-none rounded cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex items-center justify-center w-8 h-8 disabled:opacity-30 disabled:cursor-not-allowed"
                                  onClick={() =>
                                    void handleMoveSection(
                                      section.sectionId,
                                      "up",
                                    )
                                  }
                                  disabled={!canMoveSectionUp}
                                  title={getString("class-section-move-up")}
                                  aria-label={getString(
                                    "class-section-move-up",
                                  )}
                                >
                                  <ChevronUp size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="bg-transparent border-none rounded cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex items-center justify-center w-8 h-8 disabled:opacity-30 disabled:cursor-not-allowed"
                                  onClick={() =>
                                    void handleMoveSection(
                                      section.sectionId,
                                      "down",
                                    )
                                  }
                                  disabled={!canMoveSectionDown}
                                  title={getString("class-section-move-down")}
                                  aria-label={getString(
                                    "class-section-move-down",
                                  )}
                                >
                                  <ChevronDown size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="bg-transparent border-none rounded cursor-pointer hover:bg-red-500/15 text-secondary hover:text-red-400 inline-flex items-center justify-center w-8 h-8"
                                  onClick={() =>
                                    void handleDeleteSection(section.sectionId)
                                  }
                                  title={getString("class-section-delete")}
                                  aria-label={getString(
                                    "class-section-delete-aria",
                                  )}
                                >
                                  <span className="text-2xl leading-none">
                                    ×
                                  </span>
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div
                            className={twMerge(
                              density !== "expanded"
                                ? "text-base mt-1"
                                : "text-lg mt-2",
                            )}
                          >
                            <TextInput
                              elementType="textarea"
                              initialValue={section.meta.description || ""}
                              onSave={(description) =>
                                void handleSectionDescriptionSave(
                                  section.sectionId,
                                  description,
                                )
                              }
                              className="w-full px-0! mx-0! text-primary"
                              placeholder={getString(
                                "class-section-description-placeholder",
                              )}
                              emptyBehavior="reset"
                              fieldSizing="content"
                              readOnly={isLocked}
                            />
                          </div>
                        </div>
                        {section.rows.length > 0 ? (
                          <SyllabusDndZone
                            group={syllabusDndGroup(
                              classNumber,
                              undefined,
                              section.sectionId,
                            )}
                            empty={false}
                            className={twMerge(
                              chromeDnd
                                ? "syllabus-personal-order-section"
                                : density !== "expanded"
                                  ? "space-y-2"
                                  : "space-y-4",
                            )}
                            onDrop={
                              isLocked
                                ? undefined
                                : (e) => {
                                    if (
                                      dropIndicator &&
                                      dropIndicator.zone !==
                                        "further-reading" &&
                                      dropIndicator.classNumber ===
                                        classNumberKey
                                    ) {
                                      const target = section.rows.find(
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
                                          { sectionId: section.sectionId },
                                        );
                                        return;
                                      }
                                    }
                                    void onDrop(
                                      e,
                                      classNumber ?? null,
                                      undefined,
                                      undefined,
                                      { sectionId: section.sectionId },
                                    );
                                  }
                            }
                            onDragOver={
                              isLocked ? undefined : handleItemsDragOver
                            }
                            onDragLeave={
                              isLocked ? undefined : handleItemsDragLeave
                            }
                          >
                            {renderAssignmentCards(
                              section.rows,
                              sectionIndexOffset,
                              section.sectionId,
                            )}
                          </SyllabusDndZone>
                        ) : !isLocked ? (
                          sectionDropzoneHint(section.sectionId)
                        ) : null}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : null}
          {!isLocked && !unnumberedDragDropzone && (
            <div className="flex items-center justify-center gap-2 w-full opacity-0 group-hover/class:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 transition-opacity in-[.print]:hidden p-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-xs text-secondary hover:text-primary"
                onClick={() => {
                  void handleAddReadings();
                }}
                title={
                  classNumber != null
                    ? getString("class-add-readings-aria", {
                        args: {
                          nomenclature: singularCapitalized,
                          number: classNumber,
                        },
                      })
                    : getString("unnumbered-add-readings-aria")
                }
                aria-label={
                  classNumber != null
                    ? getString("class-add-readings-aria", {
                        args: {
                          nomenclature: singularCapitalized,
                          number: classNumber,
                        },
                      })
                    : getString("unnumbered-add-readings-aria")
                }
              >
                <span
                  className="syllabus-class-add-icon syllabus-class-add-icon-item"
                  aria-hidden="true"
                />
                {getString("class-add-readings")}
              </button>
              {canAddNote ? (
                <>
                  <span
                    className="text-xs text-tertiary select-none"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-xs text-secondary hover:text-primary"
                    onClick={() => {
                      void handleAddNote();
                    }}
                    title={
                      classNumber != null
                        ? getString("class-add-note")
                        : getString("unnumbered-add-note-aria")
                    }
                    aria-label={
                      classNumber != null
                        ? getString("class-add-note")
                        : getString("unnumbered-add-note-aria")
                    }
                  >
                    <span
                      className="syllabus-class-add-icon syllabus-class-add-icon-note"
                      aria-hidden="true"
                    />
                    {getString("class-add-note")}
                  </button>
                </>
              ) : null}
              {classNumber != null ? (
                <>
                  <span
                    className="text-xs text-tertiary select-none"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-xs text-secondary hover:text-primary"
                    onClick={() => {
                      void handleAddSection();
                    }}
                    title={getString("class-add-section-aria", {
                      args: {
                        nomenclature: singularCapitalized,
                        number: classNumber,
                      },
                    })}
                    aria-label={getString("class-add-section-aria", {
                      args: {
                        nomenclature: singularCapitalized,
                        number: classNumber,
                      },
                    })}
                  >
                    <Plus size={12} aria-hidden="true" />
                    {getString("class-add-section")}
                  </button>
                </>
              ) : null}
            </div>
          )}
        </SyllabusDndZone>
      </div>
    </div>
  );
}
