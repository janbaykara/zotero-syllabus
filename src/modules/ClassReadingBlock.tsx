// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { ChevronLeft } from "lucide-preact";
import { SyllabusManager, ItemSyllabusAssignment } from "./syllabus";
import {
  useZoteroItemDensity,
  type ItemDensity,
} from "./react-zotero-sync/itemDensity";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useSyllabusClassGroups } from "./classGroups";
import { formatReadingDate } from "../utils/dates";
import {
  isZotero8OrLater,
  libraryDisplayName,
  selectZoteroCollection,
} from "../utils/zotero";
import { getCachedCollectionById } from "../utils/cache";
import { TabManager } from "../utils/tabManager";
import { classByNumber } from "../utils/schemas";
import { getString, getUiDir } from "../utils/locale";
import { ProseText } from "./ProseText";
import type { GalleryLayout } from "./galleryLayout";
import { readingContentWidthClass } from "./galleryLayout";
import type { MagazinePacking } from "./magazinePacking";
import { ReadingItemsLayout } from "./readingItemsLayout";
import { useScheduleStickyTop } from "./scheduleSticky";

export type ClassReading = {
  collectionId: number;
  collectionName: string;
  libraryID: number;
  classNumber: number;
  classTitle: string;
  classDescription: string;
  readingDate?: string;
  items: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>;
};

export function selectCollectionInLibrary(collectionId: number): void {
  try {
    if (!selectZoteroCollection(collectionId)) {
      return;
    }
    TabManager.selectLibraryTab();
  } catch (error) {
    ztoolkit.log("Error selecting collection:", error);
  }
}

export function selectSavedSearchInLibrary(search: Zotero.Search): void {
  try {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    const collectionsView = pane?.collectionsView;
    const treeViewID = search.treeViewID || `S${search.id}`;
    if (!collectionsView || !treeViewID) {
      return;
    }
    collectionsView.selectByID(treeViewID);
    TabManager.selectLibraryTab();
  } catch (error) {
    ztoolkit.log("Error selecting saved search:", error);
  }
}

export function openReadingScheduleTab(): void {
  try {
    SyllabusManager.openReadingListTab();
  } catch (error) {
    ztoolkit.log("Error opening reading schedule:", error);
  }
}

export function openMyAnnotationsTab(libraryID: number): void {
  try {
    SyllabusManager.openMyAnnotationsTab(libraryID);
  } catch (error) {
    ztoolkit.log("Error opening My Annotations:", error);
  }
}

export function openCollectionSyllabusPage(collectionId: number): void {
  try {
    if (!selectZoteroCollection(collectionId)) {
      return;
    }
    TabManager.selectLibraryTab();
    void SyllabusManager.setCollectionViewMode("syllabus").then(() => {
      SyllabusManager.setupPage();
    });
  } catch (error) {
    ztoolkit.log("Error opening syllabus page:", error);
  }
}

/** Element id for syllabus class / further-reading sections (TOC + deep links). */
export function syllabusClassScrollId(
  classNumber: number | null | "further-reading",
): string {
  if (classNumber === "further-reading") {
    return "toc-further-reading";
  }
  if (classNumber == null) {
    return "toc-class-unnumbered";
  }
  return `toc-class-${classNumber}`;
}

export type PendingClassScroll = {
  collectionId: number;
  elementId: string;
  /** When set, syllabus page selects/scrolls this item so it flashes in view. */
  itemId?: number;
};

let pendingClassScroll: PendingClassScroll | null = null;
const pendingClassScrollListeners = new Set<() => void>();

function notifyPendingClassScroll(): void {
  for (const listener of pendingClassScrollListeners) {
    listener();
  }
}

/**
 * Open a collection’s Syllabus view and scroll to a class section when ready.
 * Pass `itemId` to select that item (blue outline) and prefer scrolling to its card.
 */
export function openCollectionSyllabusAtClass(
  collectionId: number,
  classNumber: number | null | "further-reading",
  itemId?: number,
): void {
  pendingClassScroll = {
    collectionId,
    elementId: syllabusClassScrollId(classNumber),
    itemId: itemId && itemId > 0 ? itemId : undefined,
  };
  notifyPendingClassScroll();
  openCollectionSyllabusPage(collectionId);
}

export function subscribePendingClassScroll(listener: () => void): () => void {
  pendingClassScrollListeners.add(listener);
  return () => {
    pendingClassScrollListeners.delete(listener);
  };
}

/** Peek without consuming — returns null if not for this collection. */
export function peekPendingClassScroll(
  collectionId: number,
): PendingClassScroll | null {
  if (!pendingClassScroll || pendingClassScroll.collectionId !== collectionId) {
    return null;
  }
  return pendingClassScroll;
}

/** Consume a pending class scroll for this collection, if any. */
export function takePendingClassScroll(
  collectionId: number,
): PendingClassScroll | null {
  if (!pendingClassScroll || pendingClassScroll.collectionId !== collectionId) {
    return null;
  }
  const pending = pendingClassScroll;
  pendingClassScroll = null;
  return pending;
}

export function selectItemInCollection(
  item: Zotero.Item,
  collectionId: number,
): void {
  try {
    const ZoteroPane = ztoolkit.getGlobal("ZoteroPane");
    const collection = getCachedCollectionById(collectionId);
    if (collection) {
      const collectionsView = ZoteroPane.collectionsView;
      if (collectionsView) {
        collectionsView.selectByID(collection.treeViewID);
        if (!item.deleted) {
          ZoteroPane.selectItem(item.id);
        }
      }
    } else {
      ZoteroPane.selectItem(item.id);
    }
  } catch (error) {
    ztoolkit.log("Error selecting item in collection:", error);
  }
}

export function ClassReadingBlock({
  classReading,
  density,
  layout = "card",
  showCollectionLink = true,
  showLibraryName = false,
  compactHeading = false,
  coverRail = false,
  fullWidthItems = false,
  stickyHeading = false,
  showPriority,
  magazineRail = false,
  magazinePacking = "packed",
  onCollectionClick,
  onItemClick,
}: {
  classReading: ClassReading;
  density: ItemDensity;
  layout?: GalleryLayout;
  showCollectionLink?: boolean;
  showLibraryName?: boolean;
  compactHeading?: boolean;
  /** Home shelf: scroll covers horizontally like other explorer rails. */
  coverRail?: boolean;
  /** Home shelf: cards span the shelf width like other explorer shelves. */
  fullWidthItems?: boolean;
  /** Stick the class title under Reading Schedule week/date headers. */
  stickyHeading?: boolean;
  /**
   * Cover/magazine priority badge. Defaults on for Cover (schedule page),
   * off for Card/Magazine where class context already frames the list.
   */
  showPriority?: boolean;
  /** Home Upcoming deadlines Magazine: horizontal Cover + Blurb rail. */
  magazineRail?: boolean;
  /** Reading Schedule Magazine packing (ignored when magazineRail). */
  magazinePacking?: MagazinePacking;
  onCollectionClick?: () => void;
  onItemClick?: (item: Zotero.Item) => void;
}) {
  const stickyTop = useScheduleStickyTop("class");
  const showPriorityBadge = showPriority ?? layout === "cover";
  const { singularCapitalized, singular } =
    SyllabusManager.getNomenclatureFormatted(classReading.collectionId);
  const classStatus = SyllabusManager.getClassStatus(
    classReading.collectionId,
    classReading.classNumber,
  );

  const handleClassStatusToggle = async () => {
    try {
      const newStatus = classStatus === "done" ? null : "done";
      await SyllabusManager.setClassStatus(
        classReading.collectionId,
        classReading.classNumber,
        newStatus,
        "page",
      );
    } catch (error) {
      ztoolkit.log("Error toggling class status:", error);
    }
  };

  return (
    <div className={twMerge(classStatus === "done" ? "opacity-40" : "")}>
      <div
        className={twMerge(
          stickyHeading
            ? "syllabus-schedule-sticky-class"
            : twMerge(readingContentWidthClass("card"), "relative mb-2"),
        )}
        style={stickyHeading ? stickyTop : undefined}
      >
        <div
          className={twMerge(
            // Heading stays on the narrow padded column in every layout.
            // Cover/Magazine used to be full-bleed, which stretched prose to
            // the pane width and clipped the left checkbox under overflow-x-hidden.
            stickyHeading
              ? twMerge(readingContentWidthClass("card"), "relative")
              : undefined,
          )}
        >
          <input
            type="checkbox"
            checked={classStatus === "done"}
            onChange={handleClassStatusToggle}
            className={twMerge(
              "absolute right-full mr-1 w-4 h-4 cursor-pointer shrink-0 self-center in-[.print]:hidden accent-accent-green!",
              isZotero8OrLater() ? "md:mr-2!" : "mr-2!",
            )}
            title={
              classStatus === "done"
                ? getString("mark-not-done")
                : getString("mark-done")
            }
            aria-label={
              classStatus === "done"
                ? getString("mark-not-done")
                : getString("mark-done")
            }
          />
          <div
            className={twMerge(
              "flex-1 syllabus-class-reading-heading",
              showCollectionLink || compactHeading ? "text-xl" : "text-3xl",
              classStatus === "done" ? "line-through" : "",
              onCollectionClick
                ? "hover:cursor-pointer hover:bg-quinary active:bg-quarternary rounded-md px-1 -mx-1 inline-block"
                : "inline-block px-1 -mx-1",
            )}
            onClick={onCollectionClick}
          >
            {classReading.classTitle ? (
              <>
                <span className="font-semibold">{classReading.classTitle}</span>
                <span className="text-secondary">, </span>
              </>
            ) : null}
            <span className="text-secondary">
              {classReading.classTitle ? singular : singularCapitalized}{" "}
              {classReading.classNumber}
            </span>
            {showCollectionLink ? (
              <span className="text-secondary">
                {" "}
                {classReadingSourceLabel(classReading, showLibraryName)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {classReading.classDescription ? (
        <div
          className={twMerge(
            readingContentWidthClass("card"),
            "text-base mb-2",
            stickyHeading ? "mt-1" : undefined,
          )}
        >
          <ProseText text={classReading.classDescription} />
        </div>
      ) : null}
      <div
        className={
          (layout === "card" || layout === "annotations") && !fullWidthItems
            ? readingContentWidthClass("card")
            : "w-full min-w-0 max-w-full"
        }
      >
        <ReadingItemsLayout
          layout={layout}
          density={density}
          readerMode
          isLocked
          template="strip"
          showPriority={showPriorityBadge}
          coverRail={coverRail && layout === "cover"}
          magazineRail={magazineRail && layout === "magazine"}
          magazinePacking={magazinePacking}
          colorFilterScope="reading-schedule"
          rows={classReading.items
            .filter(({ assignment }) => !!assignment.id)
            .map(({ item, assignment }) => ({
              key: `${item.id}-assignment-${assignment.id}`,
              item,
              collectionId: classReading.collectionId,
              assignment,
              classNumber: classReading.classNumber,
              slim: true,
            }))}
          onItemClick={onItemClick ? (item) => onItemClick(item) : undefined}
        />
      </div>
    </div>
  );
}

function classReadingSourceLabel(
  classReading: ClassReading,
  showLibraryName: boolean,
): string {
  if (showLibraryName) {
    const library = libraryDisplayName(classReading.libraryID);
    if (library) {
      return getString("schedule-of-collection-in-library", {
        args: {
          collection: classReading.collectionName,
          library,
        },
      });
    }
  }
  return getString("schedule-of-collection", {
    args: { name: classReading.collectionName },
  });
}

export function ClassSubcollectionPage({
  parentCollectionId,
  classCollectionId,
  classNumber,
}: {
  parentCollectionId: number;
  classCollectionId: number;
  classNumber: number | null;
}) {
  const [density] = useZoteroItemDensity();
  const [parentTitle] = useZoteroCollectionTitle(parentCollectionId);
  const [syllabusMetadata] = useZoteroSyllabusMetadata(parentCollectionId);
  const syllabusItems = useZoteroCollectionItems(parentCollectionId);
  const { classGroups } = useSyllabusClassGroups(
    parentCollectionId,
    syllabusItems,
    syllabusMetadata,
    0,
  );

  const classGroup = useMemo(() => {
    if (classNumber == null) {
      return undefined;
    }
    return classGroups.find((group) => group.classNumber === classNumber);
  }, [classGroups, classNumber]);

  const classMeta = classByNumber(syllabusMetadata, classNumber);

  const classReading: ClassReading | null =
    classNumber != null
      ? {
          collectionId: parentCollectionId,
          collectionName: parentTitle || "",
          libraryID:
            getCachedCollectionById(parentCollectionId)?.libraryID ??
            Zotero.Libraries.userLibraryID,
          classNumber,
          classTitle: classMeta?.title || "",
          classDescription: classMeta?.description || "",
          readingDate: classMeta?.readingDate || undefined,
          items: classGroup?.itemAssignments || [],
        }
      : null;

  const openParent = () => openCollectionSyllabusPage(parentCollectionId);

  return (
    <div
      className="syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background"
      dir={getUiDir()}
    >
      <div className="pb-12">
        <div
          className={twMerge(
            "sticky top-0 z-20 bg-background py-1",
            isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
          )}
        >
          <div className="container-padded bg-background">
            <button
              type="button"
              onClick={openParent}
              className="flex items-center gap-1 text-secondary hover:text-primary bg-transparent! border-none p-0 cursor-pointer text-base in-[.print]:hidden"
              title={getString("schedule-open-syllabus", {
                args: { title: parentTitle || getString("this-collection") },
              })}
            >
              <ChevronLeft size={18} />
              <span className="font-semibold">
                {parentTitle || getString("view-tab-syllabus")}
              </span>
            </button>
            <p className="text-sm text-secondary mt-1 in-[.print]:hidden">
              {getString("class-folder-managed-banner")}
            </p>
          </div>
        </div>

        <div className="container-padded mt-6">
          {classReading?.readingDate ? (
            <div className="text-secondary text-2xl mb-6">
              {formatReadingDate(classReading.readingDate)}
            </div>
          ) : null}

          {classReading ? (
            <ClassReadingBlock
              classReading={classReading}
              density={density}
              showCollectionLink={false}
              onItemClick={(item) =>
                selectItemInCollection(item, classCollectionId)
              }
            />
          ) : (
            <p className="text-secondary text-lg">
              This folder is part of{" "}
              {parentTitle || getString("view-tab-syllabus")}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
