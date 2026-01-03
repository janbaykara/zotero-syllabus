// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  generateFallbackBibliographicReference,
  generateBibliographicReference,
} from "../utils/cite";
import { getPref } from "../utils/prefs";
import { getCSSUrl } from "../utils/css";
import {
  SyllabusManager,
  ItemSyllabusAssignment,
  SyllabusPriority,
} from "./syllabus";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { useZoteroReaderMode } from "./react-zotero-sync/readerMode";
import { FEATURE_FLAG } from "./featureFlags";
import {
  getItemReadStatusName,
  getReadStatusMetadata,
} from "../zotero-reading-list/compat";
import { useDebouncedEffect } from "../utils/react/useDebouncedEffect";
import { useElementSize } from "../utils/react/useElementSize";
import slugify from "slugify";
import { SettingsPage } from "./SettingsPage";
import { formatDate } from "date-fns";
import {
  Printer,
  Settings,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  ListChecks,
  List,
  Download,
  Upload,
} from "lucide-preact";

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
  const [
    syllabusMetadata,
    setDescription,
    setClassDescription,
    setClassTitle,
    _setNomenclature,
    _setPriorities,
    setLocked,
  ] = useZoteroSyllabusMetadata(collectionId);

  const handleClassReadingDateSave = useCallback(
    async (classNumber: number, readingDate: string | undefined) => {
      await SyllabusManager.setClassReadingDate(
        collectionId,
        classNumber,
        readingDate,
        "page",
      );
    },
    [collectionId],
  );

  const isLocked = syllabusMetadata.locked || false;
  const syllabusItems = useZoteroCollectionItems(collectionId);
  const classAssignments = useMemo(() => {
    return syllabusItems.map((item) => item.assignments).flat();
  }, [syllabusItems]);
  const items = useMemo(() => {
    return syllabusItems.map((item) => item.zoteroItem);
  }, [syllabusItems]);

  // Track drag state for showing "Add to Class X" dropzone
  const [isDragging, setIsDragging] = useState(false);

  // Track file drag state for file upload
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Track item order changes to trigger re-computation
  const [itemOrderVersion, setItemOrderVersion] = useState(0);

  // Compact mode state - reactive to preference changes
  const [compactMode, setCompactMode] = useZoteroCompactMode();

  // Reader mode state - reactive to preference changes
  const [readerMode, setReaderMode] = useZoteroReaderMode();

  // Settings view state
  const [showSettings, setShowSettings] = useState(false);

  // Selection state (separate from Zotero selection)
  // Uses format: "assignment:${assignmentId}" or "item:${itemId}"
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<Set<string>>(
    new Set(),
  );

  // Build array of selected assignments and items for drag operations
  const selectedForDrag = useMemo(() => {
    const assignments: Array<{ itemId: number; assignmentId: string }> = [];
    const itemIds: number[] = [];

    for (const identifier of selectedIdentifiers) {
      if (identifier.startsWith("assignment:")) {
        const assignmentId = identifier.replace("assignment:", "");
        for (const syllabusItem of syllabusItems) {
          const matchingAssignment = syllabusItem.assignments.find(
            (a) => a.id === assignmentId,
          );
          if (matchingAssignment) {
            assignments.push({
              itemId: syllabusItem.zoteroItem.id,
              assignmentId: assignmentId,
            });
            break;
          }
        }
      } else if (identifier.startsWith("item:")) {
        const itemId = parseInt(identifier.replace("item:", ""), 10);
        if (!isNaN(itemId)) {
          itemIds.push(itemId);
        }
      }
    }

    return { assignments, itemIds };
  }, [selectedIdentifiers, syllabusItems]);

  const selectedItemIds = useZoteroSelectedItemIds();

  // Handler for selection (assignment or item)
  const handleIdentifierClick = useCallback(
    (
      item: Zotero.Item,
      assignmentId: string | undefined,
      e?: JSX.TargetedMouseEvent<HTMLElement>,
    ) => {
      const identifier = assignmentId
        ? `assignment:${assignmentId}`
        : `item:${item.id}`;

      // Handle selection
      setSelectedIdentifiers((prev) => {
        const newSet = new Set(prev);
        if (e?.shiftKey) {
          // Toggle selection
          if (newSet.has(identifier)) {
            newSet.delete(identifier);
          } else {
            newSet.add(identifier);
          }
        } else {
          // Replace selection
          if (prev.size > 1) {
            // Replace selection
            newSet.clear();
            newSet.add(identifier);
          } else {
            newSet.clear();
            if (!prev.has(identifier)) {
              newSet.add(identifier);
            }
          }
        }
        return newSet;
      });

      // Zotero selection
      try {
        const pane = ztoolkit.getGlobal("ZoteroPane");
        if (e?.shiftKey) {
          const selectedItems = pane.getSelectedItems(true) as number[];
          const itemId = item.id;
          let newSelection: number[];
          if (selectedItems.includes(itemId)) {
            newSelection = selectedItems.filter((id) => id !== itemId);
          } else {
            newSelection = [...selectedItems, itemId];
          }
          if (newSelection.length > 0) {
            pane.selectItems(newSelection);
          } else {
            pane.selectItem(itemId);
          }
        } else {
          const isZoteroSelected = selectedItemIds?.includes(item.id) || false;
          if (isZoteroSelected) {
            ztoolkit.log("Deselect item", item.id);
            pane.selectItem(-1);
          } else {
            pane.selectItem(item.id);
          }
        }
      } catch (err) {
        ztoolkit.log("Error selecting item:", err);
      }
    },
    [selectedItemIds],
  );

  // Helper: Convert identifier to string format
  const identifierToString = useCallback(
    (identifier: { assignmentId?: string; itemId?: number }): string => {
      return identifier.assignmentId
        ? `assignment:${identifier.assignmentId}`
        : `item:${identifier.itemId}`;
    },
    [],
  );

  // Helper: Get identifiers to process (all selected if identifier is selected, otherwise just the identifier)
  const getIdentifiersToProcess = useCallback(
    (identifier: { assignmentId?: string; itemId?: number }): string[] => {
      const identifierStr = identifierToString(identifier);
      return selectedIdentifiers.has(identifierStr)
        ? Array.from(selectedIdentifiers)
        : [identifierStr];
    },
    [selectedIdentifiers, identifierToString],
  );

  // Helper: Process identifiers with a callback function
  const processIdentifiers = useCallback(
    async (
      identifiers: string[],
      processor: (assignmentId: string, item: Zotero.Item) => Promise<void>,
      itemProcessor: (item: Zotero.Item) => Promise<void>,
    ): Promise<Set<Zotero.Item>> => {
      const itemsToSave = new Set<Zotero.Item>();

      for (const identifierStr of identifiers) {
        if (identifierStr.startsWith("assignment:")) {
          const assignmentId = identifierStr.replace("assignment:", "");
          for (const syllabusItem of syllabusItems) {
            const matchingAssignment = syllabusItem.assignments.find(
              (a) => a.id === assignmentId,
            );
            if (matchingAssignment) {
              SyllabusManager.invalidateSyllabusDataCache(
                syllabusItem.zoteroItem,
              );
              await processor(assignmentId, syllabusItem.zoteroItem);
              itemsToSave.add(syllabusItem.zoteroItem);
              break;
            }
          }
        } else if (identifierStr.startsWith("item:")) {
          const itemId = parseInt(identifierStr.replace("item:", ""), 10);
          if (!isNaN(itemId)) {
            try {
              const item = Zotero.Items.get(itemId);
              if (item && item.isRegularItem()) {
                await itemProcessor(item);
                itemsToSave.add(item);
              }
            } catch (err) {
              ztoolkit.log("Error processing item:", err);
            }
          }
        }
      }

      return itemsToSave;
    },
    [syllabusItems],
  );

  // Helper: Save all items
  const saveItems = useCallback(
    async (items: Set<Zotero.Item>, errorContext: string) => {
      for (const item of items) {
        try {
          await item.saveTx();
        } catch (err) {
          ztoolkit.log(`Error saving item after ${errorContext}:`, err);
        }
      }
    },
    [],
  );

  // Handler to apply priority - always receives identifier from item card
  const handlePriorityChange = useCallback(
    async (
      priority: SyllabusPriority | undefined,
      identifier: { assignmentId?: string; itemId?: number },
    ) => {
      const identifiersToProcess = getIdentifiersToProcess(identifier);
      if (identifiersToProcess.length === 0) return;

      const itemsToSave = await processIdentifiers(
        identifiersToProcess,
        async (assignmentId, item) => {
          await SyllabusManager.updateClassAssignment(
            item,
            collectionId,
            assignmentId,
            { priority },
            "page",
          );
        },
        async (item) => {
          await SyllabusManager.addClassAssignment(
            item,
            collectionId,
            undefined,
            { priority },
            "page",
          );
        },
      );

      await saveItems(itemsToSave, "priority change");
    },
    [getIdentifiersToProcess, processIdentifiers, saveItems, collectionId],
  );

  // Handler to delete assignments/items - always receives identifier from item card
  const handleDelete = useCallback(
    async (identifier: { assignmentId?: string; itemId?: number }) => {
      const identifiersToProcess = getIdentifiersToProcess(identifier);
      if (identifiersToProcess.length === 0) return;

      const itemsToSave = await processIdentifiers(
        identifiersToProcess,
        async (assignmentId, item) => {
          await SyllabusManager.removeAssignmentById(
            item,
            collectionId,
            assignmentId,
            "page",
          );
        },
        async (item) => {
          await SyllabusManager.removeAllAssignments(
            item,
            collectionId,
            "page",
          );
        },
      );

      await saveItems(itemsToSave, "deleting");
      setSelectedIdentifiers(new Set());
    },
    [getIdentifiersToProcess, processIdentifiers, saveItems, collectionId],
  );

  // Handler to duplicate assignments/items - always receives identifier from item card
  const handleDuplicate = useCallback(
    async (identifier: { assignmentId?: string; itemId?: number }) => {
      const identifiersToProcess = getIdentifiersToProcess(identifier);
      if (identifiersToProcess.length === 0) return;

      const itemsToSave = await processIdentifiers(
        identifiersToProcess,
        async (assignmentId, item) => {
          // Find matching assignment to duplicate
          for (const syllabusItem of syllabusItems) {
            const matchingAssignment = syllabusItem.assignments.find(
              (a) => a.id === assignmentId,
            );
            if (matchingAssignment && syllabusItem.zoteroItem.id === item.id) {
              const duplicateMetadata: Partial<ItemSyllabusAssignment> = {
                classNumber: matchingAssignment.classNumber,
                priority: matchingAssignment.priority,
                classInstruction: matchingAssignment.classInstruction,
                status: matchingAssignment.status,
              };
              await SyllabusManager.addClassAssignment(
                item,
                collectionId,
                duplicateMetadata.classNumber,
                duplicateMetadata,
                "page",
              );
              break;
            }
          }
        },
        async (item) => {
          // For items without assignments, duplicate means add to syllabus
          const syllabusData = SyllabusManager.getItemSyllabusData(item);
          const collectionKeyStr = SyllabusManager.getCollectionReferenceString(
            Zotero.Collections.get(collectionId).libraryID,
            Zotero.Collections.get(collectionId).key,
          );
          const assignments = syllabusData?.[collectionKeyStr] || [];
          if (assignments.length > 0) {
            const firstAssignment = assignments[0];
            const duplicateMetadata: Partial<ItemSyllabusAssignment> = {
              classNumber: firstAssignment.classNumber,
              priority: firstAssignment.priority,
              classInstruction: firstAssignment.classInstruction,
              status: firstAssignment.status,
            };
            await SyllabusManager.addClassAssignment(
              item,
              collectionId,
              duplicateMetadata.classNumber,
              duplicateMetadata,
              "page",
            );
          } else {
            await SyllabusManager.addClassAssignment(
              item,
              collectionId,
              undefined,
              {},
              "page",
            );
          }
        },
      );

      await saveItems(itemsToSave, "duplicating");
    },
    [
      getIdentifiersToProcess,
      processIdentifiers,
      saveItems,
      syllabusItems,
      collectionId,
    ],
  );

  // Update Zotero selection when selection changes
  useEffect(() => {
    if (selectedIdentifiers.size === 0) {
      return;
    }

    // Get all items from selected identifiers
    const itemIds = new Set<number>();
    for (const identifier of selectedIdentifiers) {
      if (identifier.startsWith("assignment:")) {
        const assignmentId = identifier.replace("assignment:", "");
        for (const syllabusItem of syllabusItems) {
          const matchingAssignment = syllabusItem.assignments.find(
            (a) => a.id === assignmentId,
          );
          if (matchingAssignment) {
            itemIds.add(syllabusItem.zoteroItem.id);
            break;
          }
        }
      } else if (identifier.startsWith("item:")) {
        const itemId = parseInt(identifier.replace("item:", ""), 10);
        if (!isNaN(itemId)) {
          itemIds.add(itemId);
        }
      }
    }

    // Update Zotero selection
    if (itemIds.size > 0) {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      pane.selectItems(Array.from(itemIds));
    }
  }, [selectedIdentifiers, syllabusItems]);

  // Ref for the syllabus page container to access DOM for printing
  const syllabusPageRef = useRef<HTMLDivElement>(null);

  // Ref for hidden file input for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCompactMode = () => {
    const nextMode = !compactMode;
    ztoolkit.log("toggleCompactMode", { compactMode, nextMode });
    setCompactMode(nextMode);
  };

  const toggleReaderMode = () => {
    const nextMode = !readerMode;
    ztoolkit.log("toggleReaderMode", { readerMode, nextMode });
    setReaderMode(nextMode);
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

  // Reset file drag state when drag ends (e.g., when file is dragged back to its window)
  useEffect(() => {
    const handleFileDragEnd = () => {
      setIsDraggingFile(false);
    };

    document.addEventListener("dragend", handleFileDragEnd);

    return () => {
      document.removeEventListener("dragend", handleFileDragEnd);
    };
  }, []);

  // Listen to metadata changes for item order (now part of metadata)
  // The useZoteroSyllabusMetadata hook will trigger re-renders when metadata changes
  // We use itemOrderVersion to force re-computation of class groups when order changes
  useEffect(() => {
    // This effect will run when syllabusMetadata changes, which includes item order
    setItemOrderVersion((v) => v + 1);
  }, [syllabusMetadata]);

  // Compute class groups and further reading items from synced items
  // Re-compute when items change or item order changes
  const { classGroups, furtherReadingItems } = useMemo(() => {
    const furtherReading: Zotero.Item[] = [];
    // Track items with their specific assignments to support multiple assignments per class
    const itemsByClass: Map<
      number | null,
      Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>
    > = new Map();

    for (const __item of syllabusItems) {
      const item = __item.zoteroItem;
      if (!item.isRegularItem()) continue;
      const assignments = __item.assignments;

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

    // Get full range of class numbers (same logic as contextual menu)
    const fullRangeClassNumbers =
      SyllabusManager.getFullClassNumberRange(collectionId);

    // Add classes that have items but are outside the range (for null classNumber)
    const sortedClassNumbers = Array.from(itemsByClass.keys()).sort((a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      return a - b;
    });

    // Merge: use fullRangeClassNumbers as base, but ensure we include any classes with items (including null)
    const finalClassNumbers = new Set<number | null>();
    for (const num of fullRangeClassNumbers) {
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
      const classItemAssignments = itemsByClass.get(classNumber) || [];
      // Use the core sorting function which respects manual order
      const sortedItems = SyllabusManager.sortClassItems(
        classItemAssignments,
        collectionId,
        classNumber,
      );
      itemsByClass.set(classNumber, sortedItems);
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
  }, [syllabusItems, collectionId, syllabusMetadata, itemOrderVersion]);

  const handleDrop = async (
    e: JSX.TargetedDragEvent<HTMLElement>,
    targetClassNumber: number | null,
    targetItemId?: number,
    insertBefore?: boolean,
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

    const targetClassNumberValue =
      targetClassNumber === null ? undefined : targetClassNumber;

    // Check for multiple assignment IDs (multi-select drag)
    const multipleAssignmentIdsStr = e.dataTransfer.getData(
      "application/x-syllabus-assignment-ids",
    );

    // Check if we have multiple items (could be assignments or unassigned items)
    const hasMultipleItems = itemIdStr.includes(",");

    if (multipleAssignmentIdsStr || hasMultipleItems) {
      // Handle multiple assignments drag (or multiple items including unassigned)
      const assignmentIds = multipleAssignmentIdsStr
        ? multipleAssignmentIdsStr.split(",").filter(Boolean)
        : [];
      const itemIds = itemIdStr
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));

      try {
        // Get source class number for reordering
        const sourceClassNumberStr = e.dataTransfer.getData(
          "application/x-syllabus-source-class",
        );
        const sourceClassNumber =
          sourceClassNumberStr !== ""
            ? parseInt(sourceClassNumberStr, 10)
            : undefined;

        // Check if this is a reorder within the same class
        const isReorder =
          sourceClassNumber !== undefined &&
          targetClassNumberValue !== undefined &&
          sourceClassNumber === targetClassNumberValue &&
          targetItemId !== undefined;

        // Process each assignment
        const processedAssignmentIds: string[] = [];
        for (const assignmentId of assignmentIds) {
          // Find the assignment and its item
          let draggedItem: Zotero.Item | null = null;
          for (const syllabusItem of syllabusItems) {
            const matchingAssignment = syllabusItem.assignments.find(
              (a) => a.id === assignmentId,
            );
            if (matchingAssignment) {
              draggedItem = syllabusItem.zoteroItem;
              break;
            }
          }

          if (!draggedItem || !draggedItem.isRegularItem()) continue;

          // Update assignment to target class
          await SyllabusManager.updateClassAssignment(
            draggedItem,
            collectionId,
            assignmentId,
            { classNumber: targetClassNumberValue },
            "page",
          );
          processedAssignmentIds.push(assignmentId);
        }

        // Process unassigned items (items without assignments)
        // First, collect all item IDs that have processed assignments
        const itemsWithProcessedAssignments = new Set<number>();
        for (const assignmentId of processedAssignmentIds) {
          for (const syllabusItem of syllabusItems) {
            const matchingAssignment = syllabusItem.assignments.find(
              (a) => a.id === assignmentId,
            );
            if (matchingAssignment) {
              itemsWithProcessedAssignments.add(syllabusItem.zoteroItem.id);
              break;
            }
          }
        }

        // Now process items that don't have processed assignments
        const processedItemIds: number[] = [];
        const newlyCreatedAssignmentIds: string[] = [];
        for (const itemId of itemIds) {
          // Skip if this item already has a processed assignment
          if (itemsWithProcessedAssignments.has(itemId)) {
            continue;
          }

          // This item is either unassigned or has assignments in a different class
          try {
            const item = Zotero.Items.get(itemId);
            if (item && item.isRegularItem()) {
              // Check if item has any assignments for this collection
              const syllabusData = SyllabusManager.getItemSyllabusData(item);
              const collectionKeyStr =
                SyllabusManager.getCollectionReferenceString(
                  Zotero.Collections.get(collectionId).libraryID,
                  Zotero.Collections.get(collectionId).key,
                );
              const existingAssignments =
                syllabusData?.[collectionKeyStr] || [];

              // If item has no assignments at all, it's an unassigned item
              if (existingAssignments.length === 0) {
                // Add assignment to target class for unassigned items
                await SyllabusManager.addClassAssignment(
                  item,
                  collectionId,
                  targetClassNumberValue,
                  {},
                  "page",
                );
                processedItemIds.push(itemId);

                // Get the newly created assignment ID
                const updatedSyllabusData =
                  SyllabusManager.getItemSyllabusData(item);
                const updatedAssignments =
                  updatedSyllabusData?.[collectionKeyStr] || [];
                const newAssignment = updatedAssignments.find(
                  (a) => a.classNumber === targetClassNumberValue && a.id,
                );
                if (newAssignment?.id) {
                  newlyCreatedAssignmentIds.push(newAssignment.id);
                }
              }
            }
          } catch (err) {
            ztoolkit.log("Error processing unassigned item:", err);
          }
        }

        // Handle manual ordering for multiple selections if reordering within same class
        if (isReorder && targetClassNumberValue !== undefined) {
          // Combine all assignment IDs (existing and newly created)
          const allDraggedAssignmentIds = [
            ...processedAssignmentIds,
            ...newlyCreatedAssignmentIds,
          ];

          let currentOrder = SyllabusManager.getClassItemOrder(
            collectionId,
            targetClassNumberValue,
          );

          // If no manual order exists, initialize it
          if (currentOrder.length === 0) {
            classAssignments.sort((a, b) => {
              const diff = SyllabusManager.compareAssignments(a, b);
              if (diff !== 0) return diff;
              const assignmentA = syllabusItems.find((item) =>
                item.assignments.find((assignment) => assignment.id === a.id),
              );
              const assignmentB = syllabusItems.find((item) =>
                item.assignments.find((assignment) => assignment.id === b.id),
              );
              if (assignmentA && assignmentB) {
                const itemA = assignmentA.zoteroItem;
                const itemB = assignmentB.zoteroItem;
                const titleA = itemA.getField("title") || "";
                const titleB = itemB.getField("title") || "";
                return titleA.localeCompare(titleB);
              }
              return 0;
            });
            currentOrder = classAssignments
              .map((assignment) => assignment.id!)
              .filter(Boolean);
          }

          // Remove all dragged assignments from current order (including newly created ones)
          const newOrder = currentOrder.filter(
            (id) => !allDraggedAssignmentIds.includes(id),
          );

          // Find target assignment ID
          let targetAssignmentId: string | undefined;
          try {
            const targetItem = syllabusItems.find(
              (item) => item.zoteroItem.id === targetItemId,
            );
            if (targetItem) {
              targetAssignmentId = targetItem.assignments.find(
                (a) => a.classNumber === targetClassNumberValue && a.id,
              )?.id;
            }
          } catch (err) {
            ztoolkit.log("Error finding target assignment:", err);
          }

          // Find target position
          const targetIndex = targetAssignmentId
            ? newOrder.findIndex((id) => id === targetAssignmentId)
            : -1;

          // Insert all dragged assignments at target position (maintaining relative order)
          if (targetIndex !== -1) {
            if (insertBefore) {
              newOrder.splice(targetIndex, 0, ...allDraggedAssignmentIds);
            } else {
              newOrder.splice(targetIndex + 1, 0, ...allDraggedAssignmentIds);
            }
          } else {
            // Target not found, append to end
            newOrder.push(...allDraggedAssignmentIds);
          }

          // Update manual order
          await SyllabusManager.setClassItemOrder(
            collectionId,
            targetClassNumberValue,
            newOrder,
            "page",
          );
        }

        // Save all items
        for (const itemId of itemIds) {
          try {
            const item = Zotero.Items.get(itemId);
            if (item) {
              await item.saveTx();
            }
          } catch (err) {
            ztoolkit.log("Error saving item:", err);
          }
        }

        setItemOrderVersion((v) => v + 1);
        return;
      } catch (err) {
        ztoolkit.log("Error handling multi-assignment drag:", err);
        return;
      }
    }

    // Single assignment drag (original behavior)
    const itemId = parseInt(itemIdStr, 10);
    if (isNaN(itemId)) return;

    try {
      const draggedItem = Zotero.Items.get(itemId);
      if (!draggedItem || !draggedItem.isRegularItem()) return;

      // Get source assignment ID from drag data (if dragging from a class)
      const sourceAssignmentId = e.dataTransfer.getData(
        "application/x-syllabus-assignment-id",
      );

      // Get source class number for reordering
      const sourceClassNumberStr = e.dataTransfer.getData(
        "application/x-syllabus-source-class",
      );
      const sourceClassNumber =
        sourceClassNumberStr !== ""
          ? parseInt(sourceClassNumberStr, 10)
          : undefined;

      // Check if this is a reorder within the same class
      if (
        sourceClassNumber !== undefined &&
        targetClassNumberValue !== undefined &&
        sourceClassNumber === targetClassNumberValue &&
        targetItemId !== undefined &&
        sourceAssignmentId
      ) {
        // Reordering within the same class - update manual order using assignment IDs
        let currentOrder = SyllabusManager.getClassItemOrder(
          collectionId,
          targetClassNumberValue,
        );

        // If no manual order exists, initialize it with current assignment order from the class
        if (currentOrder.length === 0) {
          // Sort by current display order (priority, then title)
          classAssignments.sort((a, b) => {
            const diff = SyllabusManager.compareAssignments(a, b);
            if (diff !== 0) return diff;
            // Find items by assignment ID
            const assignmentA = syllabusItems.find((item) =>
              item.assignments.find((assignment) => assignment.id === a.id),
            );
            const assignmentB = syllabusItems.find((item) =>
              item.assignments.find((assignment) => assignment.id === b.id),
            );
            if (assignmentA && assignmentB) {
              const itemA = assignmentA.zoteroItem;
              const itemB = assignmentB.zoteroItem;
              const titleA = itemA.getField("title") || "";
              const titleB = itemB.getField("title") || "";
              return titleA.localeCompare(titleB);
            }
            return 0;
          });
          // Initialize order with assignment IDs
          currentOrder = classAssignments
            .map((assignment) => assignment.id!)
            .filter(Boolean);
        }

        // Remove dragged assignment from current order
        const newOrder = currentOrder.filter((id) => id !== sourceAssignmentId);

        // Find target assignment ID - need to get it from the target item
        let targetAssignmentId: string | undefined;
        try {
          const targetItem = syllabusItems.find(
            (item) => item.zoteroItem.id === targetItemId,
          );
          if (targetItem) {
            targetAssignmentId = targetItem.assignments.find(
              (a) => a.classNumber === targetClassNumberValue && a.id,
            )?.id;
          }
        } catch (err) {
          ztoolkit.log("Error finding target assignment:", err);
        }

        // Find target position
        const targetIndex = targetAssignmentId
          ? newOrder.findIndex((id) => id === targetAssignmentId)
          : -1;

        if (targetIndex !== -1) {
          // Insert at target position
          if (insertBefore) {
            newOrder.splice(targetIndex, 0, sourceAssignmentId);
          } else {
            newOrder.splice(targetIndex + 1, 0, sourceAssignmentId);
          }
        } else {
          // Target not found, append to end
          newOrder.push(sourceAssignmentId);
        }

        // Update manual order
        await SyllabusManager.setClassItemOrder(
          collectionId,
          targetClassNumberValue,
          newOrder,
          "page",
        );
        ztoolkit.log(
          "Updated manual order for class",
          targetClassNumberValue,
          newOrder,
        );
        // Force immediate re-render by updating state
        setItemOrderVersion((v) => v + 1);
        return; // Early return - no need to update assignment
      }

      // Get all existing assignments
      const assignments = syllabusItems.map((item) => item.assignments).flat();

      // If dropping to a specific class number, ensure it exists in metadata
      if (targetClassNumberValue !== undefined) {
        const metadata = SyllabusManager.getSyllabusMetadata(collectionId);
        if (!metadata.classes || !metadata.classes[targetClassNumberValue]) {
          // Auto-create the class metadata entry
          await SyllabusManager.addClass(
            collectionId,
            targetClassNumberValue,
            "page",
          );
        }

        // If moving to a different class, update manual order for target class
        if (
          sourceClassNumber !== undefined &&
          sourceClassNumber !== targetClassNumberValue &&
          sourceAssignmentId
        ) {
          // Remove from source class order (using assignment ID)
          const sourceOrder = SyllabusManager.getClassItemOrder(
            collectionId,
            sourceClassNumber,
          );
          const updatedSourceOrder = sourceOrder.filter(
            (id) => id !== sourceAssignmentId,
          );
          await SyllabusManager.setClassItemOrder(
            collectionId,
            sourceClassNumber,
            updatedSourceOrder,
            "page",
          );

          // Add to target class order at the end (using assignment ID)
          // The assignment will be updated to the new class, so use the same ID
          if (sourceAssignmentId) {
            const targetOrder = SyllabusManager.getClassItemOrder(
              collectionId,
              targetClassNumberValue,
            );
            if (!targetOrder.includes(sourceAssignmentId)) {
              const updatedTargetOrder = [...targetOrder, sourceAssignmentId];
              await SyllabusManager.setClassItemOrder(
                collectionId,
                targetClassNumberValue,
                updatedTargetOrder,
                "page",
              );
            }
          }
          // Force immediate re-render
          setItemOrderVersion((v) => v + 1);
        } else if (sourceClassNumber === undefined) {
          // New item to class - add to end of manual order if it exists
          // We need to wait for the assignment to be created first, so this will be handled
          // after the assignment is created below
        }
      }

      if (sourceAssignmentId) {
        // Dragging from a class or "further reading" with an assignment: MOVE it
        // Update the assignment's classNumber using its ID
        // If target is undefined (dropping to "further reading"), remove classNumber

        // If moving to a different class (or from class to further reading), update manual order
        if (
          sourceClassNumber !== undefined &&
          sourceClassNumber !== targetClassNumberValue
        ) {
          // Remove from source class order (if it exists)
          const sourceOrder = SyllabusManager.getClassItemOrder(
            collectionId,
            sourceClassNumber,
          );
          if (
            sourceOrder.length > 0 &&
            sourceOrder.includes(sourceAssignmentId)
          ) {
            const updatedSourceOrder = sourceOrder.filter(
              (id) => id !== sourceAssignmentId,
            );
            await SyllabusManager.setClassItemOrder(
              collectionId,
              sourceClassNumber,
              updatedSourceOrder,
            );
          }

          // If moving to a class (not further reading), add to target class order
          if (targetClassNumberValue !== undefined) {
            const targetOrder = SyllabusManager.getClassItemOrder(
              collectionId,
              targetClassNumberValue,
            );
            if (
              targetOrder.length > 0 &&
              !targetOrder.includes(sourceAssignmentId)
            ) {
              // Add to end of manual order
              const updatedTargetOrder = [...targetOrder, sourceAssignmentId];
              await SyllabusManager.setClassItemOrder(
                collectionId,
                targetClassNumberValue,
                updatedTargetOrder,
                "page",
              );
            }
            setItemOrderVersion((v) => v + 1);
          }
        }

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

          // After creating assignment, get its ID and add to manual order if it exists
          await draggedItem.saveTx();
          const newAssignment = classAssignments.find((a) => {
            const item = syllabusItems.find((item) =>
              item.assignments.some((assignment) => assignment.id === a.id),
            );
            if (!item) {
              return false;
            }
            return (
              item.zoteroItem.id === draggedItem.id &&
              a.classNumber === targetClassNumberValue &&
              a.id
            );
          });
          if (newAssignment?.id) {
            const targetOrder = SyllabusManager.getClassItemOrder(
              collectionId,
              targetClassNumberValue,
            );
            if (
              targetOrder.length > 0 &&
              !targetOrder.includes(newAssignment.id)
            ) {
              // Add to end of manual order
              const updatedTargetOrder = [...targetOrder, newAssignment.id];
              await SyllabusManager.setClassItemOrder(
                collectionId,
                targetClassNumberValue,
                updatedTargetOrder,
                "page",
              );
              setItemOrderVersion((v) => v + 1);
            }
          }

          ztoolkit.log("Assignment created successfully");
        } else {
          // Dropping to "further reading" with no assignment - nothing to do
          ztoolkit.log(
            "Dropping unassigned item to further reading - no action needed",
          );
        }
      }

      // Only save if we haven't already saved (for new assignment case)
      if (sourceAssignmentId) {
        await draggedItem.saveTx();
      }
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
    const classNumbers = SyllabusManager.getFullClassNumberRange(collectionId);
    const max = classNumbers.length > 0 ? Math.max(...classNumbers) : null;
    return max !== null ? max + 1 : 1;
  }, [collectionId, syllabusMetadata, items]);

  const handleExport = async () => {
    try {
      // Prepare export data using SyllabusManager (now async to include RDF)
      const exportData = await SyllabusManager.prepareExportData(
        collectionId,
        title || "",
      );

      // Create JSON string with pretty formatting
      const jsonContent = JSON.stringify(exportData, null, 2);

      // Generate filename: syllabus-{slugified-title}-{YYYY-MM-DD}.json
      const dateStr = formatDate(new Date(), "yyyy-MM-dd");
      const titleSlug = slugify(title || "syllabus", {
        lower: true,
        strict: true,
      });
      const filename = `${titleSlug}-${dateStr}.syllabus`;

      // Create a temporary file and save it
      const tempDir = Zotero.getTempDirectory();
      const tempFile = tempDir.clone();
      tempFile.append(filename);
      // NORMAL_FILE_TYPE = 0
      tempFile.createUnique(0, 0o666);

      // Write content to file using Zotero.File
      const fileObj = Zotero.File.pathToFile(tempFile.path);
      await Zotero.File.putContentsAsync(fileObj, jsonContent, "utf-8");

      // Open the file location so user can save it
      fileObj.reveal();
    } catch (err) {
      ztoolkit.log("Error exporting syllabus metadata:", err);
    }
  };

  const handleImport = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  // Process a file for import (reusable for both file input and drag-drop)
  const processFile = async (file: File) => {
    try {
      // Read file contents using FileReader
      const fileContents = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result;
          if (typeof content === "string") {
            resolve(content);
          } else if (content instanceof ArrayBuffer) {
            resolve(new TextDecoder("utf-8").decode(content));
          } else {
            reject(new Error("Failed to read file contents"));
          }
        };
        reader.onerror = () => reject(new Error("Error reading file"));
        reader.readAsText(file);
      });

      // Import syllabus metadata using SyllabusManager
      // This handles JSON parsing, validation, collection title update, merging, and saving
      await SyllabusManager.importSyllabusMetadata(
        collectionId,
        fileContents,
        "page",
      );

      ztoolkit.log("Successfully imported and merged syllabus metadata");

      // Show success message
      new ztoolkit.ProgressWindow("Import Success", {
        closeOnClick: true,
        closeTime: 3000,
      })
        .createLine({
          text: "Successfully imported and merged syllabus metadata",
          type: "success",
        })
        .show();
    } catch (error) {
      new ztoolkit.ProgressWindow("Import Error", {
        closeOnClick: true,
        closeTime: 5000,
      })
        .createLine({
          text: error instanceof Error ? error.message : String(error),
          type: "fail",
        })
        .show();
      ztoolkit.log("Import processing error:", error);
    }
  };

  const handleFileInputChange = async (
    e: JSX.TargetedEvent<HTMLInputElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const selectedFile = target.files?.[0];

    // Reset the input so the same file can be selected again
    target.value = "";

    if (!selectedFile) {
      // User cancelled file selection
      return;
    }

    await processFile(selectedFile);
  };

  // Drag and drop handlers for file upload
  const handleFileDragEnter = (e: JSX.TargetedDragEvent<HTMLDivElement>) => {
    // Only handle file drags, not item drags
    // Check if this is a file drag (has "Files" type) and not an item drag
    const isFileDrag = e.dataTransfer?.types.includes("Files");
    const isItemDrag = e.dataTransfer?.types.includes("text/plain");

    if (isFileDrag && !isItemDrag) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(true);
    }
  };

  const handleFileDragOver = (e: JSX.TargetedDragEvent<HTMLDivElement>) => {
    // Only handle file drags, not item drags
    const isFileDrag = e.dataTransfer?.types.includes("Files");
    const isItemDrag = e.dataTransfer?.types.includes("text/plain");

    if (isFileDrag && !isItemDrag) {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    }
  };

  const handleFileDragLeave = (e: JSX.TargetedDragEvent<HTMLDivElement>) => {
    // Only handle file drags, not item drags
    const isFileDrag = e.dataTransfer?.types.includes("Files");
    const isItemDrag = e.dataTransfer?.types.includes("text/plain");

    if (isFileDrag && !isItemDrag) {
      e.preventDefault();
      e.stopPropagation();

      // Check if we're actually leaving the container (not just moving to a child)
      // relatedTarget is the element we're entering, or null if leaving the document
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      const currentTarget = e.currentTarget;

      // If relatedTarget is null, we're leaving the document entirely
      // If relatedTarget is not a child of currentTarget, we're leaving the container
      if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
        setIsDraggingFile(false);
      }
    }
  };

  const handleFileDrop = async (e: JSX.TargetedDragEvent<HTMLDivElement>) => {
    // Only handle file drags, not item drags
    const isFileDrag = e.dataTransfer?.types.includes("Files");
    const isItemDrag = e.dataTransfer?.types.includes("text/plain");

    if (isFileDrag && !isItemDrag) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);

      const files = Array.from(e.dataTransfer?.files || []);
      const syllabusFile = files.find((file) =>
        file.name.endsWith(".syllabus"),
      );

      if (syllabusFile) {
        await processFile(syllabusFile);
      } else if (files.length > 0) {
        // Show error if file doesn't have .syllabus extension
        new ztoolkit.ProgressWindow("Import Error", {
          closeOnClick: true,
          closeTime: 5000,
        })
          .createLine({
            text: "Please drop a .syllabus file",
            type: "fail",
          })
          .show();
      }
    }
  };

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

  const collection = useMemo(() => {
    return Zotero.Collections.get(collectionId);
  }, [collectionId]);

  // If settings view is active, show settings page
  if (showSettings) {
    return (
      <SettingsPage
        collectionId={collectionId}
        onBack={() => setShowSettings(false)}
      />
    );
  }

  return (
    <>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".syllabus"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
      <div
        ref={syllabusPageRef}
        className={twMerge(
          "syllabus-page overflow-y-auto overflow-x-hidden h-full in-[.print]:scheme-light relative",
          compactMode && "compact-mode",
          isDraggingFile && "file-drag-over",
        )}
        onDragEnter={handleFileDragEnter}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        {/* File drag overlay */}
        {isDraggingFile && (
          <div className="sticky h-full inset-0 z-50 bg-accent-blue/10 backdrop-blur-sm flex items-center justify-center pointer-events-none in-[.print]:hidden">
            <div className="bg-background border-4 border-dashed border-accent-blue rounded-lg p-8 shadow-lg">
              <div className="flex flex-col items-center gap-4">
                <Upload size={48} className="text-accent-blue" />
                <div className="text-xl font-semibold text-accent-blue">
                  Drop .syllabus file to import
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="pb-12">
          <div
            syllabus-view-title-container
            className="sticky top-0 z-40 bg-background py-1 md:pt-8 in-[.print]:static"
          >
            <div className="container-padded bg-background">
              {getPref("debugMode") && (
                <div className="text-sm text-secondary">
                  <span className="font-bold">
                    {collectionId} / {collection?.key}
                  </span>
                </div>
              )}
              <div className="flex flex-row items-center gap-2 justify-between">
                <div className="flex-1 text-3xl font-semibold grow shrink-0">
                  <TextInput
                    elementType="input"
                    initialValue={title || ""}
                    onSave={setTitle}
                    emptyBehavior="reset"
                    placeholder="Add a title..."
                    className="w-full px-0! mx-0! text-primary! disabled:text-primary!"
                    readOnly={isLocked}
                  />
                </div>
                <div className="inline-flex items-center gap-2.5 shrink grow-0">
                  {!isLocked && (
                    <>
                      <div
                        className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                        title={
                          compactMode
                            ? "Disable compact mode"
                            : "Enable compact mode"
                        }
                        aria-label={
                          compactMode
                            ? "Disable compact mode"
                            : "Enable compact mode"
                        }
                        onClick={toggleCompactMode}
                      >
                        {compactMode ? (
                          <Maximize2
                            size={20}
                            className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                          />
                        ) : (
                          <Minimize2
                            size={20}
                            className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                          />
                        )}
                      </div>
                      <div
                        className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                        title={
                          readerMode
                            ? "Disable reader mode"
                            : "Enable reader mode"
                        }
                        aria-label={
                          readerMode
                            ? "Disable reader mode"
                            : "Enable reader mode"
                        }
                        onClick={toggleReaderMode}
                      >
                        {readerMode ? (
                          <List
                            size={20}
                            className="text-primary hover:text-primary hover:bg-quinary rounded p-1"
                          />
                        ) : (
                          <ListChecks
                            size={20}
                            className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                          />
                        )}
                      </div>
                      <div
                        className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                        title="Export syllabus file"
                        aria-label="Export syllabus file"
                        onClick={handleExport}
                      >
                        <Upload
                          size={20}
                          className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                        />
                      </div>
                      <div
                        className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                        title="Import syllabus file"
                        aria-label="Import syllabus file"
                        onClick={handleImport}
                      >
                        <Download
                          size={20}
                          className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                        />
                      </div>
                      <div
                        className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                        title="Edit syllabus settings"
                        aria-label="Edit syllabus settings"
                        onClick={() => setShowSettings(true)}
                      >
                        <Settings
                          size={20}
                          className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                        />
                      </div>
                    </>
                  )}
                  <div
                    className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                    title={isLocked ? "Unlock syllabus" : "Lock syllabus"}
                    aria-label={isLocked ? "Unlock syllabus" : "Lock syllabus"}
                    onClick={() => setLocked(!isLocked)}
                  >
                    {isLocked ? (
                      <Unlock
                        size={20}
                        className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                      />
                    ) : (
                      <Lock
                        size={20}
                        className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                      />
                    )}
                  </div>
                  <div
                    className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                    title="Print the list in Syllabus view as a PDF"
                    aria-label="Print the list in Syllabus view as a PDF"
                    onClick={handlePrint}
                  >
                    <Printer
                      size={20}
                      className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container-padded">
            <div
              className={twMerge("py-2", compactMode ? "text-base" : "text-lg")}
            >
              <TextInput
                elementType="textarea"
                initialValue={syllabusMetadata.description || ""}
                onSave={setDescription}
                syllabus-collection-description
                className="w-full px-0! mx-0! text-primary"
                placeholder="Add a description..."
                emptyBehavior="delete"
                fieldSizing="content"
                readOnly={isLocked}
              />
            </div>
          </div>

          <div
            className={twMerge(
              "flex flex-col mb-12",
              compactMode ? "gap-10 mt-4" : "gap-12 mt-6",
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
                onClassReadingDateSave={handleClassReadingDateSave}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                compactMode={compactMode}
                readerMode={readerMode}
                isLocked={isLocked}
                onResetSortOrder={() => setItemOrderVersion((v) => v + 1)}
                selectedIdentifiers={selectedIdentifiers}
                onIdentifierClick={handleIdentifierClick}
                selectedForDrag={selectedForDrag}
                onPriorityChange={handlePriorityChange}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>

          <div className="container-padded">
            {(() => {
              const { singularCapitalized } =
                SyllabusManager.getNomenclatureFormatted(collectionId);

              return (
                <>
                  {!isLocked && isDragging && !compactMode && (
                    <div className="syllabus-class-group syllabus-add-class-dropzone in-[.print]:hidden">
                      <div className="syllabus-class-header-container">
                        <div className="syllabus-class-header">
                          Add to {singularCapitalized} {nextClassNumber}
                        </div>
                      </div>
                      <div
                        className="syllabus-class-items syllabus-add-class-dropzone-items"
                        onDrop={(e) => handleDrop(e, nextClassNumber)}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                      >
                        <div className="syllabus-add-class-dropzone-placeholder bg-quinary rounded-md p-16 text-secondary border-2 border-dashed border-secondary">
                          Drop item here to create {singularCapitalized}{" "}
                          {nextClassNumber}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isLocked && (
                    <div className="syllabus-create-class-control in-[.print]:hidden">
                      <button
                        className="syllabus-create-class-button"
                        onClick={addClass}
                        title={`Add ${singularCapitalized} ${nextClassNumber}`}
                      >
                        Add {singularCapitalized} {nextClassNumber}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

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
                      readerMode={readerMode}
                      selectedIdentifiers={selectedIdentifiers}
                      onIdentifierClick={handleIdentifierClick}
                      selectedForDrag={selectedForDrag}
                      onPriorityChange={handlePriorityChange}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      isZoteroSelected={
                        selectedItemIds?.includes(item.id) || false
                      }
                      isIdentifierSelected={selectedIdentifiers.has(
                        `item:${item.id}`,
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {getPref("debugMode") && (
              <div className="text-secondary text-sm">
                <h3>Debug info</h3>
                <pre>
                  {JSON.stringify(
                    {
                      syllabusMetadata,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}

            <Bibliography items={items} compactMode={compactMode} />
          </div>
        </div>
      </div>
    </>
  );

  async function addClass() {
    try {
      await SyllabusManager.addClass(collectionId, nextClassNumber, "page");
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
    classes?: {
      [key: string]: {
        title?: string;
        description?: string;
        readingDate?: string;
      };
    };
  };
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
    priority: SyllabusPriority | undefined,
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

function ClassGroupComponent({
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
  const classTitle = classNumber
    ? syllabusMetadata.classes?.[classNumber]?.title || ""
    : "";
  const classDescription = classNumber
    ? syllabusMetadata.classes?.[classNumber]?.description || ""
    : "";
  const readingDate = classNumber
    ? syllabusMetadata.classes?.[classNumber]?.readingDate
    : undefined;
  const classIsDone = classNumber
    ? SyllabusManager.getClassStatus(collectionId, classNumber) === "done"
    : false;

  // Check if there's a manual order for this class
  const hasManualOrder =
    classNumber !== null &&
    classNumber !== undefined &&
    SyllabusManager.getClassItemOrder(collectionId, classNumber).length > 0;

  const handleDeleteClass = async () => {
    if (classNumber) {
      try {
        await SyllabusManager.deleteClass(collectionId, classNumber, "page");
      } catch (err) {
        ztoolkit.log("Error deleting class:", err);
      }
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

  return (
    <div
      className={twMerge(
        "syllabus-class-group in-[.print]:scheme-light",
        readerMode && classIsDone ? "opacity-40" : "",
      )}
    >
      {classNumber && (
        <>
          <div
            className={twMerge(
              "sticky z-35 bg-background py-1 in-[.print]:static top-10 md:top-18",
            )}
          >
            <div
              className={twMerge(
                "container-padded rounded-xs mb-1",
                // compactMode ? "py-0.5" : "py-1",
              )}
            >
              <div className="flex gap-2 items-baseline justify-start w-full relative">
                {readerMode && (
                  <input
                    type="checkbox"
                    checked={classIsDone}
                    onChange={handleClassStatusToggle}
                    className="mt-1! absolute right-full mr-1 md:mr-2! w-4 h-4 cursor-pointer shrink-0 self-center in-[.print]:hidden"
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
                  slim={
                    compactMode ||
                    !priority ||
                    priority === SyllabusManager.priorityKeys.OPTIONAL
                  }
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

function formatReadingDate(isoDate: string): string {
  const date = new Date(isoDate);
  return formatDate(date, "iii do MMM");
}

function ReadingDateInput({
  initialValue,
  onSave,
  compactMode = false,
}: {
  initialValue?: string; // ISO date string
  onSave: (date: string | undefined) => void | Promise<void>;
  compactMode?: boolean;
}) {
  const [value, setValue] = useState(
    initialValue ? new Date(initialValue).toISOString().split("T")[0] : "",
  );

  useEffect(() => {
    if (initialValue) {
      setValue(new Date(initialValue).toISOString().split("T")[0]);
    } else {
      setValue("");
    }
  }, [initialValue]);

  useDebouncedEffect(
    () => {
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const isoString = date.toISOString();
          if (isoString !== initialValue) {
            onSave(isoString);
          }
        }
      } else if (initialValue !== undefined) {
        onSave(undefined);
      }
    },
    [initialValue, value],
    500,
  );

  function clear() {
    setValue("");
    onSave(undefined);
  }

  return (
    <div className="flex flex-row items-center gap-2">
      <label
        className={twMerge(
          "text-tertiary shrink-0",
          compactMode ? "text-sm" : "text-base",
        )}
      >
        {value ? (
          <span
            onClick={clear}
            className="underline text-secondary cursor-pointer"
          >
            Clear due date
          </span>
        ) : (
          <span>Add a due date</span>
        )}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        className={twMerge(
          "px-2 py-1 border border-quinary rounded-md bg-background text-secondary focus:outline-3 focus:outline-accent-blue focus:outline-offset-2",
          compactMode ? "text-sm" : "text-base",
        )}
        placeholder="Select date"
      />
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
  readOnly = false,
  ...elementProps
}: {
  initialValue: string;
  onSave: (value: string) => void | Promise<void>;
  placeholder?: string;
  emptyBehavior?: "reset" | "delete";
  elementType?: "input" | "textarea";
  className?: string;
  fieldSizing?: "content" | "fixed" | "auto";
  readOnly?: boolean;
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

  // Hide the entire component when readOnly and no value
  if (readOnly && !value && !initialValue) {
    return null;
  }

  return (
    <div ref={setSizeRef} className="w-full">
      {h(elementType, {
        ref: inputRef,
        type: "text",
        value,
        readOnly,
        disabled: readOnly,
        onChange: readOnly
          ? undefined
          : (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setValue((e.target as HTMLInputElement).value),
        onBlur: readOnly ? undefined : () => save(value),
        onKeyDown: readOnly
          ? undefined
          : (
              e: JSX.TargetedKeyboardEvent<
                HTMLInputElement | HTMLTextAreaElement
              >,
            ) => {
              if (e.key === "Escape" || e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
                save(value);
              }
            },
        onSelect: readOnly
          ? (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              e.preventDefault();
              e.currentTarget.setSelectionRange(0, 0);
            }
          : undefined,
        onClick: readOnly
          ? (
              e: JSX.TargetedMouseEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              e.preventDefault();
              e.currentTarget.blur();
            }
          : undefined,
        placeholder: readOnly ? undefined : placeholder || "Click to edit",
        className: twMerge(
          "bg-transparent border-none focus:outline-3 focus:outline-accent-blue focus:rounded-xs focus:outline-offset-2 field-sizing-content in-[.print]:hidden",
          readOnly && "cursor-default select-none",
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

export function SyllabusItemCard({
  className,
  item,
  collectionId,
  classNumber,
  assignment,
  slim = false,
  compactMode = false,
  readerMode = false,
  isLocked = false,
  onDrop,
  onDragOver,
  onClick: customOnClick,
  selectedIdentifiers = new Set(),
  onIdentifierClick,
  selectedForDrag = { assignments: [], itemIds: [] },
  onPriorityChange,
  onDelete,
  onDuplicate,
  isZoteroSelected,
  isIdentifierSelected,
}: {
  className?: string;
  item: Zotero.Item;
  collectionId: number;
  classNumber?: number | null; // Specific class number for this rendering
  assignment?: ItemSyllabusAssignment; // Specific assignment for this rendering (to differentiate multiple assignments)
  isZoteroSelected?: boolean;
  isIdentifierSelected?: boolean;
  slim?: boolean;
  compactMode?: boolean;
  readerMode?: boolean;
  isLocked?: boolean;
  onDrop?: (
    e: JSX.TargetedDragEvent<HTMLElement>,
    insertBefore: boolean,
  ) => void;
  onDragOver?: (e: JSX.TargetedDragEvent<HTMLElement>) => void;
  onClick?: (
    item: Zotero.Item,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void; // Optional custom click handler
  // Selection props
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
    priority: SyllabusPriority | undefined,
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
}) {
  // Get the currently selected item ID (Zotero selection)
  // const selectedItemIds = useZoteroSelectedItemIds();
  // const isZoteroSelected = selectedItemIds?.includes(item.id) || false;

  // // Check if this identifier is selected
  const identifier = assignment?.id
    ? `assignment:${assignment.id}`
    : `item:${item.id}`;
  // const isSelected = selectedIdentifiers.has(identifier);

  // const is

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

      // Check if this identifier is selected, and if so, drag all selected
      const isThisSelected = selectedIdentifiers.has(identifier);

      if (
        isThisSelected &&
        selectedForDrag.assignments.length + selectedForDrag.itemIds.length > 0
      ) {
        // Drag all selected assignments
        const assignmentIds = selectedForDrag.assignments
          .map((a) => a.assignmentId)
          .join(",");
        if (assignmentIds) {
          e.dataTransfer.setData(
            "application/x-syllabus-assignment-ids",
            assignmentIds,
          );
        }
        // Store all item IDs (from both assignments and items)
        const allItemIds = Array.from(
          new Set([
            ...selectedForDrag.assignments.map((a) => a.itemId),
            ...selectedForDrag.itemIds,
          ]),
        )
          .map(String)
          .join(",");
        e.dataTransfer.setData("text/plain", allItemIds);
      } else {
        // Single drag (original behavior)
        e.dataTransfer.setData("text/plain", String(item.id));
        if (assignment?.id) {
          e.dataTransfer.setData(
            "application/x-syllabus-assignment-id",
            assignment.id,
          );
        }
      }

      // Store source class number for reordering within same class
      if (classNumber !== null && classNumber !== undefined) {
        e.dataTransfer.setData(
          "application/x-syllabus-source-class",
          String(classNumber),
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
    _item: Zotero.Item,
    _e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) {
    // This is now handled by handleAssignmentClick
    // Keep for backwards compatibility with custom onClick handlers
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

  const { color: priorityColor } = SyllabusManager.getPriorityDisplay(
    collectionId,
    priority as SyllabusPriority,
  );

  const assignmentStatus = assignment?.status || null;

  const colors = priority
    ? {
        backgroundColor: priorityColor + "15",
      }
    : {};

  const handleItemDragOver = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    if (onDragOver) {
      onDragOver(e);
    }
  };

  const handleItemDrop = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!onDrop) return;

    // Determine if drop should insert before or after based on mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY;
    const midpoint = rect.top + rect.height / 2;
    const insertBefore = y < midpoint;

    // Stop propagation to prevent class container from also handling the drop
    e.stopPropagation();
    onDrop(e, insertBefore);
  };

  const handleAssignmentStatusToggle = async (
    e: JSX.TargetedEvent<HTMLInputElement>,
  ) => {
    e.stopPropagation();
    if (!assignment?.id) return;

    try {
      const newStatus = assignmentStatus === "done" ? null : "done";
      await SyllabusManager.updateClassAssignment(
        item,
        collectionId,
        assignment.id,
        { status: newStatus },
        "page",
      );
      await item.saveTx();
    } catch (err) {
      ztoolkit.log("Error toggling assignment status:", err);
    }
  };

  return (
    <div
      style={colors}
      className={twMerge(
        "in-[.print]:scheme-light",
        "rounded-lg flex flex-row items-start justify-between shrink-0",
        "bg-background-sidepane text-primary",
        "relative",
        isLocked ? "cursor-default" : "cursor-grab",
        // For hovering contextual btns
        "group relative",
        compactMode
          ? "px-4 py-1.5 gap-3"
          : slim
            ? "px-4 py-2.5 gap-4"
            : "px-4 py-4 gap-4",
        isZoteroSelected &&
          !isIdentifierSelected &&
          "outline-2! outline-accent-blue",
        isIdentifierSelected && "bg-accent-blue! scheme-dark",
        // isZoteroSelected && isIdentifierSelected && "outline-none!",
        // assignmentStatus === "done" ? "opacity-40" : "",
        className,
      )}
      data-item-id={item.id}
      draggable={!isLocked}
      onClick={(e) => {
        if (customOnClick) {
          customOnClick(item, e);
        } else if (onIdentifierClick) {
          onIdentifierClick(item, assignment?.id, e);
        } else {
          onClick(item, e);
        }
      }}
      onDblClick={(e) => onDoubleClick(item, e)}
      onDragStart={isLocked ? undefined : handleDragStart}
      onDragEnd={isLocked ? undefined : handleDragEnd}
      onDragOver={isLocked ? undefined : handleItemDragOver}
      onDrop={isLocked ? undefined : handleItemDrop}
    >
      {readerMode && (
        <input
          type="checkbox"
          checked={assignmentStatus === "done"}
          onChange={handleAssignmentStatusToggle}
          className="absolute right-full mr-1 md:mr-2! w-4 h-4 cursor-pointer shrink-0 self-center in-[.print]:hidden"
          title={
            assignmentStatus === "done" ? "Mark as not done" : "Mark as done"
          }
          aria-label={
            assignmentStatus === "done" ? "Mark as not done" : "Mark as done"
          }
          onClick={(e) => e.stopPropagation()}
        />
      )}
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
            filter: isIdentifierSelected
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
              <div
                className={twMerge(
                  "text-base font-medium grow wrap-break-word",
                  readerMode && assignmentStatus === "done"
                    ? "line-through"
                    : "",
                )}
              >
                {title}
              </div>
              {!!priority && (
                <PriorityIcon
                  priority={priority}
                  colors={!isIdentifierSelected}
                  className="shrink-0 grow-0 text-right block"
                  collectionId={collectionId}
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
                  <PriorityIcon
                    priority={priority}
                    colors={!isIdentifierSelected}
                    collectionId={collectionId}
                  />
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
                  readerMode && assignmentStatus === "done"
                    ? "line-through"
                    : "",
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
      {!!viewableAttachments?.length && (
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
      {!isLocked && (
        <div
          className={twMerge(
            "hidden group-hover:flex absolute top-full left-1/2 -translate-x-1/2 p-2 pt-0 z-20 in-[.print]:hidden! w-auto",
            "border-background border-6 border-t-0 rounded-b-2xl rounded-t-0!",
            // Background solid colour, so that priority colours can be cast atop with some opacity, without revealing spillover content from other items
            "before:content-[''] before:absolute before:top-0 before:left-0 before:w-full! before:bg-background before:rounded-b-lg rounded-t-0! before:z-20! before:h-full!",
            // Apply the priority colour to the after element, with some opacity
            "after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full! after:bg-(--after-background-color) after:rounded-b-lg rounded-t-0! after:z-25! after:h-full!",
            // Overrides
            isZoteroSelected &&
              !isIdentifierSelected &&
              "border-accent-blue! border-3! border-t-0!",
            isIdentifierSelected && "after:bg-accent-blue!",
          )}
          style={
            !isIdentifierSelected
              ? {
                  "--after-background-color": priority
                    ? priorityColor + "15"
                    : "var(--material-sidepane)",
                }
              : {}
          }
        >
          <div
            className="relative z-30 flex-row gap-2"
            style={{
              display: "inherit",
            }}
          >
            {!!assignment?.id && (
              <>
                <div className="focus-states-target">
                  <button
                    className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // Always pass identifier - handler will check if it's in selection
                        if (onDuplicate) {
                          const identifier = {
                            assignmentId: assignment.id,
                            itemId: undefined,
                          };
                          await onDuplicate(identifier);
                        }
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
                    <span className="syllabus-action-label">Duplicate</span>
                  </button>
                </div>
                <div className="focus-states-target">
                  <button
                    className="syllabus-action-button row flex flex-row items-center justify-center gap-2"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // Always pass identifier - handler will check if it's in selection
                        if (onDelete) {
                          const identifier = {
                            assignmentId: assignment.id,
                            itemId: undefined,
                          };
                          await onDelete(identifier);
                        }
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
                    <span className="syllabus-action-label">Unassign</span>
                  </button>
                </div>
                &middot;
              </>
            )}
            {(() => {
              const priorityOptions =
                SyllabusManager.getPrioritiesForCollection(collectionId);
              return [
                ...priorityOptions.map((priorityOption) => {
                  return (
                    <div
                      key={priorityOption.id}
                      className="focus-states-target"
                    >
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            // Always pass identifier - handler will check if it's in selection
                            if (onPriorityChange) {
                              const identifier = {
                                assignmentId: assignment?.id,
                                itemId: assignment ? undefined : item.id,
                              };
                              await onPriorityChange(
                                priorityOption.id as SyllabusPriority,
                                identifier,
                              );
                            }
                          } catch (err) {
                            ztoolkit.log("Error setting priority:", err);
                          }
                        }}
                        title={`Set priority to ${priorityOption.name}`}
                        aria-label={`Set priority to ${priorityOption.name}`}
                      >
                        <span
                          className="syllabus-action-icon inline-block mt-1 -mb-1 w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: priorityOption.color,
                          }}
                        />
                        {/* <span className="syllabus-action-label">
                        {priorityOption.name}
                      </span> */}
                      </button>
                    </div>
                  );
                }),
                <div key="none" className="focus-states-target">
                  <button
                    // className="syllabus-action-button row inline-lex flex-row items-center justify-center gap-2"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // Always pass identifier - handler will check if it's in selection
                        if (onPriorityChange) {
                          const identifier = {
                            assignmentId: assignment?.id,
                            itemId: assignment ? undefined : item.id,
                          };
                          await onPriorityChange(undefined, identifier);
                        }
                      } catch (err) {
                        ztoolkit.log("Error clearing priority:", err);
                      }
                    }}
                    title="Clear priority"
                    aria-label="Clear priority"
                  >
                    <span className="syllabus-action-label">(None)</span>
                  </button>
                </div>,
              ];
            })()}
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
  collectionId,
}: {
  priority: SyllabusPriorityType;
  colors?: boolean;
  className?: string;
  collectionId?: number;
}) {
  if (!priority) return null;

  // Use collection-specific colors and labels if collectionId is provided
  const { color: priorityColor, label: priorityLabel } =
    SyllabusManager.getPriorityDisplay(
      collectionId,
      priority as SyllabusPriority,
    );

  if (!priorityLabel) return null;

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
          backgroundColor: colors ? priorityColor : "var(--color-primary)",
        }}
      />
      <span
        className="rounded-md px-1 py-0.25"
        style={{
          backgroundColor: colors ? priorityColor + "15" : undefined,
          color: colors ? priorityColor : undefined,
        }}
      >
        {priorityLabel}
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
      <div className={twMerge("flex flex-col gap-3")}>
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
