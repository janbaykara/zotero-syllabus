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
import { getString, getUiDir, compareLocale } from "../utils/locale";
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
import { useZoteroItemsViewRegularItemIds } from "./react-zotero-sync/itemsViewItems";
import { useZoteroSelectedItemIds } from "./react-zotero-sync/selectedItem";
import { useSyllabusPageSelection } from "./react-zotero-sync/selectedIdentifier";
import { useItemDensity } from "./react-zotero-sync/itemDensity";
import { useReaderMode } from "./react-zotero-sync/readerMode";
import { isZotero8OrLater } from "../utils/zotero";
import {
  getItemTitle,
  isClassNoteItem,
  isSyllabusAssignableItem,
  sortItems,
} from "../utils/items";
import slugify from "slugify";
import {
  openSyllabusSettingsDialog,
  closeSyllabusSettingsDialog,
} from "./openSyllabusSettingsDialog";
import {
  useFurtherReadingSortBy,
  type FurtherReadingSortBy,
} from "./furtherReadingSort";
import {
  ArrowUpDown,
  Settings,
  Lock,
  Unlock,
  List,
  Pin,
  PinOff,
} from "lucide-preact";
import { PublishStatusBanner } from "./PublishStatusBanner";
import { CollectionSaveFormatMenu } from "./CollectionSaveFormatMenu";
import { TableOfContents } from "./TableOfContents";
import {
  buildPrintableHtml,
  serializeSyllabusForPrint,
} from "../utils/printSyllabus";
import { setPinnedSyllabus } from "./pinned";
import { useIsPinnedSyllabus } from "./react-zotero-sync/pinned";
import {
  saveSyllabusExport,
  saveSyllabusPdf,
  type SyllabusExportFormat,
} from "../utils/exportSyllabus";
import { getPublishedSyllabusUrl } from "../utils/publishUrls";
import { copyStringToClipboard } from "../utils/clipboard";
import {
  runCollectionPublish,
  runCollectionUnpublish,
  type CollectionPublishUiStatus,
} from "../utils/runCollectionPublish";
import {
  useSyllabusClassGroups,
  visibleSyllabusClassGroups,
} from "./classGroups";
import type { FurtherReadingEntry } from "./classGroups";
import {
  isDisplayOnlyAssignmentId,
  DISPLAY_NOTE_ASSIGNMENT_PREFIX,
} from "./classGroups";
import {
  ClassSubcollectionPage,
  peekPendingClassScroll,
  subscribePendingClassScroll,
  takePendingClassScroll,
} from "./ClassReadingBlock";
import { scrollElementBelowSticky } from "./galleryGroupNav";
import { getClassSubcollectionContext } from "./syllabusNote";
import { ReadingSchedule } from "./ReadingSchedule";
import { ReadingScheduleDayPage } from "./ReadingScheduleDayPage";
import {
  enqueuePinnedReadingScheduleSync,
  getReadingScheduleCollectionContext,
} from "./readingScheduleCollection";
import { useSyllabusDocumentGeneration } from "./react-zotero-sync/collectionDocument";
import { SyllabusViewMenu } from "./SyllabusViewMenu";
import { useGalleryLayout } from "./galleryLayout";
import { useMagazinePacking } from "./magazinePacking";
import { useShowItemsWithoutAnnotations } from "./showItemsWithoutAnnotations";
import { useShowClassNotes } from "./showClassNotes";
import { GallerySaveGlobalButton } from "./GallerySegmentedControl";
import { syllabusViewKey } from "../utils/viewScope";
import { GalleryViewportProvider } from "./galleryVisibility";
import {
  useExistingAnnotationColors,
  useItemIdsWithAnnotations,
} from "./GalleryAnnotationsRow";
import { ReadingItemsLayout } from "./readingItemsLayout";
import { TextInput } from "./syllabusInputs";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { SyllabusPageDnd, type SyllabusDropTarget } from "./SyllabusPageDnd";
import {
  buildSyllabusIdentifierContainers,
  syllabusDndGroup,
} from "./syllabusDnd";
import { SyllabusDndSortable } from "./SyllabusDndSortable";
import { SyllabusDndZone } from "./SyllabusDndZone";
import {
  filteredSourceAssignmentId,
  syllabusPayloadFromDataTransfer,
  type SyllabusDragPayload,
} from "./syllabusDragPayload";
import { bibliographyToHtml } from "./Bibliography";
import { LinksSection } from "./LinksSection";
import { ClassGroupComponent } from "./ClassGroup";
import type { ItemDropIndicator } from "./ClassGroup";
import { AnnotationSelectionProvider } from "./annotationSelection";
import { AnnotationBatchBar } from "./AnnotationBatchBar";
import { AddReadingButton } from "./AddReadingButton";
import {
  pickAndAddItemsToFurtherReading,
  priorityPatchForUnnumbered,
} from "./addItemsToClass";
import { shouldCaptureCustomViewKeyboard } from "./galleryKeyboardNav";
import {
  isItemContextMenuKey,
  openZoteroItemContextMenu,
} from "../utils/itemContextMenu";
import {
  importDroppedOsFilesIntoCurrentView,
  isOsFileDrag,
  isSyllabusNoteFileName,
  useOsFileDropHandlers,
} from "../utils/nativeFileDrop";
import { OsFileDropOverlay } from "./OsFileDropOverlay";
import {
  assignImportedOsFilesToSyllabus,
  clearSyllabusFileDropzoneHighlights,
  highlightSyllabusFileDropzones,
  hitTargetFromDragEvent,
  resolveSyllabusFileDropTarget,
  type SyllabusFileDropTarget,
} from "./syllabusFileDrop";

export { SyllabusItemCard } from "./SyllabusItemCard";
export { Bibliography } from "./Bibliography";

interface SyllabusPageProps {
  collectionId: number;
}

export function SyllabusPage({ collectionId }: SyllabusPageProps) {
  useSyllabusDocumentGeneration();
  const readingSchedule = getReadingScheduleCollectionContext(collectionId);
  if (readingSchedule?.kind === "root") {
    return <ReadingSchedule libraryID={readingSchedule.root.libraryID} />;
  }
  if (readingSchedule?.kind === "pinned") {
    // Pinned is Table/Gallery only; should not reach syllabus mode.
    return null;
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
  furtherReadingItems: FurtherReadingEntry[],
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

  furtherReadingItems.forEach((entry, index) => {
    entries.push({
      identifier: `item:${entry.item.id}`,
      item: entry.item,
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

async function importSyllabusMetadataFromFile(
  collectionId: number,
  file: File,
): Promise<void> {
  try {
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

    await SyllabusManager.importSyllabusMetadata(
      collectionId,
      fileContents,
      "page",
    );

    ztoolkit.log("Successfully imported and merged syllabus metadata");

    new ztoolkit.ProgressWindow(getString("progress-import-success-title"), {
      closeOnClick: true,
      closeTime: 3000,
    })
      .createLine({
        text: getString("progress-import-success-text"),
        type: "success",
      })
      .show();
  } catch (error) {
    new ztoolkit.ProgressWindow(getString("progress-import-error-title"), {
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
}

type PublishUiStatus = CollectionPublishUiStatus;

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

  const isPersistedLocked = syllabusMetadata.locked || false;
  const syllabusItems = useZoteroCollectionItems(collectionId, {
    includeAssignedClassNotes: true,
  });
  // Visual-only search/tag filter — does not change syllabus configuration.
  const matchingIds = useZoteroItemsViewRegularItemIds(collectionId);
  const isFiltered = matchingIds != null;
  const isLocked = isPersistedLocked || isFiltered;
  const displayViewKey = syllabusViewKey(collectionId);
  const [showClassNotes] = useShowClassNotes(displayViewKey);
  const displaySyllabusItems = useMemo(() => {
    const includeNotes = (zoteroItem: Zotero.Item) =>
      showClassNotes || !isClassNoteItem(zoteroItem);
    if (!matchingIds) {
      return syllabusItems.filter(({ zoteroItem }) => includeNotes(zoteroItem));
    }
    // Notes are not “regular” items in Zotero’s items tree, so tag/search
    // filters omit them from matchingIds — keep every class note listed
    // when Show notes is on.
    return syllabusItems.filter(
      ({ zoteroItem }) =>
        includeNotes(zoteroItem) &&
        (matchingIds.has(zoteroItem.id) || isClassNoteItem(zoteroItem)),
    );
  }, [syllabusItems, matchingIds, showClassNotes]);
  const classAssignments = useMemo(() => {
    return syllabusItems.map((item) => item.assignments).flat();
  }, [syllabusItems]);
  const items = useMemo(() => {
    return syllabusItems.map((item) => item.zoteroItem);
  }, [syllabusItems]);
  const hasClassNotes = useMemo(
    () => syllabusItems.some(({ zoteroItem }) => isClassNoteItem(zoteroItem)),
    [syllabusItems],
  );

  // Track drag state for showing "Add to Class X" dropzone
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<ItemDropIndicator | null>(
    null,
  );
  const [draggingIdentifiers, setDraggingIdentifiers] = useState<Set<string>>(
    () => new Set(),
  );
  const [draggingSourceClass, setDraggingSourceClass] = useState<
    number | "unnumbered" | null
  >(null);

  const handleDropIndicatorChange = useCallback(
    (indicator: ItemDropIndicator | null) => {
      setDropIndicator((current) => {
        if (current == null && indicator == null) {
          return current;
        }
        if (
          current &&
          indicator &&
          current.classNumber === indicator.classNumber &&
          current.zone === indicator.zone &&
          current.identifier === indicator.identifier &&
          current.edge === indicator.edge
        ) {
          return current;
        }
        return indicator;
      });
    },
    [],
  );

  const [osFileDropTarget, setOsFileDropTarget] =
    useState<SyllabusFileDropTarget>({ kind: "collection" });

  const fileDrop = useOsFileDropHandlers({
    onOsFileDrop: async (event) => {
      const files = Array.from(event.dataTransfer?.files || []);
      for (const file of files) {
        if (isSyllabusNoteFileName(file.name)) {
          await importSyllabusMetadataFromFile(collectionId, file);
        }
      }
      const added = await importDroppedOsFilesIntoCurrentView(event, {
        skipFileName: isSyllabusNoteFileName,
      });
      if (isLocked || added.length === 0) {
        return;
      }
      await assignImportedOsFilesToSyllabus(
        added,
        collectionId,
        resolveSyllabusFileDropTarget(hitTargetFromDragEvent(event)),
      );
    },
    onOsFileDragHover: (event) => {
      if (!event) {
        clearSyllabusFileDropzoneHighlights();
        setOsFileDropTarget({ kind: "collection" });
        return;
      }
      const hit = hitTargetFromDragEvent(event);
      setOsFileDropTarget(resolveSyllabusFileDropTarget(hit));
      highlightSyllabusFileDropzones(hit);
    },
  });

  // Track item order changes to trigger re-computation
  const [itemOrderVersion, setItemOrderVersion] = useState(0);

  const [density] = useItemDensity(displayViewKey);
  // Collection-scoped so Gallery and Syllabus share the same checkbox toggle.
  const [readerMode] = useReaderMode(collectionId);
  const [browseLayout, setBrowseLayout, browseLayoutGlobal] =
    useGalleryLayout(displayViewKey);
  const [magazinePacking, setMagazinePacking, magazinePackingGlobal] =
    useMagazinePacking(displayViewKey);
  const effectiveLayout = isLocked ? browseLayout : "card";
  const isAnnotationsLayout = isLocked && effectiveLayout === "annotations";
  const [showItemsWithoutAnnotations] =
    useShowItemsWithoutAnnotations(displayViewKey);
  const libraryID =
    getCachedCollectionById(collectionId)?.libraryID ??
    Zotero.Libraries.userLibraryID;

  const isPinned = useIsPinnedSyllabus(collectionId);

  const handleTogglePin = async () => {
    const collection =
      getCachedCollectionById(collectionId) ||
      Zotero.Collections.get(collectionId);
    if (!collection) {
      return;
    }
    const next = !isPinned;
    const ok = await setPinnedSyllabus(collection, next);
    if (ok) {
      enqueuePinnedReadingScheduleSync();
    } else if (next) {
      ztoolkit.log("Could not pin collection");
    }
  };

  // Settings popout (DialogHelper window)
  useEffect(() => {
    const win = Zotero.getMainWindow();
    if (!win) {
      return;
    }
    const openSettings = () => openSyllabusSettingsDialog(collectionId);
    const closeSettings = () => closeSyllabusSettingsDialog();
    win.addEventListener(TOUR_EVENT_OPEN_SETTINGS, openSettings);
    win.addEventListener(TOUR_EVENT_CLOSE_SETTINGS, closeSettings);
    return () => {
      win.removeEventListener(TOUR_EVENT_OPEN_SETTINGS, openSettings);
      win.removeEventListener(TOUR_EVENT_CLOSE_SETTINGS, closeSettings);
    };
  }, [collectionId]);

  // Table of Contents state
  const [showTOC, setShowTOC] = useState(false);

  // Selection (separate from Zotero): page-local ids, Jotai default store for ItemPane.
  // Format: "assignment:${assignmentId}" or "item:${itemId}"
  const {
    selectedIdentifiers,
    setSelectedIdentifiers,
    selectedIdentifiersRef,
  } = useSyllabusPageSelection(collectionId);
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
        // Unassigned class notes use a display-only id — drag as the item.
        if (isDisplayOnlyAssignmentId(assignmentId)) {
          const noteKey = assignmentId.slice(
            DISPLAY_NOTE_ASSIGNMENT_PREFIX.length,
          );
          const syllabusItem = syllabusItems.find(
            (entry) => entry.zoteroItem.key === noteKey,
          );
          if (syllabusItem) {
            itemIds.push(syllabusItem.zoteroItem.id);
          }
          continue;
        }
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
        } else if (!e) {
          // Programmatic select (e.g. newly created note): always select.
          newSet.clear();
          newSet.add(identifier);
        } else {
          // Replace selection (click toggles off when already sole selection)
          if (prev.size > 1) {
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
        } else if (!e) {
          // Programmatic: keep / set Zotero selection (do not toggle off).
          void pane.selectItem(item.id);
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

  const handleContextMenu = useCallback(
    (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => {
      void openZoteroItemContextMenu(item, e);
    },
    [],
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
            if (item && isSyllabusAssignableItem(item)) {
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

  // Set up global drag event listeners
  useEffect(() => {
    const clearDragUi = () => {
      setIsDragging(false);
      setDropIndicator(null);
      setDraggingIdentifiers(new Set());
      setDraggingSourceClass(null);
    };

    const handleGlobalDragStart = (e: DragEvent) => {
      // Only track drags that originate from syllabus items
      const target = e.target as HTMLElement | null;
      const card = target?.closest?.(
        ".syllabus-item-card",
      ) as HTMLElement | null;
      if (!card) {
        return;
      }
      setIsDragging(true);
      const identifier = card.dataset.syllabusIdentifier;
      if (identifier) {
        const selected = selectedIdentifiersRef.current;
        if (selected.has(identifier) && selected.size > 0) {
          setDraggingIdentifiers(new Set(selected));
        } else {
          setDraggingIdentifiers(new Set([identifier]));
        }
      }
      const classAttr = card.dataset.syllabusClassNumber;
      if (classAttr === "unnumbered") {
        setDraggingSourceClass("unnumbered");
      } else if (classAttr && /^\d+$/.test(classAttr)) {
        setDraggingSourceClass(parseInt(classAttr, 10));
      } else {
        setDraggingSourceClass(null);
      }
    };

    const handleGlobalDragEnd = () => {
      clearDragUi();
    };

    const handleGlobalDrop = () => {
      // Reset drag state when drop occurs
      clearDragUi();
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

  // Listen to metadata changes for item order (now part of metadata)
  // The useZoteroSyllabusMetadata hook will trigger re-renders when metadata changes
  // We use itemOrderVersion to force re-computation of class groups when order changes
  useEffect(() => {
    // This effect will run when syllabusMetadata changes, which includes item order
    setItemOrderVersion((v) => v + 1);
  }, [syllabusMetadata]);

  const [
    furtherReadingSortBy,
    setFurtherReadingSortBy,
    furtherReadingSortGlobal,
  ] = useFurtherReadingSortBy(collectionId);

  // Compute class groups and further reading items from synced items
  // Re-compute when items change or item order changes
  const { classGroups, furtherReadingItems: unsortedFurtherReading } =
    useSyllabusClassGroups(
      collectionId,
      displaySyllabusItems,
      syllabusMetadata,
      itemOrderVersion,
    );

  const hideEmptyAnnotationGroups =
    effectiveLayout === "annotations" && !showItemsWithoutAnnotations;
  const allItemsForAnnotationFilter = useMemo(
    () => [
      ...classGroups.flatMap((group) =>
        group.itemAssignments.map(({ item }) => item),
      ),
      ...unsortedFurtherReading.map(({ item }) => item),
    ],
    [classGroups, unsortedFurtherReading],
  );
  const annotatedItemIds = useItemIdsWithAnnotations(
    allItemsForAnnotationFilter,
    hideEmptyAnnotationGroups,
  );
  const annotationColors = useExistingAnnotationColors(
    effectiveLayout === "annotations" ? allItemsForAnnotationFilter : [],
  );

  const visibleClassGroups = useMemo(() => {
    let groups = visibleSyllabusClassGroups(classGroups, {
      hideEmpty: isLocked,
      requireItems: isFiltered,
    });
    if (hideEmptyAnnotationGroups) {
      if (!annotatedItemIds) {
        groups = [];
      } else {
        groups = groups
          .map((group) => ({
            ...group,
            itemAssignments: group.itemAssignments.filter(
              ({ item }) =>
                isClassNoteItem(item) || annotatedItemIds.has(item.id),
            ),
          }))
          .filter((group) => group.itemAssignments.length > 0);
      }
    }
    // Unlocked: always keep the unnumbered top section so “Add readings” is available.
    if (
      !isLocked &&
      !isFiltered &&
      !groups.some((group) => group.classNumber == null)
    ) {
      groups = [
        {
          classNumber: null,
          syllabusMetadata: classByNumber(syllabusMetadata, null),
          itemAssignments: [],
        },
        ...groups,
      ];
    }
    return groups;
  }, [
    classGroups,
    isLocked,
    isFiltered,
    hideEmptyAnnotationGroups,
    annotatedItemIds,
    syllabusMetadata,
  ]);

  const furtherReadingItems = useMemo(() => {
    // Manual drag order (synced on the syllabus note) wins over the local sort pref.
    const sorted =
      SyllabusManager.getFurtherReadingOrder(collectionId).length > 0
        ? unsortedFurtherReading
        : (() => {
            const byId = new Map(
              unsortedFurtherReading.map((entry) => [entry.item.id, entry]),
            );
            return sortItems(
              unsortedFurtherReading.map((entry) => entry.item),
              furtherReadingSortBy,
            )
              .map((item) => byId.get(item.id))
              .filter((entry): entry is FurtherReadingEntry => entry != null);
          })();
    if (!hideEmptyAnnotationGroups) {
      return sorted;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return sorted.filter(({ item }) => annotatedItemIds.has(item.id));
  }, [
    unsortedFurtherReading,
    furtherReadingSortBy,
    collectionId,
    itemOrderVersion,
    hideEmptyAnnotationGroups,
    annotatedItemIds,
  ]);

  const furtherReadingHasManualOrder =
    SyllabusManager.getFurtherReadingOrder(collectionId).length > 0;

  const syllabusIdentifierContainers = useMemo(
    () =>
      buildSyllabusIdentifierContainers(
        visibleClassGroups,
        furtherReadingItems,
      ),
    [visibleClassGroups, furtherReadingItems],
  );

  const syllabusChromeDnd = !isLocked;

  const navigableEntries = useMemo(
    () => getNavigableSyllabusEntries(visibleClassGroups, furtherReadingItems),
    [visibleClassGroups, furtherReadingItems],
  );

  const navStateRef = useRef({
    selectedIdentifiers,
    navigableEntries,
  });
  navStateRef.current = { selectedIdentifiers, navigableEntries };

  const handleSyllabusKeyDown = useCallback((event: Event) => {
    const e = event as KeyboardEvent;
    if (!shouldCaptureCustomViewKeyboard(e)) {
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const isDown = e.key === "ArrowDown" || e.key === "Down";
    const isUp = e.key === "ArrowUp" || e.key === "Up";
    const isContextMenu = isItemContextMenuKey(e);
    if (!isDown && !isUp && !isContextMenu) {
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
      isDown || isContextMenu ? "down" : "up",
    );
    if (currentIndex < 0) {
      return;
    }

    if (isContextMenu) {
      const entry = entries[currentIndex];
      const container = syllabusPageRef.current;
      const el = container?.querySelector(
        `[data-syllabus-identifier="${CSS.escape(entry.identifier)}"]`,
      );
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") {
        e.stopImmediatePropagation();
      }
      void openZoteroItemContextMenu(
        entry.item,
        e,
        el instanceof Element ? el : null,
      );
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
    const win = Zotero.getMainWindow();
    const doc = win?.document ?? document;
    doc.addEventListener("keydown", handleSyllabusKeyDown, true);
    return () => {
      doc.removeEventListener("keydown", handleSyllabusKeyDown, true);
    };
  }, [handleSyllabusKeyDown]);

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

  // Deep link from Home Cover class headers (and similar).
  const tryPendingClassScroll = useCallback(() => {
    const pending = peekPendingClassScroll(collectionId);
    if (!pending) {
      return;
    }
    const container = syllabusPageRef.current;
    if (!container) {
      return;
    }
    const sticky = container.querySelector<HTMLElement>(
      "[syllabus-view-title-container]",
    );
    const itemId = pending.itemId;
    const syllabusIdentifier = pending.syllabusIdentifier;
    if (syllabusIdentifier) {
      const assignmentCard = container.querySelector<HTMLElement>(
        `[data-syllabus-identifier="${CSS.escape(syllabusIdentifier)}"]`,
      );
      if (assignmentCard) {
        takePendingClassScroll(collectionId);
        setSelectedIdentifiers(new Set([syllabusIdentifier]));
        if (itemId != null) {
          try {
            ztoolkit.getGlobal("ZoteroPane").selectItem(itemId);
          } catch (error) {
            ztoolkit.log("Error selecting deep-linked syllabus item:", error);
          }
        }
        scrollElementBelowSticky(container, assignmentCard, sticky, 16);
        return;
      }
    }
    const itemCard =
      itemId != null && !syllabusIdentifier
        ? container.querySelector<HTMLElement>(`[data-item-id="${itemId}"]`)
        : null;
    if (itemCard && itemId != null) {
      takePendingClassScroll(collectionId);
      try {
        ztoolkit.getGlobal("ZoteroPane").selectItem(itemId);
      } catch (error) {
        ztoolkit.log("Error selecting deep-linked syllabus item:", error);
      }
      scrollElementBelowSticky(container, itemCard, sticky, 16);
      return;
    }
    const target = container.querySelector<HTMLElement>(
      `#${CSS.escape(pending.elementId)}`,
    );
    if (!target) {
      return;
    }
    if (syllabusIdentifier) {
      scrollElementBelowSticky(container, target, sticky, 16);
      return;
    }
    takePendingClassScroll(collectionId);
    if (itemId != null) {
      try {
        ztoolkit.getGlobal("ZoteroPane").selectItem(itemId);
      } catch (error) {
        ztoolkit.log("Error selecting deep-linked syllabus item:", error);
      }
    }
    scrollElementBelowSticky(container, target, sticky, 16);
  }, [collectionId]);

  useEffect(() => {
    return subscribePendingClassScroll(() => {
      const win = Zotero.getMainWindow();
      win.setTimeout(() => tryPendingClassScroll(), 0);
    });
  }, [tryPendingClassScroll]);

  useEffect(() => {
    tryPendingClassScroll();
  }, [tryPendingClassScroll, visibleClassGroups, furtherReadingItems]);

  // Drop a stale deep-link if the class section never mounts (empty/filtered).
  useEffect(() => {
    const pending = peekPendingClassScroll(collectionId);
    if (!pending) {
      return;
    }
    const elementId = pending.elementId;
    const win = Zotero.getMainWindow();
    const timer = win.setTimeout(() => {
      const still = peekPendingClassScroll(collectionId);
      if (still && still.elementId === elementId) {
        takePendingClassScroll(collectionId);
      }
    }, 4000);
    return () => win.clearTimeout(timer);
  }, [collectionId, visibleClassGroups, furtherReadingItems]);

  const persistFurtherReadingOrder = useCallback(
    async (
      draggedItemIds: number[],
      options: {
        targetItemId?: number;
        insertBefore?: boolean;
        removeOnly?: boolean;
      } = {},
    ) => {
      const draggedKeys = draggedItemIds
        .map((id) => getCachedItem(id)?.key)
        .filter((key): key is string => Boolean(key));
      if (draggedKeys.length === 0) {
        return;
      }

      let currentOrder = SyllabusManager.getFurtherReadingOrder(collectionId);

      if (options.removeOnly) {
        if (currentOrder.length === 0) {
          return;
        }
        const next = currentOrder.filter((key) => !draggedKeys.includes(key));
        if (next.length !== currentOrder.length) {
          await SyllabusManager.setFurtherReadingOrder(
            collectionId,
            next,
            "page",
          );
        }
        return;
      }

      if (currentOrder.length === 0) {
        currentOrder = furtherReadingItems.map((entry) => entry.item.key);
      }

      const newOrder = currentOrder.filter((key) => !draggedKeys.includes(key));
      const keysToInsert = draggedKeys.filter(
        (key, index) => draggedKeys.indexOf(key) === index,
      );

      if (options.targetItemId !== undefined) {
        const targetKey = getCachedItem(options.targetItemId)?.key;
        const targetIndex = targetKey ? newOrder.indexOf(targetKey) : -1;
        if (targetIndex !== -1) {
          if (options.insertBefore) {
            newOrder.splice(targetIndex, 0, ...keysToInsert);
          } else {
            newOrder.splice(targetIndex + 1, 0, ...keysToInsert);
          }
        } else {
          newOrder.push(...keysToInsert);
        }
      } else {
        newOrder.push(...keysToInsert);
      }

      await SyllabusManager.setFurtherReadingOrder(
        collectionId,
        newOrder,
        "page",
      );
    },
    [collectionId, furtherReadingItems],
  );

  const handleDrop = async (
    e: JSX.TargetedDragEvent<HTMLElement>,
    targetClassNumber: number | null,
    targetItemId?: number,
    insertBefore?: boolean,
    zone?: "further-reading",
  ) => {
    if (isOsFileDrag(e.dataTransfer)) {
      e.preventDefault();
      return;
    }
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
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
    setDropIndicator(null);

    const payload = syllabusPayloadFromDataTransfer(e.dataTransfer);
    if (!payload) {
      return;
    }
    await runSyllabusDrop(payload, {
      targetClassNumber,
      targetItemId,
      insertBefore,
      zone,
    });
  };

  const runSyllabusDrop = async (
    payload: SyllabusDragPayload,
    {
      targetClassNumber,
      targetItemId,
      targetAssignmentId: dropTargetAssignmentId,
      insertBefore,
      zone,
    }: SyllabusDropTarget,
  ) => {
    const itemIdStr = payload.itemIdStr;
    if (!itemIdStr) {
      return;
    }

    const targetClassNumberValue =
      targetClassNumber === null ? undefined : targetClassNumber;
    const toUnnumbered =
      targetClassNumber === null && zone !== "further-reading";
    const toFurtherReading = zone === "further-reading";

    const fromFurtherReading = payload.fromFurtherReading;
    const fromUnnumbered = payload.fromUnnumbered;

    const assignmentMatchesTargetClass = (
      assignment: ItemSyllabusAssignment,
      classNumber: number | null,
    ) => {
      const resolved =
        SyllabusManager.getClassNumber(collectionId, assignment.classId) ??
        assignment.classNumber;
      if (classNumber === null) {
        return resolved === undefined;
      }
      return resolved === classNumber;
    };

    const currentOrderForClass = (classNumber: number | null): string[] => {
      let currentOrder = SyllabusManager.getClassItemOrder(
        collectionId,
        classNumber,
      );
      if (currentOrder.length === 0) {
        const group = classGroups.find((g) => g.classNumber === classNumber);
        currentOrder =
          group?.itemAssignments
            .map(({ assignment }) => assignment.id)
            .filter((id): id is string => Boolean(id)) ?? [];
      }
      return currentOrder;
    };

    /**
     * Blue-line assignment id for insert position. Prefer the sortable host id
     * — one Zotero item can have several assignments in the same class, so
     * looking up by item id alone returns the wrong (often: the dragged) row.
     */
    const resolveDropTargetAssignmentId = (
      classNumber: number | null,
      excludeAssignmentIds: string[] = [],
    ): string | undefined => {
      if (
        dropTargetAssignmentId &&
        !excludeAssignmentIds.includes(dropTargetAssignmentId)
      ) {
        return dropTargetAssignmentId;
      }
      if (targetItemId === undefined) {
        return undefined;
      }
      const targetItem = syllabusItems.find(
        (item) => item.zoteroItem.id === targetItemId,
      );
      return targetItem?.assignments.find(
        (a) =>
          Boolean(a.id) &&
          assignmentMatchesTargetClass(a, classNumber) &&
          !excludeAssignmentIds.includes(a.id!),
      )?.id;
    };

    /** Insert at the blue-line position (or append) in a class / unnumbered order. */
    const insertAssignmentsAtDropLine = async (
      classNumber: number | null,
      assignmentIds: string[],
    ) => {
      if (assignmentIds.length === 0) {
        return;
      }
      const newOrder = currentOrderForClass(classNumber).filter(
        (id) => !assignmentIds.includes(id),
      );
      const targetAssignmentId = resolveDropTargetAssignmentId(
        classNumber,
        assignmentIds,
      );
      const targetIndex = targetAssignmentId
        ? newOrder.findIndex((id) => id === targetAssignmentId)
        : -1;
      if (targetIndex !== -1) {
        if (insertBefore) {
          newOrder.splice(targetIndex, 0, ...assignmentIds);
        } else {
          newOrder.splice(targetIndex + 1, 0, ...assignmentIds);
        }
      } else {
        newOrder.push(...assignmentIds);
      }
      void SyllabusManager.setClassItemOrder(
        collectionId,
        classNumber,
        newOrder,
        "page",
      );
    };

    // Reorder within Further reading (no assignment mutation)
    if (fromFurtherReading && toFurtherReading && targetItemId !== undefined) {
      const itemIds = itemIdStr
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      void persistFurtherReadingOrder(itemIds, {
        targetItemId,
        insertBefore,
      });
      setItemOrderVersion((v) => v + 1);
      return;
    }

    // Reorder within unnumbered / Course Information (assignment IDs).
    // Include display-only class-note ids (`note:…`) — they live in this list.
    if (fromUnnumbered && toUnnumbered) {
      const multipleAssignmentIdsStr = payload.multipleAssignmentIdsStr;
      const draggedAssignmentIds = multipleAssignmentIdsStr
        ? multipleAssignmentIdsStr.split(",").filter(Boolean)
        : payload.sourceAssignmentIdRaw
          ? [payload.sourceAssignmentIdRaw]
          : [];
      if (draggedAssignmentIds.length === 0) {
        return;
      }

      void insertAssignmentsAtDropLine(null, draggedAssignmentIds);
      setItemOrderVersion((v) => v + 1);
      return;
    }

    // Check for multiple assignment IDs (multi-select drag)
    const multipleAssignmentIdsStr = payload.multipleAssignmentIdsStr;

    // Check if we have multiple items (could be assignments or unassigned items)
    const hasMultipleItems = itemIdStr.includes(",");

    if (multipleAssignmentIdsStr || hasMultipleItems) {
      // Handle multiple assignments drag (or multiple items including unassigned)
      const assignmentIds = multipleAssignmentIdsStr
        ? multipleAssignmentIdsStr
            .split(",")
            .filter((id) => id && !isDisplayOnlyAssignmentId(id))
        : [];
      const itemIds = itemIdStr
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));

      try {
        // Get source class number for reordering
        const sourceClassNumberStr = payload.sourceClassNumberStr;
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

        // Same-class multi reorder: only touch itemOrder (no per-item note writes).
        if (isReorder && targetClassNumberValue !== undefined) {
          let currentOrder = SyllabusManager.getClassItemOrder(
            collectionId,
            targetClassNumberValue,
          );
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
                return compareLocale(
                  getItemTitle(assignmentA.zoteroItem),
                  getItemTitle(assignmentB.zoteroItem),
                );
              }
              return 0;
            });
            currentOrder = classAssignments
              .map((assignment) => assignment.id!)
              .filter(Boolean);
          }
          const newOrder = currentOrder.filter(
            (id) => !assignmentIds.includes(id),
          );
          const targetAssignmentId = resolveDropTargetAssignmentId(
            targetClassNumberValue,
            assignmentIds,
          );
          const targetIndex = targetAssignmentId
            ? newOrder.findIndex((id) => id === targetAssignmentId)
            : -1;
          if (targetIndex !== -1) {
            if (insertBefore) {
              newOrder.splice(targetIndex, 0, ...assignmentIds);
            } else {
              newOrder.splice(targetIndex + 1, 0, ...assignmentIds);
            }
          } else {
            newOrder.push(...assignmentIds);
          }
          void SyllabusManager.setClassItemOrder(
            collectionId,
            targetClassNumberValue,
            newOrder,
            "page",
          );
          setItemOrderVersion((v) => v + 1);
          return;
        }

        // Process each assignment
        const processedAssignmentIds: string[] = [];
        for (const assignmentId of assignmentIds) {
          // Find the assignment and its item
          let draggedItem: Zotero.Item | null = null;
          let matchingAssignment: ItemSyllabusAssignment | undefined;
          for (const syllabusItem of syllabusItems) {
            matchingAssignment = syllabusItem.assignments.find(
              (a) => a.id === assignmentId,
            );
            if (matchingAssignment) {
              draggedItem = syllabusItem.zoteroItem;
              break;
            }
          }

          if (!draggedItem || !isSyllabusAssignableItem(draggedItem)) continue;

          // Update assignment to target class (unnumbered needs a priority)
          void SyllabusManager.updateClassAssignment(
            draggedItem,
            collectionId,
            assignmentId,
            {
              classNumber: targetClassNumberValue,
              ...(toUnnumbered
                ? priorityPatchForUnnumbered(collectionId, matchingAssignment)
                : {}),
            },
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
            if (item && isSyllabusAssignableItem(item)) {
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
              if (
                existingAssignments.length === 0 &&
                (targetClassNumberValue !== undefined || toUnnumbered)
              ) {
                // Add assignment to target class / unnumbered for unassigned items
                await SyllabusManager.addClassAssignment(
                  item,
                  collectionId,
                  toUnnumbered ? null : targetClassNumberValue,
                  toUnnumbered ? priorityPatchForUnnumbered(collectionId) : {},
                  "page",
                );
                processedItemIds.push(itemId);

                // Get the newly created assignment ID
                const updatedSyllabusData =
                  SyllabusManager.getItemSyllabusData(item);
                const updatedAssignments =
                  updatedSyllabusData?.[collectionKeyStr] || [];
                const newAssignment = updatedAssignments.find((a) => {
                  if (!a.id) {
                    return false;
                  }
                  if (toUnnumbered) {
                    return Boolean(a.priority || a.classInstruction);
                  }
                  return a.classNumber === targetClassNumberValue;
                });
                if (newAssignment?.id) {
                  newlyCreatedAssignmentIds.push(newAssignment.id);
                }
              }
            }
          } catch (err) {
            ztoolkit.log("Error processing unassigned item:", err);
          }
        }

        if (
          fromFurtherReading &&
          (targetClassNumberValue !== undefined || toUnnumbered)
        ) {
          void persistFurtherReadingOrder(itemIds, { removeOnly: true });
        } else if (toFurtherReading) {
          void persistFurtherReadingOrder(itemIds, {
            targetItemId,
            insertBefore,
          });
        } else if (
          toUnnumbered &&
          (processedAssignmentIds.length > 0 ||
            newlyCreatedAssignmentIds.length > 0)
        ) {
          void insertAssignmentsAtDropLine(null, [
            ...processedAssignmentIds,
            ...newlyCreatedAssignmentIds,
          ]);
        } else if (
          targetClassNumberValue !== undefined &&
          (fromUnnumbered || fromFurtherReading) &&
          (processedAssignmentIds.length > 0 ||
            newlyCreatedAssignmentIds.length > 0)
        ) {
          // Unnumbered / further reading → class: honour the blue line.
          void insertAssignmentsAtDropLine(targetClassNumberValue, [
            ...processedAssignmentIds,
            ...newlyCreatedAssignmentIds,
          ]);
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
    if (!draggedItem || !isSyllabusAssignableItem(draggedItem)) return;

    // Get source assignment ID from drag data (if dragging from a class)
    const sourceAssignmentId = filteredSourceAssignmentId(
      payload.sourceAssignmentIdRaw,
    );

    // Get source class number for reordering
    const sourceClassNumberStr = payload.sourceClassNumberStr;
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
            return compareLocale(getItemTitle(itemA), getItemTitle(itemB));
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

      // Prefer blue-line assignment id — same item can have several class rows.
      const targetAssignmentId = resolveDropTargetAssignmentId(
        targetClassNumberValue,
        [sourceAssignmentId],
      );

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

      // Update manual order (optimistic cache + background note save)
      void SyllabusManager.setClassItemOrder(
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

      // Cross-list move into this class: insert at the blue line.
      // Includes numbered→numbered, unnumbered→class, further-reading→class.
      if (
        sourceAssignmentId &&
        ((sourceClassNumber !== undefined &&
          sourceClassNumber !== targetClassNumberValue) ||
          fromUnnumbered ||
          fromFurtherReading)
      ) {
        if (sourceClassNumber !== undefined) {
          const sourceOrder = SyllabusManager.getClassItemOrder(
            collectionId,
            sourceClassNumber,
          );
          const updatedSourceOrder = sourceOrder.filter(
            (id) => id !== sourceAssignmentId,
          );
          void SyllabusManager.setClassItemOrder(
            collectionId,
            sourceClassNumber,
            updatedSourceOrder,
            "page",
          );
        }

        void insertAssignmentsAtDropLine(targetClassNumberValue, [
          sourceAssignmentId,
        ]);
        setItemOrderVersion((v) => v + 1);
      }
    }

    if (sourceAssignmentId) {
      // Dragging from a class / unnumbered / further reading with an assignment: MOVE it
      // Update the assignment's classNumber using its ID
      // If target is undefined (dropping to further reading or unnumbered), remove classNumber

      const leavingNumberedClass =
        sourceClassNumber !== undefined &&
        sourceClassNumber !== targetClassNumberValue;
      const leavingUnnumbered = fromUnnumbered && !toUnnumbered;

      if (leavingNumberedClass) {
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
          void SyllabusManager.setClassItemOrder(
            collectionId,
            sourceClassNumber,
            updatedSourceOrder,
          );
        }

        // If moving to a numbered class, add to target class order
        if (targetClassNumberValue !== undefined) {
          const targetOrder = SyllabusManager.getClassItemOrder(
            collectionId,
            targetClassNumberValue,
          );
          if (
            targetOrder.length > 0 &&
            !targetOrder.includes(sourceAssignmentId)
          ) {
            const updatedTargetOrder = [...targetOrder, sourceAssignmentId];
            void SyllabusManager.setClassItemOrder(
              collectionId,
              targetClassNumberValue,
              updatedTargetOrder,
              "page",
            );
          }
          setItemOrderVersion((v) => v + 1);
        }
      }

      if (leavingUnnumbered) {
        const sourceOrder = SyllabusManager.getClassItemOrder(
          collectionId,
          null,
        );
        if (sourceOrder.includes(sourceAssignmentId)) {
          void SyllabusManager.setClassItemOrder(
            collectionId,
            null,
            sourceOrder.filter((id) => id !== sourceAssignmentId),
            "page",
          );
        }
      }

      const existingAssignment =
        SyllabusManager.getItemSyllabusDataForCollection(
          draggedItem,
          collectionId,
        ).find((a) => a.id === sourceAssignmentId);

      // Optimistic assignment patch; note save continues in background.
      void SyllabusManager.updateClassAssignment(
        draggedItem,
        collectionId,
        sourceAssignmentId,
        {
          classNumber: targetClassNumberValue,
          ...(toUnnumbered
            ? priorityPatchForUnnumbered(collectionId, existingAssignment)
            : {}),
        },
        "page",
      );

      if (fromFurtherReading && targetClassNumberValue !== undefined) {
        void persistFurtherReadingOrder([draggedItem.id], {
          removeOnly: true,
        });
        setItemOrderVersion((v) => v + 1);
      } else if (fromFurtherReading && toUnnumbered) {
        void persistFurtherReadingOrder([draggedItem.id], {
          removeOnly: true,
        });
        setItemOrderVersion((v) => v + 1);
      } else if (toFurtherReading) {
        void persistFurtherReadingOrder([draggedItem.id], {
          targetItemId,
          insertBefore,
        });
        setItemOrderVersion((v) => v + 1);
      } else if (toUnnumbered && !fromUnnumbered) {
        const newOrder = currentOrderForClass(null).filter(
          (id) => id !== sourceAssignmentId,
        );
        const targetAssignmentId = resolveDropTargetAssignmentId(null, [
          sourceAssignmentId,
        ]);
        const targetIndex = targetAssignmentId
          ? newOrder.findIndex((id) => id === targetAssignmentId)
          : -1;
        if (targetIndex !== -1) {
          if (insertBefore) {
            newOrder.splice(targetIndex, 0, sourceAssignmentId);
          } else {
            newOrder.splice(targetIndex + 1, 0, sourceAssignmentId);
          }
        } else {
          newOrder.push(sourceAssignmentId);
        }
        void SyllabusManager.setClassItemOrder(
          collectionId,
          null,
          newOrder,
          "page",
        );
        setItemOrderVersion((v) => v + 1);
      }
    } else {
      // No stored assignment (further reading, or display-only unassigned note):
      // create a new class assignment when dropping onto a numbered class.
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
            void SyllabusManager.setClassItemOrder(
              collectionId,
              targetClassNumberValue,
              updatedTargetOrder,
              "page",
            );
            setItemOrderVersion((v) => v + 1);
          }
        }

        if (fromFurtherReading) {
          void persistFurtherReadingOrder([draggedItem.id], {
            removeOnly: true,
          });
          setItemOrderVersion((v) => v + 1);
        }

        ztoolkit.log("Assignment created successfully");
      } else if (toUnnumbered) {
        // Further reading / unassigned → Course Information: need a priority.
        const newAssignmentId = await SyllabusManager.addClassAssignment(
          draggedItem,
          collectionId,
          null,
          priorityPatchForUnnumbered(collectionId),
          "page",
        );
        if (newAssignmentId) {
          const newOrder = currentOrderForClass(null).filter(
            (id) => id !== newAssignmentId,
          );
          const targetAssignmentId = resolveDropTargetAssignmentId(null, [
            newAssignmentId,
          ]);
          const targetIndex = targetAssignmentId
            ? newOrder.findIndex((id) => id === targetAssignmentId)
            : -1;
          if (targetIndex !== -1) {
            if (insertBefore) {
              newOrder.splice(targetIndex, 0, newAssignmentId);
            } else {
              newOrder.splice(targetIndex + 1, 0, newAssignmentId);
            }
          } else {
            newOrder.push(newAssignmentId);
          }
          void SyllabusManager.setClassItemOrder(
            collectionId,
            null,
            newOrder,
            "page",
          );
        }
        if (fromFurtherReading) {
          void persistFurtherReadingOrder([draggedItem.id], {
            removeOnly: true,
          });
        }
        setItemOrderVersion((v) => v + 1);
      } else if (toFurtherReading) {
        // Dropping to "further reading" with no assignment - reorder/append only
        void persistFurtherReadingOrder([draggedItem.id], {
          targetItemId,
          insertBefore,
        });
        setItemOrderVersion((v) => v + 1);
        ztoolkit.log(
          "Dropping unassigned item to further reading - updated order",
        );
      }
    }
  };

  const handleDragOver = (e: JSX.TargetedDragEvent<HTMLElement>) => {
    if (isOsFileDrag(e.dataTransfer)) {
      e.preventDefault();
      return;
    }
    if (isLocked) {
      e.preventDefault();
      return;
    }
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

  const handleExportFormat = async (format: SyllabusExportFormat) => {
    const syllabusPageElement = syllabusPageRef.current;
    if (!syllabusPageElement) {
      ztoolkit.log("Syllabus page element not found");
      return;
    }

    const progress = new ztoolkit.ProgressWindow(getString("app-name"), {
      closeOnClick: false,
      closeTime: -1,
    })
      .createLine({
        text: getString("progress-print-preparing"),
        type: "default",
      })
      .show();

    try {
      const bibliography = await generateBibliographyForPrint(
        items,
        syllabusMetadata.cslStyle || null,
      );
      ztoolkit.log(
        "Export bibliography:",
        bibliography
          ? `${bibliography.isHtml ? "html" : "text"} ${bibliography.content.length} chars from ${items.length} items`
          : `none (${items.length} items)`,
      );
      const bibliographyHtml = bibliography
        ? bibliographyToHtml(bibliography.content, density, bibliography.isHtml)
        : "";
      const innerHTML = serializeSyllabusForPrint(syllabusPageElement, density);
      ztoolkit.log(
        "Export clone",
        syllabusPageElement.querySelectorAll(".syllabus-class-group").length,
        "class groups,",
        innerHTML.length,
        "chars",
      );
      const exportTitle = title || "Syllabus";
      const htmlContent = await buildPrintableHtml({
        title: exportTitle,
        innerHTML,
        bibliographyHtml,
        density,
      });
      const slug =
        slugify(exportTitle, {
          lower: true,
          strict: true,
        }) || "syllabus";
      const extension =
        format === "pdf"
          ? "pdf"
          : format === "docx"
            ? "docx"
            : format === "markdown"
              ? "md"
              : "html";
      const filename = `syllabus-${slug}.${extension}`;

      if (format === "pdf") {
        await saveSyllabusPdf({
          htmlContent,
          filename,
          onReady: () => progress.close(),
        });
        return;
      }

      progress.close();
      await saveSyllabusExport({
        format,
        title: exportTitle,
        htmlContent,
        filename,
      });
    } catch (err) {
      ztoolkit.log("Error exporting syllabus:", err);
      progress.close();
      new ztoolkit.ProgressWindow(getString("app-name"), {
        closeOnClick: true,
        closeTime: 5000,
      })
        .createLine({
          text: getString("progress-print-failed"),
          type: "fail",
        })
        .show();
    }
  };

  const [publishStatus, setPublishStatus] = useState<PublishUiStatus>({
    kind: "idle",
  });
  const [publishedUrl, setPublishedUrl] = useState<string | null>(() =>
    getPublishedSyllabusUrl(collectionId),
  );

  useEffect(() => {
    setPublishedUrl(getPublishedSyllabusUrl(collectionId));
    setPublishStatus({ kind: "idle" });
  }, [collectionId]);

  const handlePublish = async (options?: { skipConfirm?: boolean }) => {
    await runCollectionPublish({
      collectionId,
      items,
      initialKind: "syllabus",
      sync: !!options?.skipConfirm,
      title: title || "Syllabus",
      courseCode: syllabusMetadata.courseCode || "",
      institution: syllabusMetadata.institution || "",
      cslStyle: syllabusMetadata.cslStyle || null,
      setStatus: setPublishStatus,
      onPublishedUrl: setPublishedUrl,
    });
  };

  const handleUnpublish = async () => {
    await runCollectionUnpublish({
      collectionId,
      setStatus: setPublishStatus,
      onCleared: () => setPublishedUrl(null),
    });
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

      // Collection document atoms refresh via Notifier / note subscribers.
    } catch (err) {
      ztoolkit.log("Error creating additional class:", err);
    }
  };

  const page = (
    <div
      className={twMerge(
        "syllabus-page h-full flex flex-col min-h-0 overflow-hidden in-[.print]:scheme-light relative focus:outline-none",
        `density-${density}`,
        isLocked && effectiveLayout === "magazine" && "syllabus-magazine-page",
        isAnnotationsLayout && "syllabus-gallery-annotations-page",
        fileDrop.isDraggingFile &&
          osFileDropTarget.kind === "collection" &&
          "file-drag-over",
      )}
      data-item-density={density}
      dir={getUiDir()}
      onDragEnter={fileDrop.onDragEnter}
      onDragOver={fileDrop.onDragOver}
      onDragLeave={fileDrop.onDragLeave}
      onDrop={fileDrop.onDrop}
    >
      <div
        ref={syllabusPageRef}
        tabIndex={-1}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden focus:outline-none"
        onKeyDown={handleSyllabusKeyDown}
      >
        <OsFileDropOverlay
          visible={
            fileDrop.isDraggingFile && osFileDropTarget.kind === "collection"
          }
        />
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
                      title={getString("page-toc-title")}
                      aria-label={getString("page-toc-title")}
                      data-toc-button="true"
                    >
                      <List size={20} />
                    </button>
                    {showTOC && (
                      <TableOfContents
                        collectionId={collectionId}
                        classGroups={visibleClassGroups}
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
                      placeholder={getString("placeholder-add-title")}
                      className="w-full px-0! mx-0! text-primary! disabled:text-primary!"
                      readOnly={isLocked}
                    />
                  </div>
                </div>
                <div className="inline-flex items-center gap-2.5 shrink grow-0">
                  <SyllabusViewMenu
                    viewKey={displayViewKey}
                    readerModeViewKey={collectionId}
                    showLayout={isLocked}
                    layout={browseLayout}
                    onLayoutChange={setBrowseLayout}
                    layoutGlobal={browseLayoutGlobal}
                    magazinePacking={magazinePacking}
                    onMagazinePackingChange={setMagazinePacking}
                    magazinePackingGlobal={magazinePackingGlobal}
                    annotationColors={annotationColors}
                    colorFilterScope={displayViewKey}
                    libraryID={
                      collection?.libraryID ?? Zotero.Libraries.userLibraryID
                    }
                  />
                  <div
                    className="grow-0 shrink-0 flex items-center in-[.print]:hidden cursor-pointer"
                    title={getString("page-edit-settings")}
                    aria-label={getString("page-edit-settings")}
                    data-tour="syllabus-settings-button"
                    onClick={() => openSyllabusSettingsDialog(collectionId)}
                  >
                    <Settings
                      size={20}
                      className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                    />
                  </div>
                  <CollectionSaveFormatMenu
                    onSelect={handleExportFormat}
                    onPublish={handlePublish}
                    hasClassNotes={hasClassNotes}
                  />
                  <div
                    className={twMerge(
                      "grow-0 shrink-0 flex items-center in-[.print]:hidden",
                      isFiltered ? "cursor-default" : "cursor-pointer",
                    )}
                    title={
                      isFiltered
                        ? getString("page-lock-search")
                        : isPersistedLocked
                          ? getString("page-unlock")
                          : getString("page-lock")
                    }
                    aria-label={
                      isFiltered
                        ? getString("page-lock-search")
                        : isPersistedLocked
                          ? getString("page-unlock")
                          : getString("page-lock")
                    }
                    aria-pressed={isLocked}
                    aria-disabled={isFiltered || undefined}
                    onClick={
                      isFiltered
                        ? undefined
                        : () => setLocked(!isPersistedLocked)
                    }
                  >
                    {isLocked ? (
                      <Lock
                        size={20}
                        className={twMerge(
                          "text-primary rounded p-1",
                          !isFiltered && "hover:text-primary hover:bg-quinary",
                        )}
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
                    title={
                      isPinned
                        ? getString("pinned-menu-unpin-syllabus")
                        : getString("pinned-menu-pin-syllabus")
                    }
                    aria-label={
                      isPinned
                        ? getString("pinned-menu-unpin-syllabus")
                        : getString("pinned-menu-pin-syllabus")
                    }
                    aria-pressed={isPinned}
                    onClick={() => void handleTogglePin()}
                  >
                    {isPinned ? (
                      <PinOff
                        size={20}
                        className="text-primary hover:text-primary hover:bg-quinary rounded p-1"
                      />
                    ) : (
                      <Pin
                        size={20}
                        className="text-secondary hover:text-primary hover:bg-quinary rounded p-1"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container-padded">
            <div
              className={twMerge(
                "py-2",
                density !== "expanded" ? "text-base" : "text-lg",
              )}
            >
              <div className="space-y-2">
                <div className="syllabus-masthead-meta flex flex-0! flex-row gap-2 items-center">
                  <TextInput
                    elementType="input"
                    initialValue={syllabusMetadata.courseCode || ""}
                    onSave={setCourseCode}
                    className="w-[90px] overflow-hidden text-ellipsis whitespace-nowrap px-0! mx-0! text-primary cursor-pointer shrink-0! grow-0!"
                    placeholder={getString("placeholder-course-code")}
                    emptyBehavior="delete"
                    readOnly={isLocked}
                  />
                  <TextInput
                    elementType="input"
                    initialValue={syllabusMetadata.institution || ""}
                    onSave={setInstitution}
                    className="px-0! mx-0! text-primary cursor-pointer grow shrink-0"
                    placeholder={getString("placeholder-institution")}
                    emptyBehavior="delete"
                    readOnly={isLocked}
                  />
                </div>
                <PublishStatusBanner
                  status={publishStatus}
                  publishedUrl={publishedUrl}
                  onOpen={(url) => Zotero.launchURL(url)}
                  onCopy={(url) => {
                    copyStringToClipboard(url);
                    new ztoolkit.ProgressWindow(getString("app-name"), {
                      closeOnClick: true,
                      closeTime: 2000,
                    })
                      .createLine({
                        text: getString("publish-status-copied"),
                        type: "success",
                      })
                      .show();
                  }}
                  onSync={() => {
                    void handlePublish({ skipConfirm: true });
                  }}
                  onUnpublish={() => {
                    void handleUnpublish();
                  }}
                  onDismissStatus={() => setPublishStatus({ kind: "idle" })}
                />
              </div>
              <div className="syllabus-collection-description mt-4">
                <TextInput
                  elementType="textarea"
                  initialValue={syllabusMetadata.description || ""}
                  onSave={setDescription}
                  className="w-full px-0! mx-0! text-primary"
                  placeholder={getString("placeholder-add-description")}
                  emptyBehavior="delete"
                  fieldSizing="content"
                  readOnly={isLocked}
                />
              </div>
            </div>
          </div>

          <LinksSection
            links={syllabusMetadata.links || []}
            setLinks={setLinks}
            isLocked={isLocked}
            density={density}
          />

          <GalleryViewportProvider rootRef={syllabusPageRef}>
            <SyllabusPageDnd
              enabled={syllabusChromeDnd}
              identifierContainers={syllabusIdentifierContainers}
              selectedIdentifiers={selectedIdentifiers}
              syllabusItems={syllabusItems}
              nextClassNumber={nextClassNumber}
              onDragActivity={(dragging) => {
                setIsDragging(dragging);
                if (!dragging) {
                  setDropIndicator(null);
                  setDraggingIdentifiers(new Set());
                  setDraggingSourceClass(null);
                }
              }}
              onDragStartMeta={({ identifiers, sourceClass }) => {
                setDraggingIdentifiers(identifiers);
                setDraggingSourceClass(sourceClass);
              }}
              onDropPayload={(payload, target) =>
                runSyllabusDrop(payload, target)
              }
            >
              <div
                className={twMerge(
                  "syllabus-class-groups flex flex-col mb-12",
                  density !== "expanded" ? "gap-10 mt-4" : "gap-12 mt-6",
                )}
              >
                {isFiltered &&
                  visibleClassGroups.length === 0 &&
                  furtherReadingItems.length === 0 && (
                    <p className="container-padded text-secondary text-lg">
                      {getString("gallery-empty-filtered")}
                    </p>
                  )}

                {visibleClassGroups.map((group, index) => (
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
                    dropIndicator={dropIndicator}
                    onDropIndicatorChange={handleDropIndicatorChange}
                    draggingIdentifiers={draggingIdentifiers}
                    draggingSourceClass={draggingSourceClass}
                    density={density}
                    readerMode={readerMode}
                    isLocked={isLocked}
                    layout={effectiveLayout}
                    magazinePacking={magazinePacking}
                    colorFilterScope={displayViewKey}
                    showItemsWithoutAnnotations={showItemsWithoutAnnotations}
                    annotationStreamOrder={index}
                    onResetSortOrder={() => setItemOrderVersion((v) => v + 1)}
                    selectedIdentifiers={selectedIdentifiers}
                    onIdentifierClick={handleIdentifierClick}
                    onContextMenu={handleContextMenu}
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

                  const addClassLabel = getString("page-add-class", {
                    args: {
                      nomenclature: singularCapitalized,
                      number: nextClassNumber,
                    },
                  });

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
                              title={addClassLabel}
                            >
                              {addClassLabel}
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

                      {!isLocked &&
                        (isDragging || fileDrop.isDraggingFile) &&
                        density === "expanded" && (
                          <div className="syllabus-class-group syllabus-add-class-dropzone in-[.print]:hidden">
                            <div className="syllabus-class-header-container">
                              <div className="syllabus-class-header">
                                {getString("page-add-to-class", {
                                  args: {
                                    nomenclature: singularCapitalized,
                                    number: nextClassNumber,
                                  },
                                })}
                              </div>
                            </div>
                            <SyllabusDndZone
                              group={syllabusDndGroup(nextClassNumber)}
                              empty
                              className="syllabus-class-items syllabus-add-class-dropzone-items"
                              data-syllabus-file-drop="class"
                              data-syllabus-class-number={nextClassNumber}
                              onDrop={(e) => handleDrop(e, nextClassNumber)}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                            >
                              <div className="syllabus-add-class-dropzone-placeholder bg-quinary rounded-md p-16 text-secondary border-2 border-dashed border-secondary">
                                {getString("page-drop-create-class", {
                                  args: {
                                    nomenclature: singularCapitalized,
                                    number: nextClassNumber,
                                  },
                                })}
                              </div>
                            </SyllabusDndZone>
                          </div>
                        )}

                      {!isLocked && !hasNoClasses && (
                        <div className="syllabus-create-class-control in-[.print]:hidden">
                          <button
                            className="syllabus-create-class-button"
                            data-tour="syllabus-add-class"
                            onClick={addClass}
                            title={addClassLabel}
                          >
                            {addClassLabel}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {(furtherReadingItems.length > 0 || !isLocked) && (
                <div
                  id="toc-further-reading"
                  className={twMerge(
                    "syllabus-class-group group/class in-[.print]:scheme-light",
                    furtherReadingItems.length === 0 && "in-[.print]:hidden",
                  )}
                  data-tour="syllabus-further-reading"
                  data-syllabus-file-drop={
                    isLocked ? undefined : "further-reading"
                  }
                >
                  <div
                    className={twMerge(
                      "container-padded flex flex-row items-baseline gap-2 font-semibold",
                      density !== "expanded"
                        ? "text-xl mt-8 mb-2"
                        : "text-2xl mt-12 mb-4",
                    )}
                  >
                    {getString("further-reading-heading")}
                    {!isLocked && (
                      <div className="ml-auto shrink-0 inline-flex items-center gap-1.5 in-[.print]:hidden font-normal text-sm text-secondary">
                        {furtherReadingHasManualOrder && (
                          <button
                            type="button"
                            className="bg-transparent border-none rounded transition-all duration-200 cursor-pointer hover:bg-quinary text-secondary hover:text-primary inline-flex flex-row items-center justify-center w-8 h-8"
                            onClick={async () => {
                              await SyllabusManager.setFurtherReadingOrder(
                                collectionId,
                                [],
                                "page",
                              );
                              setItemOrderVersion((v) => v + 1);
                            }}
                            title={getString("class-reset-sort")}
                            aria-label={getString("class-reset-sort")}
                          >
                            <div className="text-lg text-center">⇅</div>
                          </button>
                        )}
                        <label className="inline-flex items-center gap-1.5">
                          <ArrowUpDown
                            size={12}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                          <span>{getString("sort-label")}</span>
                          <GallerySaveGlobalButton
                            globalSetting={furtherReadingSortGlobal}
                          />
                          <select
                            value={furtherReadingSortBy}
                            onChange={async (e) => {
                              const next = e.currentTarget
                                .value as FurtherReadingSortBy;
                              if (furtherReadingHasManualOrder) {
                                await SyllabusManager.setFurtherReadingOrder(
                                  collectionId,
                                  [],
                                  "page",
                                );
                                setItemOrderVersion((v) => v + 1);
                              }
                              setFurtherReadingSortBy(next);
                            }}
                            aria-label={getString("further-reading-sort-aria")}
                            className="text-sm text-primary bg-background border border-quinary rounded px-1.5 py-0.5 cursor-pointer"
                          >
                            <option value="title">
                              {getString("sort-by-title")}
                            </option>
                            <option value="creator">
                              {getString("sort-by-creator")}
                            </option>
                            <option value="date">
                              {getString("sort-by-date")}
                            </option>
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                  {density === "expanded" && (
                    <p className="container-padded text-secondary text-lg">
                      {getString("further-reading-empty-desc")}
                    </p>
                  )}
                  <div
                    className={
                      isLocked &&
                      effectiveLayout !== "card" &&
                      effectiveLayout !== "annotations" &&
                      effectiveLayout !== "magazine"
                        ? "w-full min-w-0 max-w-full"
                        : "container-padded"
                    }
                  >
                    <SyllabusDndZone
                      group={syllabusDndGroup(null, "further-reading")}
                      empty={furtherReadingItems.length === 0}
                      className={twMerge(
                        "syllabus-class-items box-border! rounded-lg",
                        syllabusChromeDnd
                          ? twMerge(
                              "syllabus-dnd-item-list",
                              density !== "expanded" ? "p-1 -m-1" : "p-2 -m-2",
                            )
                          : density !== "expanded"
                            ? "p-1 -m-1"
                            : "p-2 -m-2",
                        "data-[dropzone-active='true']:bg-accent-blue/15! data-[dropzone-active='true']:outline-accent-blue! data-[dropzone-active='true']:text-accent-blue! transition-all duration-200 outline-transparent outline-2! outline-dashed!",
                      )}
                      data-density={
                        syllabusChromeDnd && density !== "expanded"
                          ? "compact"
                          : undefined
                      }
                      onDrop={
                        isLocked
                          ? undefined
                          : (e) => {
                              if (
                                dropIndicator?.zone === "further-reading" &&
                                dropIndicator.identifier
                              ) {
                                const targetById = furtherReadingItems.find(
                                  ({ item, assignment }) => {
                                    const id = assignment?.id
                                      ? `assignment:${assignment.id}`
                                      : `item:${item.id}`;
                                    return id === dropIndicator.identifier;
                                  },
                                );
                                if (targetById) {
                                  void handleDrop(
                                    e,
                                    null,
                                    targetById.item.id,
                                    dropIndicator.edge === "before",
                                    "further-reading",
                                  );
                                  return;
                                }
                              }
                              void handleDrop(
                                e,
                                null,
                                undefined,
                                undefined,
                                "further-reading",
                              );
                            }
                      }
                      onDragOver={
                        isLocked
                          ? undefined
                          : (e) => {
                              handleDragOver(e);
                              if (
                                syllabusChromeDnd ||
                                isOsFileDrag(e.dataTransfer)
                              ) {
                                return;
                              }
                              const cardsRoot = e.currentTarget;
                              const cards = Array.from(
                                cardsRoot.querySelectorAll(
                                  ":scope > .syllabus-dnd-sortable > .syllabus-item-card, :scope > .syllabus-item-card",
                                ),
                              ) as HTMLElement[];
                              if (cards.length === 0) {
                                handleDropIndicatorChange(null);
                                return;
                              }
                              for (const card of cards) {
                                const identifier =
                                  card.dataset.syllabusIdentifier;
                                if (!identifier) {
                                  continue;
                                }
                                const rect = card.getBoundingClientRect();
                                if (e.clientY < rect.top + rect.height / 2) {
                                  handleDropIndicatorChange({
                                    classNumber: null,
                                    zone: "further-reading",
                                    identifier,
                                    edge: "before",
                                  });
                                  return;
                                }
                              }
                              const last = cards[cards.length - 1];
                              const identifier =
                                last.dataset.syllabusIdentifier;
                              if (identifier) {
                                handleDropIndicatorChange({
                                  classNumber: null,
                                  zone: "further-reading",
                                  identifier,
                                  edge: "after",
                                });
                              }
                            }
                      }
                      onDragLeave={
                        isLocked
                          ? undefined
                          : (e) => {
                              handleDragLeave(e);
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const { clientX: x, clientY: y } = e;
                              if (
                                x < rect.left ||
                                x > rect.right ||
                                y < rect.top ||
                                y > rect.bottom
                              ) {
                                handleDropIndicatorChange(null);
                              }
                            }
                      }
                    >
                      {isLocked && effectiveLayout !== "card" ? (
                        <ReadingItemsLayout
                          layout={effectiveLayout}
                          density={density}
                          readerMode={readerMode}
                          isLocked
                          template="strip"
                          magazinePacking={magazinePacking}
                          colorFilterScope={displayViewKey}
                          showItemsWithoutAnnotations={
                            showItemsWithoutAnnotations
                          }
                          annotationStreamOrder={visibleClassGroups.length}
                          rows={furtherReadingItems.map(
                            ({ item, assignment }) => ({
                              key: `further-${item.id}-${assignment?.id || "item"}`,
                              item,
                              collectionId,
                              assignment: assignment || {
                                id: `further-${item.id}`,
                              },
                              slim: true,
                            }),
                          )}
                        />
                      ) : (
                        <div
                          className={twMerge(
                            syllabusChromeDnd
                              ? "syllabus-personal-order-section"
                              : density !== "expanded"
                                ? "space-y-2"
                                : "space-y-4",
                            !syllabusChromeDnd &&
                              !isZotero8OrLater() &&
                              "compat-space-y",
                          )}
                        >
                          {furtherReadingItems.map(
                            ({ item, assignment }, index) => {
                              const cardIdentifier = assignment?.id
                                ? `assignment:${assignment.id}`
                                : `item:${item.id}`;
                              const visibleEdge = syllabusChromeDnd
                                ? null
                                : dropIndicator?.zone === "further-reading" &&
                                    dropIndicator.identifier === cardIdentifier
                                  ? dropIndicator.edge
                                  : null;
                              return (
                                <SyllabusDndSortable
                                  key={`${item.id}-${assignment?.id ?? "item"}`}
                                  identifier={cardIdentifier}
                                  index={index}
                                  group={syllabusDndGroup(
                                    null,
                                    "further-reading",
                                  )}
                                  draggingIdentifiers={draggingIdentifiers}
                                >
                                  <SyllabusItemCard
                                    item={item}
                                    collectionId={collectionId}
                                    classNumber={undefined}
                                    assignment={assignment}
                                    slim={true}
                                    density={density}
                                    readerMode={readerMode}
                                    isLocked={isLocked}
                                    isFurtherReading={true}
                                    selectedIdentifiers={selectedIdentifiers}
                                    onIdentifierClick={handleIdentifierClick}
                                    onContextMenu={handleContextMenu}
                                    selectedForDrag={selectedForDrag}
                                    onPriorityChange={handlePriorityChange}
                                    onDelete={handleDelete}
                                    onDuplicate={handleDuplicate}
                                    onDrop={(e, insertBefore) =>
                                      handleDrop(
                                        e,
                                        null,
                                        item.id,
                                        insertBefore,
                                        "further-reading",
                                      )
                                    }
                                    onDragOver={(e) => {
                                      handleDragOver(e);
                                      if (
                                        syllabusChromeDnd ||
                                        isOsFileDrag(e.dataTransfer)
                                      ) {
                                        return;
                                      }
                                      const root =
                                        e.currentTarget.parentElement
                                          ?.parentElement;
                                      if (!(root instanceof HTMLElement)) {
                                        return;
                                      }
                                      const cards = Array.from(
                                        root.querySelectorAll(
                                          ":scope > .syllabus-personal-order-tile > .syllabus-item-card, :scope > .syllabus-item-card",
                                        ),
                                      ) as HTMLElement[];
                                      for (const card of cards) {
                                        const identifier =
                                          card.dataset.syllabusIdentifier;
                                        if (!identifier) {
                                          continue;
                                        }
                                        const rect =
                                          card.getBoundingClientRect();
                                        if (
                                          e.clientY <
                                          rect.top + rect.height / 2
                                        ) {
                                          handleDropIndicatorChange({
                                            classNumber: null,
                                            zone: "further-reading",
                                            identifier,
                                            edge: "before",
                                          });
                                          return;
                                        }
                                      }
                                      const last = cards[cards.length - 1];
                                      const identifier =
                                        last?.dataset.syllabusIdentifier;
                                      if (identifier) {
                                        handleDropIndicatorChange({
                                          classNumber: null,
                                          zone: "further-reading",
                                          identifier,
                                          edge: "after",
                                        });
                                      }
                                    }}
                                    dropEdge={visibleEdge}
                                    isZoteroSelected={
                                      selectedItemIds?.includes(item.id) ||
                                      false
                                    }
                                    isIdentifierSelected={selectedIdentifiers.has(
                                      cardIdentifier,
                                    )}
                                  />
                                </SyllabusDndSortable>
                              );
                            },
                          )}
                        </div>
                      )}
                      {!isLocked && (
                        <AddReadingButton
                          hoverReveal
                          title={getString("further-reading-add-readings-aria")}
                          ariaLabel={getString(
                            "further-reading-add-readings-aria",
                          )}
                          onClick={() => {
                            void pickAndAddItemsToFurtherReading(
                              collectionId,
                            ).catch((err) => {
                              ztoolkit.log(
                                "Error adding readings to further reading:",
                                err,
                              );
                            });
                          }}
                        />
                      )}
                    </SyllabusDndZone>
                  </div>
                </div>
              )}

              {getPref("debugMode") && (
                <div className="container-padded text-secondary text-sm">
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
            </SyllabusPageDnd>
          </GalleryViewportProvider>
        </div>
      </div>
      {isAnnotationsLayout ? (
        <div className="syllabus-annotation-batch-dock shrink-0">
          <AnnotationBatchBar libraryID={libraryID} />
        </div>
      ) : null}
    </div>
  );

  return isAnnotationsLayout ? (
    <AnnotationSelectionProvider>{page}</AnnotationSelectionProvider>
  ) : (
    page
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
    `syllabus:${collectionId}`,
  );
}
