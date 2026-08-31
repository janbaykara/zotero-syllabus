// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { generateBibliographyForPrint } from "../utils/cite";
import { getPref } from "../utils/prefs";
import { getString } from "../utils/locale";
import {
  showUserGuide,
  TOUR_EVENT_CLOSE_SETTINGS,
  TOUR_EVENT_OPEN_SETTINGS,
} from "./userGuide";
import {
  SyllabusManager,
  ItemSyllabusAssignment,
  classByNumber,
} from "./syllabus";
import { getCachedItem, getCachedCollectionById } from "../utils/cache";
import { renderComponent } from "../utils/react";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { useZoteroReaderMode } from "./react-zotero-sync/readerMode";
import { isZotero8OrLater } from "../utils/zotero";
import { getItemTitle, sortItems } from "../utils/items";
import slugify from "slugify";
import { SettingsPage } from "./SettingsPage";
import {
  useFurtherReadingSortBy,
  type FurtherReadingSortBy,
} from "./furtherReadingSort";
import { formatDate } from "date-fns";
import {
  Printer,
  Settings,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  List,
  Download,
  Upload,
  Menu,
  ListTodo,
} from "lucide-preact";
import { TableOfContents } from "./TableOfContents";
import { saveToFile } from "../utils/file";
import {
  buildPrintableHtml,
  openSyllabusPrintDialog,
  serializeSyllabusForPrint,
} from "../utils/printSyllabus";
import { useSyllabusClassGroups } from "./classGroups";
import { ClassSubcollectionPage } from "./ClassReadingBlock";
import { getClassSubcollectionContext } from "./syllabusNote";
import { ReadingSchedule } from "./ReadingSchedule";
import { ReadingScheduleDayPage } from "./ReadingScheduleDayPage";
import { getReadingScheduleCollectionContext } from "./readingScheduleCollection";
import { useSyllabusDocumentGeneration } from "./react-zotero-sync/collectionDocument";
import { TextInput } from "./syllabusInputs";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { bibliographyToHtml } from "./Bibliography";
import { LinksSection } from "./LinksSection";
import { ClassGroupComponent } from "./ClassGroup";
import { isCustomCollectionViewActive } from "./galleryKeyboardNav";

export { SyllabusItemCard } from "./SyllabusItemCard";
export { Bibliography } from "./Bibliography";

interface SyllabusPageProps {
  collectionId: number;
}

export function SyllabusPage({ collectionId }: SyllabusPageProps) {
  useSyllabusDocumentGeneration();
  const readingSchedule = getReadingScheduleCollectionContext(collectionId);
  if (readingSchedule?.kind === "root") {
    return <ReadingSchedule />;
  }
  if (readingSchedule) {
    return <ReadingScheduleDayPage collectionId={collectionId} />;
  }
  const classContext = getClassSubcollectionContext(collectionId);
  if (classContext) {
    return (
      <ClassSubcollectionPage
        parentCollectionId={classContext.parent.id}
        classCollectionId={collectionId}
        classNumber={classContext.classNumber}
      />
    );
  }
  return <CollectionSyllabusPage collectionId={collectionId} />;
}

type SyllabusNavEntry = {
  identifier: string;
  item: Zotero.Item;
  isFirstInGroup: boolean;
};

function getNavigableSyllabusEntries(
  classGroups: Array<{
    itemAssignments: Array<{
      item: Zotero.Item;
      assignment: ItemSyllabusAssignment;
    }>;
  }>,
  furtherReadingItems: Zotero.Item[],
): SyllabusNavEntry[] {
  const entries: SyllabusNavEntry[] = [];

  for (const group of classGroups) {
    let isFirstInGroup = true;
    for (const { item, assignment } of group.itemAssignments) {
      if (!assignment.id) {
        continue;
      }
      entries.push({
        identifier: `assignment:${assignment.id}`,
        item,
        isFirstInGroup,
      });
      isFirstInGroup = false;
    }
  }

  furtherReadingItems.forEach((item, index) => {
    entries.push({
      identifier: `item:${item.id}`,
      item,
      isFirstInGroup: index === 0,
    });
  });

  return entries;
}

function getActiveNavIndex(
  selectedIdentifiers: Set<string>,
  entries: SyllabusNavEntry[],
  direction: "up" | "down",
): number {
  if (direction === "down") {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (selectedIdentifiers.has(entries[i].identifier)) {
        return i;
      }
    }
  } else {
    for (let i = 0; i < entries.length; i++) {
      if (selectedIdentifiers.has(entries[i].identifier)) {
        return i;
      }
    }
  }
  return -1;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).closest !== "function") {
    const tag = ((target as HTMLElement | null)?.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }
  const el = target as HTMLElement;
  if (el.isContentEditable) {
    return true;
  }
  return Boolean(
    el.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function isCollectionsPaneTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).closest !== "function") {
    return false;
  }
  return Boolean(
    (target as HTMLElement).closest(
      "#zotero-collections-tree, #zotero-collections-pane",
    ),
  );
}

function scrollSyllabusIdentifierIntoView(
  container: HTMLElement,
  identifier: string,
  showGroupHeader: boolean,
) {
  const card = container.querySelector(
    `[data-syllabus-identifier="${identifier}"]`,
  ) as HTMLElement | null;
  if (!card) {
    return;
  }

  const titleContainer = container.querySelector(
    "[syllabus-view-title-container]",
  ) as HTMLElement | null;
  const titleHeight = titleContainer?.getBoundingClientRect().height ?? 0;
  const padding = 8;
  const containerRect = container.getBoundingClientRect();
  const topBound = containerRect.top + titleHeight + padding;
  const bottomBound = containerRect.bottom - padding;

  const group = showGroupHeader
    ? (card.closest(".syllabus-class-group") as HTMLElement | null)
    : null;

  if (group) {
    const groupRect = group.getBoundingClientRect();
    const targetTop =
      groupRect.top -
      containerRect.top +
      container.scrollTop -
      titleHeight -
      padding;
    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "auto",
    });
    return;
  }

  const cardRect = card.getBoundingClientRect();
  if (cardRect.top < topBound) {
    container.scrollTop -= topBound - cardRect.top;
  } else if (cardRect.bottom > bottomBound) {
    container.scrollTop += cardRect.bottom - bottomBound;
  }
}

function CollectionSyllabusPage({ collectionId }: SyllabusPageProps) {
  // Sync with external Zotero stores using hooks
  const [title, setTitle] = useZoteroCollectionTitle(collectionId);
  const [
    syllabusMetadata,
    setDescription,
    setClassDescription,
    setClassTitle,
    _setNomenclature,
    _setPriorities,
    setInstitution,
    setCourseCode,
    setLocked,
    setLinks,
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

  useEffect(() => {
    const win = Zotero.getMainWindow();
    if (!win) {
      return;
    }
    const openSettings = () => setShowSettings(true);
    const closeSettings = () => setShowSettings(false);
    win.addEventListener(TOUR_EVENT_OPEN_SETTINGS, openSettings);
    win.addEventListener(TOUR_EVENT_CLOSE_SETTINGS, closeSettings);
    return () => {
      win.removeEventListener(TOUR_EVENT_OPEN_SETTINGS, openSettings);
      win.removeEventListener(TOUR_EVENT_CLOSE_SETTINGS, closeSettings);
    };
  }, []);

  // Table of Contents state
  const [showTOC, setShowTOC] = useState(false);

  // Selection state (separate from Zotero selection)
  // Uses format: "assignment:${assignmentId}" or "item:${itemId}"
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<Set<string>>(
    new Set(),
  );
  const syllabusPageRef = useRef<HTMLDivElement>(null);
  const pendingNavScrollRef = useRef<{
    identifier: string;
    showGroupHeader: boolean;
  } | null>(null);

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

      syllabusPageRef.current?.focus({ preventScroll: true });
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
              // Assignment was updated
              await processor(assignmentId, syllabusItem.zoteroItem);
              itemsToSave.add(syllabusItem.zoteroItem);
              break;
            }
          }
        } else if (identifierStr.startsWith("item:")) {
          const itemId = parseInt(identifierStr.replace("item:", ""), 10);
          if (!isNaN(itemId)) {
            const item = getCachedItem(itemId);
            if (item && item.isRegularItem()) {
              await itemProcessor(item);
              itemsToSave.add(item);
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
      priority: string | undefined,
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
          const collection = getCachedCollectionById(collectionId);
          if (!collection) return;
          const collectionKeyStr = SyllabusManager.getCollectionReferenceString(
            collection.libraryID,
            collection.key,
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

  const [furtherReadingSortBy, setFurtherReadingSortBy] =
    useFurtherReadingSortBy(collectionId);

  // Compute class groups and further reading items from synced items
  // Re-compute when items change or item order changes
  const { classGroups, furtherReadingItems: unsortedFurtherReading } =
    useSyllabusClassGroups(
      collectionId,
      syllabusItems,
      syllabusMetadata,
      itemOrderVersion,
    );

  const furtherReadingItems = useMemo(
    () => sortItems(unsortedFurtherReading, furtherReadingSortBy),
    [unsortedFurtherReading, furtherReadingSortBy],
  );

  const navigableEntries = useMemo(
    () => getNavigableSyllabusEntries(classGroups, furtherReadingItems),
    [classGroups, furtherReadingItems],
  );

  const navStateRef = useRef({
    selectedIdentifiers,
    navigableEntries,
  });
  navStateRef.current = { selectedIdentifiers, navigableEntries };

  const handleSyllabusKeyDown = useCallback((event: Event) => {
    const e = event as KeyboardEvent;
    if (!isCustomCollectionViewActive()) {
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const isDown = e.key === "ArrowDown" || e.key === "Down";
    const isUp = e.key === "ArrowUp" || e.key === "Up";
    if (!isDown && !isUp) {
      return;
    }
    if (isEditableKeyboardTarget(e.target)) {
      return;
    }
    if (isCollectionsPaneTarget(e.target)) {
      return;
    }

    const { selectedIdentifiers: selected, navigableEntries: entries } =
      navStateRef.current;
    if (selected.size === 0 || entries.length === 0) {
      return;
    }

    const currentIndex = getActiveNavIndex(
      selected,
      entries,
      isDown ? "down" : "up",
    );
    if (currentIndex < 0) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") {
      e.stopImmediatePropagation();
    }

    const nextIndex = isDown ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= entries.length) {
      return;
    }

    const next = entries[nextIndex];
    pendingNavScrollRef.current = {
      identifier: next.identifier,
      showGroupHeader: isDown && next.isFirstInGroup,
    };
    setSelectedIdentifiers(new Set([next.identifier]));
  }, []);

  useEffect(() => {
    if (showSettings) {
      return;
    }

    const win = Zotero.getMainWindow();
    const doc = win?.document ?? document;
    doc.addEventListener("keydown", handleSyllabusKeyDown, true);
    return () => {
      doc.removeEventListener("keydown", handleSyllabusKeyDown, true);
    };
  }, [handleSyllabusKeyDown, showSettings]);

  useLayoutEffect(() => {
    const pending = pendingNavScrollRef.current;
    if (!pending) {
      return;
    }
    pendingNavScrollRef.current = null;
    const container = syllabusPageRef.current;
    if (!container) {
      return;
    }
    scrollSyllabusIdentifierIntoView(
      container,
      pending.identifier,
      pending.showGroupHeader,
    );
  }, [selectedIdentifiers]);

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
            const item = getCachedItem(itemId);
            if (item && item.isRegularItem()) {
              // Check if item has any assignments for this collection
              const syllabusData = SyllabusManager.getItemSyllabusData(item);
              const collection = getCachedCollectionById(collectionId);
              if (!collection) continue;
              const collectionKeyStr =
                SyllabusManager.getCollectionReferenceString(
                  collection.libraryID,
                  collection.key,
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
                return getItemTitle(itemA).localeCompare(getItemTitle(itemB));
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
          const item = getCachedItem(itemId);
          if (item) {
            try {
              await item.saveTx();
            } catch (err) {
              ztoolkit.log("Error saving item:", err);
            }
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

    const draggedItem = getCachedItem(itemId);
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
            return getItemTitle(itemA).localeCompare(getItemTitle(itemB));
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
      if (!classByNumber(metadata, targetClassNumberValue)) {
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
      const rdf = await SyllabusManager.prepareExportData(collectionId);
      const dateStr = formatDate(new Date(), "yyyy-MM-dd");
      const titleSlug = slugify(title || "syllabus", {
        lower: true,
        strict: true,
      });
      const filename = `${titleSlug}-${dateStr}.syllabus`;
      await saveToFile(filename, rdf, "Save Syllabus Export");
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
    const syllabusPageElement = syllabusPageRef.current;
    if (!syllabusPageElement) {
      ztoolkit.log("Syllabus page element not found");
      return;
    }

    const progress = new ztoolkit.ProgressWindow("Zotero Syllabus", {
      closeOnClick: false,
      closeTime: -1,
    })
      .createLine({
        text: "Preparing syllabus for print…",
        type: "default",
      })
      .show();

    try {
      const bibliography = await generateBibliographyForPrint(
        items,
        syllabusMetadata.cslStyle || null,
      );
      ztoolkit.log(
        "Print bibliography:",
        bibliography
          ? `${bibliography.isHtml ? "html" : "text"} ${bibliography.content.length} chars from ${items.length} items`
          : `none (${items.length} items)`,
      );
      const bibliographyHtml = bibliography
        ? bibliographyToHtml(
            bibliography.content,
            compactMode,
            bibliography.isHtml,
          )
        : "";
      const innerHTML = serializeSyllabusForPrint(syllabusPageElement);
      ztoolkit.log(
        "Print clone",
        syllabusPageElement.querySelectorAll(".syllabus-class-group").length,
        "class groups,",
        innerHTML.length,
        "chars",
      );
      const htmlContent = await buildPrintableHtml({
        title: title || "Syllabus",
        innerHTML,
        bibliographyHtml,
      });
      const filename = `syllabus-${
        slugify(title || "syllabus", {
          lower: true,
          strict: true,
        }) || "syllabus"
      }.pdf`;
      await openSyllabusPrintDialog(htmlContent, filename, () =>
        progress.close(),
      );
    } catch (err) {
      ztoolkit.log("Error printing syllabus:", err);
      progress.close();
      new ztoolkit.ProgressWindow("Zotero Syllabus", {
        closeOnClick: true,
        closeTime: 5000,
      })
        .createLine({
          text: "Could not save the syllabus PDF",
          type: "fail",
        })
        .show();
    }
  };

  const collection = useMemo(() => {
    return getCachedCollectionById(collectionId);
  }, [collectionId]);

  const addClass = async () => {
    try {
      await SyllabusManager.addClass(collectionId, nextClassNumber, "page");

      // Check for date pattern in previous classes and set next date
      if (nextClassNumber > 1) {
        const previousClasses = Array.from(
          { length: Math.min(3, nextClassNumber - 1) },
          (_, i) => {
            const classNum = nextClassNumber - 1 - i;
            const date = syllabusMetadata.classes?.[classNum]?.readingDate;
            return { classNumber: classNum, date };
          },
        ).filter((c) => c.date); // Only classes with dates

        if (previousClasses.length >= 2) {
          // Calculate intervals between consecutive classes
          const intervals: number[] = [];
          for (let i = 0; i < previousClasses.length - 1; i++) {
            const date1 = new Date(previousClasses[i].date!);
            const date2 = new Date(previousClasses[i + 1].date!);
            const diff = date1.getTime() - date2.getTime();
            intervals.push(diff);
          }

          // Check if intervals are consistent (within 1 day tolerance)
          const avgInterval =
            intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const isConsistent = intervals.every(
            (interval) =>
              Math.abs(interval - avgInterval) < 24 * 60 * 60 * 1000,
          );

          if (isConsistent && avgInterval > 0) {
            // Calculate next date based on pattern
            const lastDate = new Date(previousClasses[0].date!);
            const nextDate = new Date(lastDate.getTime() + avgInterval);
            await SyllabusManager.setClassReadingDate(
              collectionId,
              nextClassNumber,
              nextDate.toISOString(),
              "page",
            );
          }
        }
      }

      // The store should update automatically via the Zotero notifier
      // when the preference changes. The useSyncExternalStore hook will
      // re-render when the store's getSnapshot returns new data.
    } catch (err) {
      ztoolkit.log("Error creating additional class:", err);
    }
  };

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
        tabIndex={-1}
        className={twMerge(
          "syllabus-page overflow-y-auto overflow-x-hidden h-full in-[.print]:scheme-light relative focus:outline-none",
          compactMode && "compact-mode",
          isDraggingFile && "file-drag-over",
        )}
        onKeyDown={handleSyllabusKeyDown}
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
            className={twMerge(
              "sticky top-0 z-40 bg-background py-1",
              isZotero8OrLater() ? "md:pt-8" : "pt-8",
              "in-[.print]:static",
            )}
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
                <div className="flex flex-row items-center gap-2 flex-1 relative">
                  {/* Table of Contents Icon */}
                  <div className="shrink-0 absolute right-full mr-2! in-[.print]:hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTOC((prev) => !prev);
                      }}
                      onMouseOver={() => {
                        setShowTOC(true);
                      }}
                      className="text-secondary hover:text-primary p-1 rounded hover:bg-quinary transition-colors bg-transparent! border-none"
                      title="Table of Contents"
                      aria-label="Table of Contents"
                      data-toc-button="true"
                    >
                      <List size={20} />
                    </button>
                    {showTOC && (
                      <TableOfContents
                        collectionId={collectionId}
                        classGroups={classGroups}
                        isOpen={showTOC}
                        onClose={() => setShowTOC(false)}
                      />
                    )}
                  </div>
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
                          <Menu
                            size={20}
                            className="text-primary hover:text-primary hover:bg-quinary rounded p-1"
                          />
                        ) : (
                          <ListTodo
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
                        data-tour="syllabus-settings-button"
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
                    aria-pressed={isLocked}
                    onClick={() => setLocked(!isLocked)}
                  >
                    {isLocked ? (
                      <Lock
                        size={20}
                        className="text-primary hover:text-primary hover:bg-quinary rounded p-1"
                      />
                    ) : (
                      <Unlock
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
              className={twMerge(
                "py-2 space-y-2",
                compactMode ? "text-base" : "text-lg",
              )}
            >
              <div className="syllabus-masthead-meta flex flex-0! flex-row gap-2 items-center">
                <TextInput
                  elementType="input"
                  initialValue={syllabusMetadata.courseCode || ""}
                  onSave={setCourseCode}
                  className="w-[90px] overflow-hidden text-ellipsis whitespace-nowrap px-0! mx-0! text-primary cursor-pointer shrink-0! grow-0!"
                  placeholder="Course Code"
                  emptyBehavior="delete"
                  readOnly={isLocked}
                />
                <TextInput
                  elementType="input"
                  initialValue={syllabusMetadata.institution || ""}
                  onSave={setInstitution}
                  className="px-0! mx-0! text-primary cursor-pointer grow shrink-0"
                  placeholder="Institution"
                  emptyBehavior="delete"
                  readOnly={isLocked}
                />
              </div>
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

          <LinksSection
            links={syllabusMetadata.links || []}
            setLinks={setLinks}
            isLocked={isLocked}
            compactMode={compactMode}
          />

          <div
            className={twMerge(
              "syllabus-class-groups flex flex-col mb-12",
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
              const hasNoClasses = classGroups.length === 0;

              return (
                <>
                  {!isLocked && hasNoClasses && (
                    <div
                      className="in-[.print]:hidden mb-6 rounded-lg border border-quinary bg-quinary/40 p-6 space-y-3"
                      data-tour="syllabus-empty-state"
                    >
                      <div className="text-xl font-semibold text-primary">
                        {getString("userGuide-empty-title")}
                      </div>
                      <p className="text-secondary text-base m-0">
                        {getString("userGuide-empty-desc")}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          className="syllabus-create-class-button"
                          data-tour="syllabus-add-class"
                          onClick={addClass}
                          title={`Add ${singularCapitalized} ${nextClassNumber}`}
                        >
                          Add {singularCapitalized} {nextClassNumber}
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-md border border-quinary bg-background text-primary cursor-pointer hover:bg-quinary"
                          onClick={() => {
                            const win = Zotero.getMainWindow();
                            if (win) {
                              void showUserGuide(win, true);
                            }
                          }}
                        >
                          {getString("userGuide-empty-tour")}
                        </button>
                      </div>
                    </div>
                  )}

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

                  {!isLocked && !hasNoClasses && (
                    <div className="syllabus-create-class-control in-[.print]:hidden">
                      <button
                        className="syllabus-create-class-button"
                        data-tour="syllabus-add-class"
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
              <div
                className="syllabus-class-group in-[.print]:scheme-light"
                data-tour="syllabus-further-reading"
              >
                <div
                  className={twMerge(
                    "flex flex-row items-baseline gap-2 font-semibold",
                    compactMode ? "text-xl mt-8 mb-2" : "text-2xl mt-12 mb-4",
                  )}
                >
                  Further reading
                  <label className="ml-auto shrink-0 inline-flex items-baseline gap-1.5 in-[.print]:hidden font-normal text-sm text-secondary">
                    <span>Sort</span>
                    <select
                      value={furtherReadingSortBy}
                      onChange={(e) =>
                        setFurtherReadingSortBy(
                          e.currentTarget.value as FurtherReadingSortBy,
                        )
                      }
                      aria-label="Sort further reading"
                      className="text-sm text-primary bg-background border border-quinary rounded px-1.5 py-0.5 cursor-pointer"
                    >
                      <option value="title">Title</option>
                      <option value="creator">Creator</option>
                      <option value="date">Date</option>
                    </select>
                  </label>
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
          </div>
        </div>
      </div>
    </>
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
    "syllabus-custom-view",
  );
}
