// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  generateFallbackBibliographicReference,
  generateBibliographicReference,
} from "../utils/cite";
import { getPref, setPref } from "../utils/prefs";
import { getCSSUrl } from "../utils/css";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useZoteroSelectedItemId } from "./react-zotero-sync/selectedItem";
import {
  getItemReadStatusName,
  getReadStatusMetadata,
} from "../zotero-reading-list/compat";
import { useDebouncedEffect } from "../utils/react/useDebouncedEffect";
import { useElementSize } from "../utils/react/useElementSize";
import slugify from "slugify";

// Define priority type for use in this file
// These values match SyllabusPriority enum in syllabus.ts
type SyllabusPriorityType =
  | "course-info"
  | "essential"
  | "recommended"
  | "optional";

interface SyllabusPageProps {
  collectionId: number;
}

export function SyllabusPage({ collectionId }: SyllabusPageProps) {
  // Sync with external Zotero stores using hooks
  const [title, setTitle] = useZoteroCollectionTitle(collectionId);
  const [syllabusMetadata, setDescription, setClassDescription, setClassTitle] =
    useZoteroSyllabusMetadata(collectionId);
  const items = useZoteroCollectionItems(collectionId);

  // Track drag state for showing "Add to Class X" dropzone
  const [isDragging, setIsDragging] = useState(false);

  // Compact mode state
  const [compactMode, setCompactModeState] = useState(
    getPref("compactMode") || false,
  );

  // Ref for the syllabus page container to access DOM for printing
  const syllabusPageRef = useRef<HTMLDivElement>(null);

  const toggleCompactMode = () => {
    const newValue = !compactMode;
    setCompactModeState(newValue);
    setPref("compactMode", newValue);
  };

  // Set up global drag event listeners
  useEffect(() => {
    const handleGlobalDragStart = (e: DragEvent) => {
      // Only track drags that originate from syllabus items
      const target = e.target as HTMLElement;
      if (target?.closest?.(".syllabus-item[draggable='true']")) {
        setIsDragging(true);
      }
    };

    const handleGlobalDragEnd = () => {
      setIsDragging(false);
    };

    const handleGlobalDrop = () => {
      // Reset drag state when drop occurs
      setIsDragging(false);
    };

    // Listen to drag events on the document
    document.addEventListener("dragstart", handleGlobalDragStart);
    document.addEventListener("dragend", handleGlobalDragEnd);
    document.addEventListener("drop", handleGlobalDrop);

    return () => {
      document.removeEventListener("dragstart", handleGlobalDragStart);
      document.removeEventListener("dragend", handleGlobalDragEnd);
      document.removeEventListener("drop", handleGlobalDrop);
    };
  }, []);

  // Compute class groups and further reading items from synced items
  // Re-compute when items change
  const { classGroups, furtherReadingItems } = useMemo(() => {
    const furtherReading: Zotero.Item[] = [];
    // Track items with their specific assignments to support multiple assignments per class
    const itemsByClass: Map<
      number | null,
      Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>
    > = new Map();

    for (const item of items) {
      if (!item.isRegularItem()) continue;

      // Get all class assignments for this item
      const assignments = SyllabusManager.getAllClassAssignments(
        item,
        collectionId,
      );

      // If no assignments or all assignments are empty, add to further reading
      if (
        assignments.length === 0 ||
        assignments.every(
          (a) =>
            !a.priority && !a.classInstruction && a.classNumber === undefined,
        )
      ) {
        furtherReading.push(item);
        continue;
      }

      // Add item with each assignment to each class it's assigned to (supporting repeat inclusions)
      for (const assignment of assignments) {
        // Skip empty assignments
        if (
          !assignment.priority &&
          !assignment.classInstruction &&
          assignment.classNumber === undefined
        ) {
          continue;
        }

        const normalizedClassNumber =
          assignment.classNumber === undefined ? null : assignment.classNumber;
        if (!itemsByClass.has(normalizedClassNumber)) {
          itemsByClass.set(normalizedClassNumber, []);
        }
        itemsByClass.get(normalizedClassNumber)!.push({ item, assignment });
      }
    }

    // Get min/max class range from items and metadata
    const range = SyllabusManager.getClassNumberRange(
      collectionId,
      syllabusMetadata,
    );

    ztoolkit.log("Range:", range, syllabusMetadata);

    // Generate all class numbers in the range (even if empty)
    const allClassNumbers: (number | null)[] = [];
    if (range.min !== null && range.max !== null) {
      for (let i = range.min; i <= range.max; i++) {
        allClassNumbers.push(i);
      }
    }

    // Add classes that have items but are outside the range (for null classNumber)
    const sortedClassNumbers = Array.from(itemsByClass.keys()).sort((a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      return a - b;
    });

    // Merge: use allClassNumbers as base, but ensure we include any classes with items
    const finalClassNumbers = new Set<number | null>();
    for (const num of allClassNumbers) {
      finalClassNumbers.add(num);
    }
    for (const num of sortedClassNumbers) {
      finalClassNumbers.add(num);
    }

    const sortedFinalClassNumbers = Array.from(finalClassNumbers).sort(
      (a, b) => {
        if (a === null && b === null) return 0;
        if (a === null) return -1;
        if (b === null) return 1;
        return a - b;
      },
    );

    // Sort items within each class by manual order or natural order
    for (const classNumber of sortedFinalClassNumbers) {
      let classItemAssignments = itemsByClass.get(classNumber) || [];

      // Get manual ordering from preferences
      const manualOrder = SyllabusManager.getClassItemOrder(
        collectionId,
        classNumber,
      );

      if (manualOrder.length > 0) {
        // Apply manual ordering
        const itemMap = new Map(
          classItemAssignments.map((entry) => [String(entry.item.id), entry]),
        );
        const orderedItems: Array<{
          item: Zotero.Item;
          assignment: ItemSyllabusAssignment;
        }> = [];
        const unorderedItems: Array<{
          item: Zotero.Item;
          assignment: ItemSyllabusAssignment;
        }> = [];

        // Add items in manual order
        for (const itemId of manualOrder) {
          const entry = itemMap.get(itemId);
          if (entry) {
            orderedItems.push(entry);
            itemMap.delete(itemId);
          }
        }

        // Add remaining items that weren't in manual order
        itemMap.forEach((entry) => unorderedItems.push(entry));

        // Sort unordered items by natural order (class number, then priority, then title)
        unorderedItems.sort((a, b) => {
          // First compare by assignment (class number, then priority)
          const assignmentDiff = SyllabusManager.compareAssignments(
            a.assignment,
            b.assignment,
          );
          if (assignmentDiff !== 0) return assignmentDiff;

          // Then by title
          const titleA = a.item.getField("title") || "";
          const titleB = b.item.getField("title") || "";
          return titleA.localeCompare(titleB);
        });

        classItemAssignments = [...orderedItems, ...unorderedItems];
      } else {
        // Natural order: by class number, then priority, then title
        classItemAssignments.sort((a, b) => {
          // First compare by assignment (class number, then priority)
          const assignmentDiff = SyllabusManager.compareAssignments(
            a.assignment,
            b.assignment,
          );
          if (assignmentDiff !== 0) return assignmentDiff;

          // Then by title
          const titleA = a.item.getField("title") || "";
          const titleB = b.item.getField("title") || "";
          return titleA.localeCompare(titleB);
        });
      }

      itemsByClass.set(classNumber, classItemAssignments);
    }

    // Sort further reading by title
    furtherReading.sort((a, b) => {
      const titleA = a.getField("title") || "";
      const titleB = b.getField("title") || "";
      return titleA.localeCompare(titleB);
    });

    return {
      classGroups: sortedFinalClassNumbers.map((classNumber) => ({
        classNumber,
        itemAssignments: itemsByClass.get(classNumber) || [],
      })),
      furtherReadingItems: furtherReading,
    };
  }, [items, collectionId, syllabusMetadata]);

  const handleDrop = async (
    e: JSX.TargetedDragEvent<HTMLElement>,
    targetClassNumber: number | null,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Remove the dropzone active class after drop
    // e.currentTarget.classList.remove("syllabus-dropzone-active");
    const allDropzones = Array.from(
      document.querySelectorAll<HTMLElement>("[data-dropzone-active='true']"),
    ) as HTMLElement[];
    for (const dropzone of allDropzones) {
      if (dropzone?.dataset?.dropzoneActive) {
        dropzone.dataset.dropzoneActive = "false";
      }
    }
    e.currentTarget.dataset.dropzoneActive = "false";

    if (!e.dataTransfer) return;
    const itemIdStr = e.dataTransfer.getData("text/plain");
    if (!itemIdStr) return;

    const itemId = parseInt(itemIdStr, 10);
    if (isNaN(itemId)) return;

    try {
      const draggedItem = Zotero.Items.get(itemId);
      if (!draggedItem || !draggedItem.isRegularItem()) return;

      const targetClassNumberValue =
        targetClassNumber === null ? undefined : targetClassNumber;

      // Get source assignment ID from drag data (if dragging from a class)
      const sourceAssignmentId = e.dataTransfer.getData(
        "application/x-syllabus-assignment-id",
      );

      // Get all existing assignments
      const assignments = SyllabusManager.getAllClassAssignments(
        draggedItem,
        collectionId,
      );

      // If dropping to a specific class number, ensure it exists in metadata
      if (targetClassNumberValue !== undefined) {
        const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
        if (!metadata.classes || !metadata.classes[targetClassNumberValue]) {
          // Auto-create the class metadata entry
          await SyllabusManager.createAdditionalClass(
            collectionId,
            targetClassNumberValue,
            "page",
          );
        }
      }

      if (sourceAssignmentId) {
        // Dragging from a class or "further reading" with an assignment: MOVE it
        // Update the assignment's classNumber using its ID
        // If target is undefined (dropping to "further reading"), remove classNumber
        await SyllabusManager.updateClassAssignment(
          draggedItem,
          collectionId,
          sourceAssignmentId,
          { classNumber: targetClassNumberValue },
          "page",
        );
      } else {
        // Dragging from "further reading" with NO assignment: create a new assignment (COPY)
        // Only create if we're dropping to a specific class (targetClassNumberValue is defined)
        if (targetClassNumberValue !== undefined) {
          ztoolkit.log("Creating new assignment for unassigned item:", {
            itemId: draggedItem.id,
            collectionId,
            targetClassNumber: targetClassNumberValue,
            existingAssignments: assignments.length,
          });

          // Create a new assignment for the target class
          await SyllabusManager.addClassAssignment(
            draggedItem,
            collectionId,
            targetClassNumberValue,
            {},
            "page",
          );

          ztoolkit.log("Assignment created successfully");
        } else {
          // Dropping to "further reading" with no assignment - nothing to do
          ztoolkit.log(
            "Dropping unassigned item to further reading - no action needed",
          );
        }
      }

      await draggedItem.saveTx();
    } catch (err) {
      ztoolkit.log("Error handling drop:", err);
    }
  };

  const handleDragOver = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    // e.currentTarget.classList.add("syllabus-dropzone-active");
    e.currentTarget.dataset.dropzoneActive = "true";
  };

  const handleDragLeave = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    // Only remove the class if we're actually leaving the drop zone
    // (not just moving to a child element)
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      // e.currentTarget.classList.remove("syllabus-dropzone-active");
      e.currentTarget.dataset.dropzoneActive = "false";
    }
  };

  const nextClassNumber = useMemo(() => {
    const range = SyllabusManager.getClassNumberRange(
      collectionId,
      syllabusMetadata,
    );

    const nextClassNumber =
      range.max !== null ? range.max + 1 : range.min !== null ? range.min : 1;

    return nextClassNumber;
  }, [collectionId, syllabusMetadata]);

  const handlePrint = async () => {
    try {
      // Get the syllabus page element
      const syllabusPageElement = syllabusPageRef.current;
      if (!syllabusPageElement) {
        ztoolkit.log("Syllabus page element not found");
        return;
      }

      // Read CSS files
      const readCSS = (url: string): Promise<string> => {
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 0) {
              resolve(xhr.responseText);
            } else {
              ztoolkit.log(`Failed to load CSS from ${url}: ${xhr.status}`);
              resolve(""); // Return empty string on error
            }
          };
          xhr.onerror = () => {
            ztoolkit.log(`Error loading CSS from ${url}`);
            resolve(""); // Return empty string on error
          };
          xhr.send();
        });
      };

      // Get CSS URLs (use getCSSUrl for Tailwind to include cache busting)
      const tailwindCSSUrl = getCSSUrl();
      const zoteroCSSUrl = `chrome://${addon.data.config.addonRef}/content/zoteroPane.css`;

      // Read both CSS files
      const [tailwindCSS, zoteroCSS] = await Promise.all([
        readCSS(tailwindCSSUrl),
        readCSS(zoteroCSSUrl),
      ]);

      // Create HTML content with inline CSS
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${(title || "Syllabus").replace(/"/g, "&quot;")}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 20px;
      color: #000;
      background: #fff;
    }
    @media print {
      body { margin: 0; padding: 10px; }
      .syllabus-page { overflow: visible !important; }
    }
    /* Apply print styles when .print class is present */
    body.print {
      margin: 0 !important;
      padding: 10px !important;
    }
    body.print .syllabus-page {
      overflow: visible !important;
    }
    ${tailwindCSS ? `/* Tailwind CSS */\n${tailwindCSS}` : ""}
    ${zoteroCSS ? `/* Zotero CSS */\n${zoteroCSS}` : ""}
  </style>
  <script>
    // Always apply .print class to enable print styles in browser view
    document.body.classList.add('print');
  </script>
</head>
<body class="print">
  ${syllabusPageElement.innerHTML}
</body>
</html>`;

      // Create a temporary file and open it
      const tempDir = Zotero.getTempDirectory();
      const tempFile = tempDir.clone();
      tempFile.append(
        `printable-syllabus--${slugify(title) || "syllabus"}.html`,
      );
      // NORMAL_FILE_TYPE = 0
      tempFile.createUnique(0, 0o666);

      // Write content to file using Zotero.File
      const fileObj = Zotero.File.pathToFile(tempFile.path);
      await Zotero.File.putContentsAsync(fileObj, htmlContent, "utf-8");

      // Open the file in the default external browser using reveal()
      // This will open HTML files with the system's default browser
      fileObj.reveal();
    } catch (err) {
      ztoolkit.log("Error printing syllabus:", err);
    }
  };

  return (
    <div
      ref={syllabusPageRef}
      className={twMerge(
        "syllabus-page overflow-y-auto overflow-x-hidden h-full in-[.print]:scheme-light",
        compactMode && "compact-mode",
      )}
    >
      <div className='pb-12'>
        <div
          syllabus-view-title-container
          className="sticky top-0 z-10 bg-background py-1 md:pt-8 in-[.print]:static"
        >
          <div className="container-padded bg-background">
            <div className="flex flex-row items-center gap-4 justify-between">
              <div className="flex-1 text-3xl font-semibold grow shrink-0">
                <TextInput
                  elementType="input"
                  initialValue={title || ""}
                  onSave={setTitle}
                  emptyBehavior="reset"
                  placeholder="Add a title..."
                  className="w-full px-0! mx-0!"
                />
              </div>
              <div className="inline-flex items-center gap-2 shrink grow-0">
                <button
                  onClick={toggleCompactMode}
                  className={twMerge(
                    "grow-0 shrink-0 cursor-pointer flex items-center gap-2 in-[.print]:hidden",
                  )}
                  title={
                    compactMode ? "Disable compact mode" : "Enable compact mode"
                  }
                  aria-label={
                    compactMode ? "Disable compact mode" : "Enable compact mode"
                  }
                >
                  <span aria-hidden="true">📐</span>
                  <span className={compactMode ? "font-semibold" : ""}>
                    {compactMode ? "Normal" : "Compact"}
                  </span>
                </button>
                <button
                  onClick={handlePrint}
                  className="grow-0 shrink-0 cursor-pointer flex items-center gap-2 in-[.print]:hidden"
                  title="Print the list in Syllabus view as a PDF"
                  aria-label="Print the list in Syllabus view as a PDF"
                >
                  <span aria-hidden="true">🖨️</span>
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-padded">
          <div className={twMerge("py-2", compactMode ? "text-base" : "text-lg")}>
            <TextInput
              elementType="textarea"
              initialValue={syllabusMetadata.description || ""}
              onSave={setDescription}
              syllabus-collection-description
              className="w-full px-0! mx-0! text-primary"
              placeholder="Add a description..."
              emptyBehavior="delete"
              fieldSizing="content"
            />
          </div>
        </div>

        <div
          className={twMerge(
            "flex flex-col mb-12",
            compactMode ? "gap-8 mt-4" : "gap-12 mt-6",
          )}
        >
          {classGroups.map((group) => (
            <ClassGroupComponent
              key={group.classNumber ?? "null"}
              classNumber={group.classNumber}
              itemAssignments={group.itemAssignments}
              collectionId={collectionId}
              syllabusMetadata={syllabusMetadata}
              onClassTitleSave={setClassTitle}
              onClassDescriptionSave={setClassDescription}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              compactMode={compactMode}
            />
          ))}
        </div>

        <div className="container-padded">
          {isDragging && !compactMode && (
            <div className="syllabus-class-group syllabus-add-class-dropzone in-[.print]:hidden">
              <div className="syllabus-class-header-container">
                <div className="syllabus-class-header">
                  Add to Class {nextClassNumber}
                </div>
              </div>
              <div
                className="syllabus-class-items syllabus-add-class-dropzone-items"
                onDrop={(e) => handleDrop(e, nextClassNumber)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="syllabus-add-class-dropzone-placeholder bg-quinary rounded-md p-16 text-secondary border-2 border-dashed border-secondary">
                  Drop item here to create Class {nextClassNumber}
                </div>
              </div>
            </div>
          )}

          <div className="syllabus-create-class-control in-[.print]:hidden">
            <button
              className="syllabus-create-class-button"
              onClick={createAdditionalClass}
              title={`Add Class ${nextClassNumber}`}
            >
              Add Class {nextClassNumber}
            </button>
          </div>

          {furtherReadingItems.length > 0 && (
            <div className="syllabus-class-group in-[.print]:scheme-light">
              <div
                className={twMerge(
                  "font-semibold",
                  compactMode ? "text-xl mt-8 mb-2" : "text-2xl mt-12 mb-4",
                )}
              >
                Further reading
              </div>
              {!compactMode && (
                <p className="text-secondary text-lg">
                  Items in this section have not been assigned to any class.
                </p>
              )}
              <div
                className={compactMode ? "space-y-2" : "space-y-4"}
                onDrop={(e) => handleDrop(e, null)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {furtherReadingItems.map((item: Zotero.Item) => (
                  <SyllabusItemCard
                    key={item.id}
                    item={item}
                    collectionId={collectionId}
                    classNumber={undefined}
                    slim={true}
                    compactMode={compactMode}
                  />
                ))}
              </div>
            </div>
          )}

          <Bibliography items={items} compactMode={compactMode} />

        </div>
      </div>
    </div>
  );

  async function createAdditionalClass() {
    try {
      await SyllabusManager.createAdditionalClass(
        collectionId,
        nextClassNumber,
        "page",
      );
      // The store should update automatically via the Zotero notifier
      // when the preference changes. The useSyncExternalStore hook will
      // re-render when the store's getSnapshot returns new data.
    } catch (err) {
      ztoolkit.log("Error creating additional class:", err);
    }
  }
}

interface ClassGroupComponentProps {
  classNumber?: number | null;
  itemAssignments: Array<{
    item: Zotero.Item;
    assignment: ItemSyllabusAssignment;
  }>;
  collectionId: number;
  syllabusMetadata: {
    classes?: { [key: string]: { title?: string; description?: string } };
  };
  onClassTitleSave: (classNumber: number, title: string) => void;
  onClassDescriptionSave: (classNumber: number, description: string) => void;
  onDrop: (
    e: JSX.TargetedDragEvent<HTMLElement>,
    classNumber: number | null,
  ) => Promise<void>;
  onDragOver: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  onDragLeave: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  compactMode?: boolean;
}

function ClassGroupComponent({
  classNumber,
  itemAssignments,
  collectionId,
  syllabusMetadata,
  onClassTitleSave,
  onClassDescriptionSave,
  onDrop,
  onDragOver,
  onDragLeave,
  compactMode = false,
}: ClassGroupComponentProps) {
  // Get class title and description from metadata
  const classTitle = classNumber
    ? syllabusMetadata.classes?.[classNumber]?.title || ""
    : "";
  const classDescription = classNumber
    ? syllabusMetadata.classes?.[classNumber]?.description || ""
    : "";

  const handleDeleteClass = async () => {
    if (classNumber) {
      try {
        await SyllabusManager.deleteClass(collectionId, classNumber, "page");
      } catch (err) {
        ztoolkit.log("Error deleting class:", err);
      }
    }
  };

  return (
    <div className="syllabus-class-group in-[.print]:scheme-light">
      {classNumber && (
        <>
          <div
            className={twMerge(
              "sticky z-5 bg-background in-[.print]:static",
              compactMode ? "top-10 py-0" : "top-18 py-1",
            )}
          >
            <div
              className={twMerge(
                "container-padded rounded-xs",
                compactMode ? "py-0.5" : "py-1",
              )}
            >
              <div className="flex gap-2 items-baseline justify-start w-full">
                <div
                  className={twMerge(
                    "syllabus-class-header shrink-0 uppercase text-secondary font-semibold",
                    compactMode ? "text-sm" : "text-lg",
                  )}
                >
                  Class {classNumber}
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
                  />
                </div>
                <button
                  className="ml-auto! shrink-0 bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-red-500/15 text-secondary hover:text-red-400 inline-flex flex-row items-center justify-center w-8 in-[.print]:hidden"
                  onClick={handleDeleteClass}
                  title="Delete class"
                  aria-label="Delete class"
                >
                  <div className="text-2xl text-center">×</div>
                </button>
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
          )}
          onDrop={(e) => onDrop(e, classNumber ?? null)}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          {itemAssignments.length === 0 && classNumber !== null ? (
            <div
              className={twMerge(
                "text-center bg-quinary/50 rounded-md p-8 text-secondary border-2 border-dashed border-tertiary/50 in-[.print]:hidden",
                compactMode ? "p-4" : "p-8",
              )}
            >
              Drag items to Class {classNumber}
            </div>
          ) : (
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
                    compactMode ||
                    !priority ||
                    priority === SyllabusManager.priorityKeys.OPTIONAL
                  }
                  compactMode={compactMode}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function TextInput({
  initialValue,
  onSave,
  placeholder,
  elementType = "input",
  emptyBehavior = "reset",
  className,
  fieldSizing = "content",
  ...elementProps
}: {
  initialValue: string;
  onSave: (value: string) => void | Promise<void>;
  placeholder?: string;
  emptyBehavior?: "reset" | "delete";
  elementType?: "input" | "textarea";
  className?: string;
  fieldSizing?: "content" | "fixed" | "auto";
} & JSX.HTMLAttributes<HTMLInputElement | HTMLTextAreaElement>) {
  const [value, setValue] = useState(initialValue);

  function save(value: string) {
    onSave(emptyBehavior === "reset" ? value || initialValue : value);
  }

  useEffect(() => {
    // This means the global value has changed, so we need to update the local value
    setValue(initialValue);
  }, [initialValue]);

  useDebouncedEffect(
    () => {
      // Don't update the global API too often
      if (value !== initialValue) {
        save(value);
      }
    },
    [initialValue, value],
    500,
  );

  const [setSizeRef, size] = useElementSize();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (
      fieldSizing === "content" &&
      inputRef.current &&
      elementType === "textarea"
    ) {
      if (value) {
        // Set it to 1px so we can measure the scrollheight
        inputRef.current.style.height = "1px";
        const contentHeight = inputRef.current.scrollHeight;
        inputRef.current.style.height = contentHeight + "px";
        inputRef.current.removeAttribute("rows");
      } else {
        inputRef.current.style.height = "auto";
        inputRef.current.setAttribute("rows", "1");
      }
    }
  }, [value, fieldSizing, size, elementType]);

  return (
    <div ref={setSizeRef} className="w-full">
      {h(elementType, {
        ref: inputRef,
        type: "text",
        value,
        onChange: (
          e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => setValue((e.target as HTMLInputElement).value),
        onBlur: () => save(value),
        onKeyDown: (
          e: JSX.TargetedKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => {
          if (e.key === "Escape" || e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
            save(value);
          }
        },
        placeholder: placeholder || "Click to edit",
        className: twMerge(
          "bg-transparent border-none focus:outline-3 focus:outline-accent-blue focus:rounded-xs focus:outline-offset-2 field-sizing-content in-[.print]:hidden",
          className,
        ),
        style: {
          "--color-focus-border": "var(--color-accent-blue)",
        },
        ...elementProps,
      })}
      {/* Print-only div that shows the value */}
      <div
        className="hidden in-[.print]:block"
        style={{
          whiteSpace: elementType === "textarea" ? "pre-wrap" : "normal",
        }}
      >
        {value || initialValue || ""}
      </div>
    </div>
  );
}

interface SyllabusItemCardProps {
  item: Zotero.Item;
  collectionId: number;
  classNumber?: number | null; // Specific class number for this rendering
  assignment?: ItemSyllabusAssignment; // Specific assignment for this rendering (to differentiate multiple assignments)
  slim?: boolean;
  compactMode?: boolean;
}

function SyllabusItemCard({
  item,
  collectionId,
  classNumber,
  assignment,
  slim = false,
  compactMode = false,
}: SyllabusItemCardProps) {
  // Get the currently selected item ID
  const selectedItemId = useZoteroSelectedItemId();
  const isSelected = selectedItemId === item.id;

  // Get priority and class instruction from the assignment (if found)
  // When assignmentId is provided, these MUST come from that specific assignment
  const priority = assignment?.priority || "";
  const classInstruction = assignment?.classInstruction || "";
  const title = item.getField("title") || "Untitled";
  const itemTypeLabel = Zotero.ItemTypes.getLocalizedString(item.itemType);
  const creator = item.getCreators().length > 0 ? item.getCreator(0) : null;
  const author =
    item.firstCreator ||
    (creator && typeof creator !== "boolean"
      ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim()
      : "");
  const date = item.getField("date") || "";
  const publicationName =
    item.getField("publicationTitle") || item.getField("bookTitle") || "";
  const url = item.getField("url") || "";

  const [bibliographicReference, setBibliographicReference] = useState("");
  useEffect(() => {
    (async () => {
      if (slim) return;
      if (getPref("showBibliography")) {
        const ref = await generateBibliographicReference(item);
        setBibliographicReference(ref || "");
      }
    })();
  }, [item, slim]);

  const viewableAttachments = useMemo(() => {
    return item
      .getAttachments()
      .map((attId) => {
        try {
          const att = Zotero.Items.get(attId);
          if (att && att.isAttachment()) {
            const contentType = att.attachmentContentType || "";
            const linkMode = att.attachmentLinkMode;
            const path = att.attachmentPath?.toLowerCase() || "";
            if (contentType === "application/pdf" || path.endsWith(".pdf")) {
              return { item: att, type: "pdf" };
            }
            if (linkMode === 3) {
              return { item: att, type: "snapshot" };
            }
            if (
              contentType === "application/epub+zip" ||
              contentType === "application/epub" ||
              path.endsWith(".epub")
            ) {
              return { item: att, type: "epub" };
            }
          }
        } catch {
          // Continue
        }
        return null;
      })
      .filter(Boolean) as Array<{
      item: Zotero.Item;
      type: "pdf" | "snapshot" | "epub";
    }>;
  }, [item, slim]);

  const metadataParts = [
    author,
    date,
    slim ? itemTypeLabel : undefined,
    publicationName ? `in ${publicationName}` : undefined,
  ].filter(Boolean);

  const handleDragStart = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(item.id));
      // Store the assignment ID so we can update the exact assignment instead of duplicating
      // Use the specific assignment if available
      if (assignment?.id) {
        e.dataTransfer.setData(
          "application/x-syllabus-assignment-id",
          assignment.id,
        );
      }
    }
    (e.currentTarget as HTMLElement).classList.add("syllabus-item-dragging");
  };

  const handleDragEnd = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).classList.remove("syllabus-item-dragging");
  };

  const handleUrlClick = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    e.stopPropagation();
    Zotero.launchURL(url);
  };

  function onClick(
    item: Zotero.Item,
    __e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) {
    try {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      pane.selectItem(item.id);
      ztoolkit.log("Item selected:", item.id);
    } catch (err) {
      ztoolkit.log("Error selecting item:", err);
    }
  }

  function onDoubleClick(
    item: Zotero.Item,
    __e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) {
    const url = item.getField("url");
    const attachments = item.getAttachments();
    const viewableAttachment = attachments.find((attId) => {
      const att = Zotero.Items.get(attId);
      if (att && att.isAttachment()) {
        return true;
      }
      return false;
    });
    // If there's an attachment, go to it
    if (viewableAttachment) {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      pane.viewPDF(viewableAttachment, { page: 1 } as any);
    } else if (url) {
      Zotero.launchURL(url);
    }
  }

  const handleAttachmentClick = async (viewableAttachment?: {
    item: Zotero.Item;
    type: "pdf" | "snapshot" | "epub";
  }) => {
    if (!viewableAttachment) return;

    try {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      await pane.viewPDF(viewableAttachment.item.id, { page: 1 } as any);
    } catch {
      try {
        const file = viewableAttachment.item.getFilePath();
        if (file) {
          Zotero.File.pathToFile(file).reveal();
        } else {
          if (viewableAttachment.type === "snapshot") {
            const snapshotUrl = viewableAttachment.item.getField("url");
            if (snapshotUrl) {
              Zotero.launchURL(snapshotUrl);
            }
          }
        }
      } catch (fileErr) {
        ztoolkit.log("Error opening attachment:", fileErr);
      }
    }
  };

  const readStatusName = useMemo(() => getItemReadStatusName(item), [item]);

  // Check if there's an assignment for this card
  const hasAssignment = !!assignment;

  const priorityColor =
    SyllabusManager.PRIORITY_COLORS[priority as SyllabusPriorityType];

  const colors = {
    backgroundColor: priorityColor + "15",
    borderColor: priorityColor + "30",
  };

  return (
    <div
      style={colors}
      className={twMerge(
        "in-[.print]:scheme-light",
        "rounded-lg flex flex-row items-start justify-between shrink-0",
        "bg-quinary border-none text-primary cursor-grab",
        // For hovering contextual btns
        "group relative",
        compactMode
          ? "px-4 py-1.5 gap-3"
          : slim
            ? "px-4 py-2.5 gap-4"
            : "px-4 py-4 gap-4",
        isSelected && "bg-accent-blue! scheme-dark",
      )}
      data-item-id={item.id}
      draggable
      onClick={(e) => onClick(item, e)}
      onDblClick={(e) => onDoubleClick(item, e)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={twMerge(
          "syllabus-item-thumbnail grow-0 shrink-0 in-[.print]:hidden",
          compactMode ? "size-6" : slim ? "size-10" : "size-20",
          // !compactMode ? "self-center" : "mt-0.5"
          "self-center",
        )}
      >
        <span
          className="icon icon-css icon-item-type cell-icon"
          data-item-type={item.itemType}
          style={{
            width: "100%",
            height: "100%",
            backgroundOrigin:
              "padding-box, padding-box, padding-box, padding-box",
            backgroundPositionX: "50%, 50%, 50%, 50%",
            backgroundPositionY: "50%, 50%, 50%, 50%",
            backgroundRepeat: "no-repeat, repeat, repeat, repeat",
            backgroundSize: "contain, 0px, 0px, 0px",
            filter: isSelected
              ? "invert(0.85) brightness(2.5) contrast(1) hue-rotate(175deg)"
              : undefined,
          }}
        />
      </div>
      <div
        className={twMerge(
          "syllabus-item-text grow flex flex-col",
          compactMode ? "gap-0.5" : !slim ? "gap-1" : "gap-0.25",
        )}
      >
        {compactMode ? (
          <>
            <div className="syllabus-item-title-row flex flex-row gap-2 items-baseline justify-between">
              <div className="text-base font-medium grow wrap-break-word">
                {title}
              </div>
              {!!priority && (
                <PriorityIcon
                  priority={priority}
                  colors={!isSelected}
                  className="shrink-0 grow-0 text-right block"
                />
              )}
            </div>
            <div className="syllabus-item-metadata text-secondary flex flex-row gap-4">
              <span className="flex flex-row gap-1 flex-wrap character-separator [--character-separator:'•']">
                {author && <span>{author}</span>}
                {date && <span>{date}</span>}
                {itemTypeLabel && (
                  <span className="text-secondary">{itemTypeLabel}</span>
                )}
                {publicationName && <span>in {publicationName}</span>}
              </span>
            </div>
            {classInstruction && (
              <div className="syllabus-item-description">
                {classInstruction}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-row gap-3 items-baseline justify-start">
              {!!priority && (
                <div className="grow-0 shrink-0">
                  <PriorityIcon priority={priority} colors={!isSelected} />
                </div>
              )}
              {!slim && itemTypeLabel && (
                <div className="grow-0 shrink-0">
                  <span className="text-secondary">{itemTypeLabel}</span>
                </div>
              )}
              {!!readStatusName && (
                <div className="grow-0 shrink-0">
                  <ReadStatusIcon readStatusName={readStatusName} />
                </div>
              )}
            </div>
            <div className="syllabus-item-title-row">
              <div
                className={twMerge(
                  !slim ? "text-xl font-medium" : "text-lg font-medium",
                )}
              >
                {title}
              </div>
            </div>
            <div className="syllabus-item-metadata text-secondary">
              {metadataParts.length > 0 && (
                <span>{metadataParts.join(" • ")}</span>
              )}
            </div>
            {!slim && bibliographicReference && (
              <div className="syllabus-item-reference">
                {bibliographicReference}
              </div>
            )}
            {classInstruction && (
              <div className="syllabus-item-description">
                {classInstruction}
              </div>
            )}
          </>
        )}
      </div>
      {!compactMode && (
        <div
          className="syllabus-item-actions shrink-0 inline-flex flex-col gap-1 in-[.print]:hidden"
          draggable={false}
        >
          {/* Delete assignment button - only show if there's an assignment */}
          {viewableAttachments.map((viewableAttachment) => {
            const attachmentLabel =
              viewableAttachment?.type === "pdf"
                ? "PDF"
                : viewableAttachment?.type === "snapshot"
                  ? "Snapshot"
                  : viewableAttachment?.type === "epub"
                    ? "EPUB"
                    : "View";

            return (
              <div className="focus-states-target in-[.print]:hidden">
                <button
                  className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                  onClick={() => handleAttachmentClick(viewableAttachment)}
                  title={`Open ${attachmentLabel}`}
                  aria-label={`Open ${attachmentLabel}`}
                >
                  <span
                    className="syllabus-action-icon icon icon-css icon-attachment-type"
                    data-item-type={
                      viewableAttachment.type === "pdf"
                        ? "attachmentPDF"
                        : viewableAttachment.type === "epub"
                          ? "attachmentEPUB"
                          : "attachmentSnapshot"
                    }
                    aria-label={`Open ${attachmentLabel}`}
                  />
                  <span className="syllabus-action-label">
                    {attachmentLabel}
                  </span>
                </button>
              </div>
            );
          })}
          {url && (
            <div className="focus-states-target print:hidden">
              <button
                className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                onClick={handleUrlClick}
                title="Open URL"
                aria-label="Open URL"
              >
                <span
                  className="syllabus-action-icon icon icon-css icon-attachment-type"
                  data-item-type="attachmentLink"
                  aria-label="Open URL"
                />
                <span className="syllabus-action-label">Link</span>
              </button>
            </div>
          )}
        </div>
      )}
      {hasAssignment && (
        <div
          className={twMerge(
            "flex-row gap-2 hidden group-hover:flex absolute top-full left-1/2 -translate-x-1/2 p-2 pt-0 bg-quinary rounded-b-lg z-10 in-[.print]:hidden",
            isSelected && "bg-accent-blue!",
          )}
          style={colors}
        >
          <div className="focus-states-target">
            <button
              className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  // Use the specific assignment if available
                  const assignmentToDuplicate = assignment;

                  // Create duplicate with same metadata but new ID
                  const duplicateMetadata: Partial<ItemSyllabusAssignment> = {
                    classNumber: assignmentToDuplicate?.classNumber,
                    priority: assignmentToDuplicate?.priority,
                    classInstruction: assignmentToDuplicate?.classInstruction,
                  };

                  await SyllabusManager.addClassAssignment(
                    item,
                    collectionId,
                    duplicateMetadata.classNumber,
                    duplicateMetadata,
                    "page",
                  );
                  await item.saveTx();
                } catch (err) {
                  ztoolkit.log("Error duplicating assignment:", err);
                }
              }}
              title="Create duplicate assignment"
              aria-label="Create duplicate assignment"
            >
              <span
                className="syllabus-action-icon"
                style={{
                  fontSize: "16px",
                  lineHeight: "1",
                }}
              >
                ⧉
              </span>
              <span className="syllabus-action-label">
                Duplicate assignment
              </span>
            </button>
          </div>
          <div className="focus-states-target">
            <button
              className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  // Use the specific assignment ID if available
                  if (assignment?.id) {
                    await SyllabusManager.removeAssignmentById(
                      item,
                      collectionId,
                      assignment.id,
                      "page",
                    );
                  } else if (
                    classNumber !== null &&
                    classNumber !== undefined
                  ) {
                    // Fallback to classNumber-based removal
                    await SyllabusManager.removeClassAssignment(
                      item,
                      collectionId,
                      classNumber,
                      "page",
                    );
                  } else {
                    // No classNumber - remove all assignments (item is in "further reading")
                    await SyllabusManager.removeAllAssignments(
                      item,
                      collectionId,
                      "page",
                    );
                  }
                  await item.saveTx();
                } catch (err) {
                  ztoolkit.log("Error deleting assignment:", err);
                }
              }}
              title={
                classNumber !== null && classNumber !== undefined
                  ? "Remove from class"
                  : "Remove from syllabus"
              }
              aria-label={
                classNumber !== null && classNumber !== undefined
                  ? "Remove from class"
                  : "Remove from syllabus"
              }
            >
              <span
                className="syllabus-action-icon"
                style={{
                  fontSize: "18px",
                  lineHeight: "1",
                  fontWeight: "bold",
                }}
              >
                ×
              </span>
              <span className="syllabus-action-label">Un-assign</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityIcon({
  priority,
  colors = true,
  className,
}: {
  priority: SyllabusPriorityType;
  colors?: boolean;
  className?: string;
}) {
  if (!priority || !(priority in SyllabusManager.PRIORITY_LABELS)) return null;
  return (
    <span
      className={twMerge(
        "uppercase font-semibold tracking-wide flex flex-row gap-1.5 items-baseline",
        className,
      )}
    >
      <span
        className="w-3 h-3 rounded-full inline-block in-[.print]:hidden"
        style={{
          backgroundColor: colors
            ? SyllabusManager.PRIORITY_COLORS[priority]
            : "var(--color-primary)",
        }}
      />
      <span
        className="rounded-md px-1 py-0.25"
        style={{
          backgroundColor: colors
            ? SyllabusManager.PRIORITY_COLORS[priority] + "15"
            : undefined,
          color: colors ? SyllabusManager.PRIORITY_COLORS[priority] : undefined,
        }}
      >
        {SyllabusManager.PRIORITY_LABELS[priority]}
      </span>
    </span>
  );
}

function ReadStatusIcon({ readStatusName }: { readStatusName: string }) {
  const readStatus = useMemo(
    () => getReadStatusMetadata(readStatusName),
    [readStatusName],
  );
  if (!readStatus) return null;
  return (
    <span className="uppercase font-semibold tracking-wide flex flex-row gap-2 items-baseline rounded-md px-1 py-0.25 in-[.print]:hidden">
      <span className="w-3 h-3 rounded-full inline-block">
        {readStatus.icon}
      </span>
      <span>{readStatus.name}</span>
    </span>
  );
}

export function Bibliography({
  items,
  compactMode = false,
}: {
  items: Zotero.Item[];
  compactMode?: boolean;
}) {
  const [bibliographicReference, setBibliographicReference] = useState(
    generateFallbackBibliographicReference(items),
  );
  useEffect(() => {
    (async () => {
      const ref = await generateBibliographicReference(items, false);
      if (ref) {
        setBibliographicReference(ref);
      }
    })();
  }, [items]);

  return (
    <div>
      <header className="syllabus-bibliography">
        <div
          className={twMerge(
            "font-semibold mt-12 mb-4",
            compactMode ? "text-xl" : "text-2xl",
          )}
        >
          Bibliography
        </div>
      </header>
      <div className={twMerge("flex flex-col gap-4")}>
        {bibliographicReference.split("\n").map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

export function renderSyllabusPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  collectionId: number,
) {
  renderComponent(
    win,
    rootElement,
    <SyllabusPage collectionId={collectionId} />,
    "syllabus-page",
  );
}
