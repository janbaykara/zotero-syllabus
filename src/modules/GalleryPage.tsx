// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { ComponentChildren, JSX, RefObject } from "preact";
import { twMerge } from "tailwind-merge";
import {
  AlignJustify,
  ArrowDownAZ,
  BookOpen,
  Calendar,
  CalendarPlus,
  Folder,
  FolderOpen,
  Globe,
  GraduationCap,
  Highlighter,
  Image,
  LayoutGrid,
  LayoutList,
  ListOrdered,
  Maximize2,
  MoreHorizontal,
  Newspaper,
  Rows2,
  Rows3,
  Shapes,
  Sparkles,
  StretchHorizontal,
  Tag,
  Tags,
  User,
  UserX,
} from "lucide-preact";
import { renderComponent } from "../utils/react";
import { isZotero8OrLater } from "../utils/zotero";
import { openItemBestAttachment, sortItems } from "../utils/items";
import {
  GalleryAnnotationsSection,
  useItemIdsWithAnnotations,
} from "./GalleryAnnotationsRow";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useZoteroItemsViewRegularItemIds } from "./react-zotero-sync/itemsViewItems";
import {
  useZoteroTreeRowItems,
  useZoteroTreeRowTitle,
} from "./react-zotero-sync/treeRowItems";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { ProseText } from "./ProseText";
import {
  ITEM_DENSITIES,
  useZoteroItemDensity,
  type ItemDensity,
} from "./react-zotero-sync/itemDensity";
import { densityLabel } from "./browsePage";
import { SlimSyllabusItemCard, useItemIdentifierSelection } from "./browsePage";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { sortClassAssignmentRows, useSyllabusClassGroups } from "./classGroups";
import { useGalleryGroupBy, type GalleryGroupBy } from "./galleryGroupBy";
import {
  findActiveGalleryGroupId,
  flattenSubcollectionNavGroups,
  collectionGroupIconSpec,
  scrollChildIntoNearestHorizontal,
  scrollElementBelowSticky,
  type GalleryGroupIconSpec,
  type GalleryNavGroup,
} from "./galleryGroupNav";
import {
  findGalleryNavIndex,
  getActiveGalleryIndex,
  getGalleryNavElements,
  parseGalleryNavKey,
  shouldCaptureCustomViewKeyboard,
} from "./galleryKeyboardNav";
import {
  isItemContextMenuKey,
  openZoteroItemContextMenu,
} from "../utils/itemContextMenu";
import {
  useGalleryLayout,
  type GalleryGlobalSetting,
  type GalleryLayout,
} from "./galleryLayout";
import { useMagazinePacking, type MagazinePacking } from "./magazinePacking";
import { useAnnotationsQuoteOrder } from "./myAnnotationsPrefs";
import { useBooleanPref } from "./react-zotero-sync/booleanPref";
import type { AnnotationsQuoteOrder } from "./explorerQueries";
import {
  GALLERY_TOUR_EVENT_CLOSE_SETTINGS,
  GALLERY_TOUR_EVENT_OPEN_SETTINGS,
  maybeShowGalleryTour,
} from "./galleryTour";
import {
  magazineSectionTemplate,
  type MagazineDeskInput,
} from "./magazineDesks";
import { MagazineItems } from "./MagazineItems";
import { MagazineHome } from "./MagazineHome";
import { GalleryTile } from "./GalleryTile";
import { GalleryViewportProvider } from "./galleryVisibility";
import { useGallerySortBy, type GallerySortBy } from "./gallerySort";
import { collectionHasSyllabusNote } from "./syllabusNote";
import { useCollectionCreatorGroups } from "./creatorGroups";
import { useCollectionTagGroups } from "./tagGroups";
import { useCollectionItemTypeGroups } from "./typeGroups";
import { SubcollectionNode, useSubcollectionTree } from "./subcollectionGroups";
import {
  SyllabusManager,
  classByNumber,
  type ItemSyllabusAssignment,
} from "./syllabus";
import { getCachedItem } from "../utils/cache";
import { formatReadingDate } from "../utils/dates";
import { getString, getUiDir } from "../utils/locale";
import {
  importDroppedOsFilesIntoCurrentView,
  useOsFileDropHandlers,
} from "../utils/nativeFileDrop";
import { OsFileDropOverlay } from "./OsFileDropOverlay";
import type { SettingsSyllabusMetadata } from "../utils/schemas";
import {
  chromeByItemIdFromAssignments,
  type ReadingTileChrome,
} from "./readingAssignmentChrome";

export type GalleryPageProps = {
  viewKey: string;
  collectionId?: number;
  treeViewID?: string;
  includeDeleted?: boolean;
  includeFeedItems?: boolean;
};

export function GalleryPage({
  viewKey,
  collectionId,
  treeViewID,
  includeDeleted = false,
  includeFeedItems = false,
}: GalleryPageProps) {
  const isCollectionScope = collectionId != null;
  const resolvedTreeViewID = treeViewID ?? (isCollectionScope ? "" : viewKey);
  const collectionIdOrZero = collectionId ?? 0;
  const [collectionTitle] = useZoteroCollectionTitle(collectionIdOrZero);
  const treeRowTitle = useZoteroTreeRowTitle(resolvedTreeViewID);
  const title = isCollectionScope ? collectionTitle : treeRowTitle;
  const collectionItems = useZoteroCollectionItems(collectionIdOrZero, {
    recursive: "pref",
  });
  const treeRowItems = useZoteroTreeRowItems(resolvedTreeViewID, {
    includeDeleted,
    includeFeedItems,
  });
  const matchingIds = useZoteroItemsViewRegularItemIds(collectionIdOrZero);
  const allItems = isCollectionScope ? collectionItems : treeRowItems;
  const isFiltered = isCollectionScope && matchingIds != null;
  const syllabusItems = useMemo(() => {
    if (!matchingIds) {
      return allItems;
    }
    return allItems.filter(({ zoteroItem }) => matchingIds.has(zoteroItem.id));
  }, [allItems, matchingIds]);
  const isSyllabus =
    collectionId != null && collectionHasSyllabusNote(collectionId);
  const [layout, setLayout, layoutGlobal] = useGalleryLayout(viewKey);
  const [groupBy, setGroupBy, groupByGlobal] = useGalleryGroupBy(viewKey, {
    classes: isSyllabus,
    subcollections: isCollectionScope,
    magazine: layout === "magazine",
  });
  const [sortBy, setSortBy, sortByGlobal] = useGallerySortBy(viewKey);
  const [magazinePacking, setMagazinePacking, magazinePackingGlobal] =
    useMagazinePacking(viewKey);
  const [density] = useZoteroItemDensity();
  const [showItemsWithoutAnnotations, setShowItemsWithoutAnnotations] =
    useBooleanPref("galleryShowItemsWithoutAnnotations");
  const [syllabusMetadata] = useZoteroSyllabusMetadata(collectionIdOrZero);
  const { classGroups, furtherReadingItems } = useSyllabusClassGroups(
    collectionIdOrZero,
    syllabusItems,
    syllabusMetadata,
    0,
  );
  const { selectedIdentifiers, selectedItemIds, handleIdentifierClick } =
    useItemIdentifierSelection();
  const pageRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLElement>(null);
  const navStateRef = useRef({ selectedItemIds });
  navStateRef.current = { selectedItemIds };
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const suppressScrollSpyRef = useRef(false);
  const fileDrop = useOsFileDropHandlers({
    onOsFileDrop: async (event) => {
      await importDroppedOsFilesIntoCurrentView(event);
    },
  });

  useEffect(() => {
    const win = Zotero.getMainWindow();
    if (!win) {
      return;
    }
    const timer = win.setTimeout(() => {
      void maybeShowGalleryTour(win, viewKey);
    }, 500);
    return () => win.clearTimeout(timer);
  }, [viewKey]);
  const { tagGroups, untaggedItems } = useCollectionTagGroups(syllabusItems);
  const { typeGroups } = useCollectionItemTypeGroups(syllabusItems);
  const { creatorGroups, uncreditedItems } =
    useCollectionCreatorGroups(syllabusItems);
  const {
    root: unfilteredSubcollectionRoot,
    resolveItems: resolveSubcollectionItems,
  } = useSubcollectionTree(collectionIdOrZero);
  const subcollectionRoot = useMemo(
    () => filterSubcollectionNode(unfilteredSubcollectionRoot, matchingIds),
    [unfilteredSubcollectionRoot, matchingIds],
  );
  const magazineClassDesks = useMemo((): MagazineDeskInput[] => {
    if (!isSyllabus) {
      return [];
    }
    const desks: MagazineDeskInput[] = [];
    for (const group of classGroups) {
      const itemIds: number[] = [];
      const seen = new Set<number>();
      for (const { item } of group.itemAssignments) {
        if (seen.has(item.id)) {
          continue;
        }
        seen.add(item.id);
        itemIds.push(item.id);
      }
      if (itemIds.length === 0) {
        continue;
      }
      const key = String(group.classNumber ?? "unnumbered");
      desks.push({
        id: `class-${key}`,
        title: classNavLabel(
          collectionIdOrZero,
          group.classNumber,
          syllabusMetadata,
        ),
        itemIds,
      });
    }
    if (furtherReadingItems.length > 0) {
      desks.push({
        id: "further-reading",
        title: getString("further-reading-heading"),
        itemIds: furtherReadingItems.map((entry) => entry.item.id),
      });
    }
    return desks;
  }, [
    classGroups,
    collectionIdOrZero,
    furtherReadingItems,
    isSyllabus,
    syllabusMetadata,
  ]);
  const emptyMessage = isFiltered
    ? getString("gallery-empty-filtered")
    : getString("gallery-empty");

  /* When Annotations mode hides items without annotations, also hide groups
     (and subcollection branches) that then have nothing left to show. */
  const hideEmptyAnnotationGroups =
    layout === "annotations" && !showItemsWithoutAnnotations;
  const allItemsForAnnotationFilter = useMemo(
    () => syllabusItems.map(({ zoteroItem }) => zoteroItem),
    [syllabusItems],
  );
  const annotatedItemIds = useItemIdsWithAnnotations(
    allItemsForAnnotationFilter,
    hideEmptyAnnotationGroups,
  );
  const annotationGroupsReady =
    !hideEmptyAnnotationGroups || annotatedItemIds != null;

  const visibleTypeGroups = useMemo(() => {
    if (!hideEmptyAnnotationGroups) {
      return typeGroups;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return typeGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => annotatedItemIds.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [typeGroups, hideEmptyAnnotationGroups, annotatedItemIds]);

  const visibleCreatorGroups = useMemo(() => {
    if (!hideEmptyAnnotationGroups) {
      return creatorGroups;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return creatorGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => annotatedItemIds.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [creatorGroups, hideEmptyAnnotationGroups, annotatedItemIds]);

  const visibleUncreditedItems = useMemo(() => {
    if (!hideEmptyAnnotationGroups) {
      return uncreditedItems;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return uncreditedItems.filter((item) => annotatedItemIds.has(item.id));
  }, [uncreditedItems, hideEmptyAnnotationGroups, annotatedItemIds]);

  const visibleTagGroups = useMemo(() => {
    if (!hideEmptyAnnotationGroups) {
      return tagGroups;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return tagGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => annotatedItemIds.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [tagGroups, hideEmptyAnnotationGroups, annotatedItemIds]);

  const visibleUntaggedItems = useMemo(() => {
    if (!hideEmptyAnnotationGroups) {
      return untaggedItems;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return untaggedItems.filter((item) => annotatedItemIds.has(item.id));
  }, [untaggedItems, hideEmptyAnnotationGroups, annotatedItemIds]);

  const visibleClassGroups = useMemo(() => {
    if (!hideEmptyAnnotationGroups) {
      return classGroups;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return classGroups
      .map((group) => ({
        ...group,
        itemAssignments: group.itemAssignments.filter(({ item }) =>
          annotatedItemIds.has(item.id),
        ),
      }))
      .filter((group) => group.itemAssignments.length > 0);
  }, [classGroups, hideEmptyAnnotationGroups, annotatedItemIds]);

  const visibleFurtherReadingItems = useMemo(() => {
    if (!hideEmptyAnnotationGroups) {
      return furtherReadingItems;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return furtherReadingItems.filter(({ item }) =>
      annotatedItemIds.has(item.id),
    );
  }, [furtherReadingItems, hideEmptyAnnotationGroups, annotatedItemIds]);

  const visibleSubcollectionRoot = useMemo(() => {
    if (!hideEmptyAnnotationGroups) {
      return subcollectionRoot;
    }
    if (!annotatedItemIds || !subcollectionRoot) {
      return null;
    }
    return pruneSubcollectionByAnnotatedIds(
      subcollectionRoot,
      annotatedItemIds,
    );
  }, [subcollectionRoot, hideEmptyAnnotationGroups, annotatedItemIds]);

  const visibleFlatItems = useMemo(() => {
    const items = syllabusItems.map(({ zoteroItem }) => zoteroItem);
    if (!hideEmptyAnnotationGroups) {
      return items;
    }
    if (!annotatedItemIds) {
      return [];
    }
    return items.filter((item) => annotatedItemIds.has(item.id));
  }, [syllabusItems, hideEmptyAnnotationGroups, annotatedItemIds]);

  const navGroups = useMemo((): GalleryNavGroup[] => {
    if (groupBy === "type") {
      return visibleTypeGroups.map(({ itemType, label }) => ({
        id: `type-${itemType}`,
        label,
        icon: { kind: "item-type", itemType },
      }));
    }
    if (groupBy === "creator") {
      const groups: GalleryNavGroup[] = visibleCreatorGroups.map(
        ({ label }, index) => ({
          id: `creator-${index}`,
          label,
          icon: { kind: "creator" },
        }),
      );
      if (visibleUncreditedItems.length > 0) {
        groups.push({
          id: "uncredited",
          label: getString("gallery-uncredited"),
          icon: { kind: "uncredited" },
        });
      }
      return groups;
    }
    if (groupBy === "tags") {
      const groups: GalleryNavGroup[] = visibleTagGroups.map(
        ({ tag }, index) => ({
          id: `tag-${index}`,
          label: tag,
          icon: { kind: "tag" },
        }),
      );
      if (visibleUntaggedItems.length > 0) {
        groups.push({
          id: "untagged",
          label: getString("gallery-untagged"),
          icon: { kind: "untagged" },
        });
      }
      return groups;
    }
    if (groupBy === "subcollections") {
      if (
        !visibleSubcollectionRoot ||
        !subtreeHasContent(visibleSubcollectionRoot)
      ) {
        return [];
      }
      return flattenSubcollectionNavGroups(
        visibleSubcollectionRoot,
        getString("gallery-in-this-collection"),
      );
    }
    if (groupBy === "classes") {
      const groups: GalleryNavGroup[] = [];
      for (const group of visibleClassGroups) {
        const key = String(group.classNumber ?? "unnumbered");
        groups.push({
          id: `class-${key}`,
          label: classNavLabel(
            collectionIdOrZero,
            group.classNumber,
            syllabusMetadata,
          ),
          icon: { kind: "class" },
        });
      }
      if (visibleFurtherReadingItems.length > 0) {
        groups.push({
          id: "further-reading",
          label: getString("further-reading-heading"),
          icon: { kind: "further-reading" },
        });
      }
      return groups;
    }
    return [];
  }, [
    collectionIdOrZero,
    groupBy,
    syllabusMetadata,
    visibleClassGroups,
    visibleCreatorGroups,
    visibleFurtherReadingItems,
    visibleSubcollectionRoot,
    visibleTagGroups,
    visibleTypeGroups,
    visibleUncreditedItems,
    visibleUntaggedItems,
  ]);

  const updateActiveFromScroll = useCallback(() => {
    if (suppressScrollSpyRef.current) {
      return;
    }
    const container = pageRef.current;
    const sticky = stickyRef.current;
    if (!container) {
      return;
    }
    const sections = Array.from(
      container.querySelectorAll("[data-gallery-group]"),
      (el) => el as HTMLElement,
    );
    if (sections.length === 0) {
      setActiveGroupId(null);
      return;
    }
    const activationLine = sticky
      ? sticky.getBoundingClientRect().bottom
      : container.getBoundingClientRect().top;
    const nextId = findActiveGalleryGroupId(
      sections.map((section) => ({
        id: section.dataset.galleryGroup || "",
        top: section.getBoundingClientRect().top,
      })),
      activationLine,
    );
    setActiveGroupId(nextId);
  }, []);

  useEffect(() => {
    const container = pageRef.current;
    if (!container || navGroups.length === 0) {
      return;
    }
    const onScroll = () => updateActiveFromScroll();
    const onScrollEnd = () => {
      suppressScrollSpyRef.current = false;
      updateActiveFromScroll();
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("scrollend", onScrollEnd);
    updateActiveFromScroll();
    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("scrollend", onScrollEnd);
    };
  }, [navGroups, updateActiveFromScroll]);

  useLayoutEffect(() => {
    const strip = pillsRef.current;
    if (!strip || !activeGroupId) {
      return;
    }
    const pill = strip.querySelector<HTMLElement>(
      `[data-gallery-group-pill="${activeGroupId}"]`,
    );
    if (pill) {
      scrollChildIntoNearestHorizontal(strip, pill);
    }
  }, [activeGroupId]);

  const handleSelectGroup = useCallback(
    (id: string) => {
      const container = pageRef.current;
      const sticky = stickyRef.current;
      if (!container) {
        return;
      }
      const section = container.querySelector<HTMLElement>(
        `[data-gallery-group="${id}"]`,
      );
      if (!section) {
        return;
      }
      suppressScrollSpyRef.current = true;
      setActiveGroupId(id);
      scrollElementBelowSticky(container, section, sticky);
      const win = Zotero.getMainWindow();
      win.setTimeout(() => {
        suppressScrollSpyRef.current = false;
        updateActiveFromScroll();
      }, 650);
    },
    [updateActiveFromScroll],
  );

  const selectGalleryItem = useCallback((item: Zotero.Item) => {
    try {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      pane.selectItem(item.id);
    } catch (err) {
      ztoolkit.log("Error selecting gallery item:", err);
    }
  }, []);

  const handleClick = useCallback(
    (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => {
      if (e.shiftKey) {
        handleIdentifierClick(item, undefined, e);
        return;
      }
      selectGalleryItem(item);
    },
    [handleIdentifierClick, selectGalleryItem],
  );

  const handleDoubleClick = useCallback((item: Zotero.Item) => {
    openItemBestAttachment(item);
  }, []);

  const handleContextMenu = useCallback(
    (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => {
      void openZoteroItemContextMenu(item, e);
    },
    [],
  );

  const handleGalleryKeyDown = useCallback(
    (event: Event) => {
      const e = event as KeyboardEvent;
      if (!shouldCaptureCustomViewKeyboard(e)) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const container = pageRef.current;
      if (!container) {
        return;
      }
      const els = getGalleryNavElements(container);
      if (els.length === 0) {
        return;
      }

      const isEnter = e.key === "Enter";
      const isContextMenu = isItemContextMenuKey(e);
      const navKey = parseGalleryNavKey(e.key);
      if (!navKey && !isEnter && !isContextMenu) {
        return;
      }

      const { selectedItemIds: selected } = navStateRef.current;
      const currentIndex = getActiveGalleryIndex(
        els,
        selected,
        e.target,
        navKey ?? "down",
      );

      if (isEnter || isContextMenu) {
        const currentEl = currentIndex >= 0 ? els[currentIndex] : null;
        const itemId = Number(currentEl?.dataset.itemId);
        const item = itemId
          ? getCachedItem(itemId) || Zotero.Items.get(itemId)
          : null;
        if (!item || !currentEl) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
        if (isContextMenu) {
          void openZoteroItemContextMenu(item, e, currentEl);
          return;
        }
        handleDoubleClick(item);
        return;
      }

      if (!navKey) {
        return;
      }

      const rects = els.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      });
      const currentRect = currentIndex >= 0 ? rects[currentIndex] : null;
      const pageRows = currentRect
        ? Math.max(
            1,
            Math.floor(container.clientHeight / currentRect.height) - 1,
          )
        : 1;
      const nextIndex = findGalleryNavIndex(rects, currentIndex, navKey, {
        pageRows,
      });
      if (nextIndex < 0 || nextIndex === currentIndex) {
        if (currentIndex < 0) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
        return;
      }

      const nextEl = els[nextIndex];
      const itemId = Number(nextEl?.dataset.itemId);
      const item = itemId
        ? getCachedItem(itemId) || Zotero.Items.get(itemId)
        : null;
      if (!item) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") {
        e.stopImmediatePropagation();
      }

      nextEl.scrollIntoView({ block: "nearest", inline: "nearest" });
      if (typeof nextEl.focus === "function") {
        nextEl.focus({ preventScroll: true });
      }
      selectGalleryItem(item);
    },
    [handleDoubleClick, selectGalleryItem],
  );

  useEffect(() => {
    const win = Zotero.getMainWindow();
    const doc = win?.document ?? document;
    doc.addEventListener("keydown", handleGalleryKeyDown, true);
    return () => {
      doc.removeEventListener("keydown", handleGalleryKeyDown, true);
    };
  }, [handleGalleryKeyDown]);

  useLayoutEffect(() => {
    const container = pageRef.current;
    if (!container) {
      return;
    }
    const els = getGalleryNavElements(container);
    const selected = new Set(selectedItemIds ?? []);
    const tabStop =
      els.find((el) => selected.has(Number(el.dataset.itemId))) ?? els[0];
    for (const el of els) {
      el.tabIndex = el === tabStop ? 0 : -1;
    }
  }, [selectedItemIds, layout, groupBy, syllabusItems]);

  const renderCovers = (items: Zotero.Item[], keyPrefix: string) => (
    <div className="syllabus-gallery-grid">
      {sortItems(uniqueItems(items), sortBy).map((item) => (
        <GalleryTile
          key={`${keyPrefix}-${item.id}`}
          item={item}
          collectionId={collectionIdOrZero}
          showGalleryNote={true}
          selected={selectedItemIds?.includes(item.id) || false}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      ))}
    </div>
  );

  const renderAnnotations = (
    items: Zotero.Item[],
    keyPrefix: string,
    chromeByItemId?: ReadonlyMap<number, ReadingTileChrome> | null,
  ) => (
    <GalleryAnnotationsSection
      items={items}
      keyPrefix={keyPrefix}
      sortBy={sortBy}
      collectionId={collectionIdOrZero}
      selectedItemIds={selectedItemIds}
      showItemsWithoutAnnotations={showItemsWithoutAnnotations}
      showGalleryNote={true}
      chromeByItemId={chromeByItemId}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    />
  );

  const renderCards = (items: Zotero.Item[], keyPrefix: string) => (
    <div
      className={twMerge(
        "syllabus-gallery-cards flex flex-col",
        density !== "expanded" ? "gap-2" : "gap-4",
      )}
    >
      {sortItems(uniqueItems(items), sortBy).map((item) => (
        <SlimSyllabusItemCard
          key={`${keyPrefix}-${item.id}`}
          item={item}
          collectionId={collectionIdOrZero}
          keyPrefix={keyPrefix}
          density={density}
          showGalleryNote={true}
          selectedIdentifiers={selectedIdentifiers}
          selectedItemIds={selectedItemIds}
          onIdentifierClick={handleIdentifierClick}
          onContextMenu={handleContextMenu}
        />
      ))}
    </div>
  );

  const renderMagazine = (
    items: Zotero.Item[],
    keyPrefix: string,
    template = magazineSectionTemplate(0),
  ) => (
    <MagazineItems
      items={items}
      keyPrefix={keyPrefix}
      sortBy={sortBy}
      template={template}
      packing={magazinePacking}
      collectionId={collectionIdOrZero}
      showGalleryNote={true}
      selectedItemIds={selectedItemIds}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    />
  );

  let magazineSectionIndex = 0;
  const renderItems = (items: Zotero.Item[], keyPrefix: string) => {
    if (layout === "card") {
      return renderCards(items, keyPrefix);
    }
    if (layout === "magazine") {
      return renderMagazine(
        items,
        keyPrefix,
        magazineSectionTemplate(magazineSectionIndex++),
      );
    }
    if (layout === "annotations") {
      return renderAnnotations(items, keyPrefix);
    }
    return renderCovers(items, keyPrefix);
  };

  const renderClassAssignments = (
    rows: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>,
    classNumber: number | null,
    keyPrefix: string,
  ) => {
    if (rows.length === 0) {
      return null;
    }
    const chromeByItemId = chromeByItemIdFromAssignments(
      collectionIdOrZero,
      rows,
    );
    if (layout === "magazine") {
      return (
        <MagazineItems
          items={rows.map(({ item }) => item)}
          keyPrefix={keyPrefix}
          sortBy={sortBy}
          template={magazineSectionTemplate(magazineSectionIndex++)}
          packing={magazinePacking}
          collectionId={collectionIdOrZero}
          showGalleryNote={true}
          selectedItemIds={selectedItemIds}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          chromeByItemId={chromeByItemId}
        />
      );
    }
    if (layout === "annotations") {
      return renderAnnotations(
        rows.map(({ item }) => item),
        keyPrefix,
        chromeByItemId,
      );
    }
    if (layout !== "card") {
      return (
        <div className="syllabus-gallery-grid">
          {sortItems(uniqueItems(rows.map(({ item }) => item)), sortBy).map(
            (item) => (
              <GalleryTile
                key={`${keyPrefix}-${item.id}`}
                item={item}
                collectionId={collectionIdOrZero}
                showGalleryNote={true}
                selected={selectedItemIds?.includes(item.id) || false}
                chrome={chromeByItemId.get(item.id)}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
              />
            ),
          )}
        </div>
      );
    }
    const sorted = sortClassAssignmentRows(rows, sortBy);
    return (
      <div
        className={twMerge(
          "syllabus-gallery-cards flex flex-col",
          density !== "expanded" ? "gap-2" : "gap-4",
        )}
      >
        {sorted.map(({ item, assignment }) => {
          if (!assignment.id) {
            return null;
          }
          return (
            <SyllabusItemCard
              key={`${keyPrefix}-${item.id}-${assignment.id}`}
              item={item}
              collectionId={collectionIdOrZero}
              classNumber={classNumber ?? undefined}
              assignment={assignment}
              slim={true}
              density={density}
              readerMode={false}
              isLocked={true}
              showGalleryNote={true}
              selectedIdentifiers={selectedIdentifiers}
              onIdentifierClick={handleIdentifierClick}
              onContextMenu={handleContextMenu}
              isZoteroSelected={selectedItemIds?.includes(item.id) || false}
              isIdentifierSelected={selectedIdentifiers.has(
                `assignment:${assignment.id}`,
              )}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={pageRef}
      tabIndex={-1}
      className={twMerge(
        "syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background focus:outline-none relative",
        layout === "magazine" && "syllabus-magazine-page",
        layout === "annotations" && "syllabus-gallery-annotations-page",
        density !== "expanded" && `density-${density}`,
        fileDrop.isDraggingFile && "file-drag-over",
      )}
      data-item-density={density}
      dir={getUiDir()}
      onDragEnter={fileDrop.onDragEnter}
      onDragOver={fileDrop.onDragOver}
      onDragLeave={fileDrop.onDragLeave}
      onDrop={fileDrop.onDrop}
    >
      <OsFileDropOverlay visible={fileDrop.isDraggingFile} />
      <div className="pb-10">
        <div
          ref={stickyRef}
          className={twMerge(
            "syllabus-gallery-sticky sticky top-0 z-40 bg-background",
            isZotero8OrLater() ? "md:pt-8 pt-6" : "pt-8",
          )}
        >
          <div
            className={
              layout === "annotations" ||
              (layout === "magazine" && magazinePacking === "vertical")
                ? "container-padded"
                : "px-6"
            }
          >
            <GalleryPageHeader
              title={title || getString("untitled")}
              groupBy={groupBy}
              onGroupBy={setGroupBy}
              groupByGlobal={groupByGlobal}
              showClasses={isSyllabus}
              showSubcollections={isCollectionScope}
              sortBy={sortBy}
              onSortBy={setSortBy}
              sortByGlobal={sortByGlobal}
              layout={layout}
              onLayout={setLayout}
              layoutGlobal={layoutGlobal}
              magazinePacking={magazinePacking}
              onMagazinePacking={setMagazinePacking}
              magazinePackingGlobal={magazinePackingGlobal}
              showItemsWithoutAnnotations={showItemsWithoutAnnotations}
              onShowItemsWithoutAnnotations={setShowItemsWithoutAnnotations}
              navGroups={navGroups}
              activeGroupId={activeGroupId}
              onSelectGroup={handleSelectGroup}
              pillsRef={pillsRef}
            />
          </div>
        </div>
        <GalleryViewportProvider rootRef={pageRef}>
          <div
            className={twMerge(
              "pt-4",
              layout === "annotations" ||
                (layout === "magazine" && magazinePacking === "vertical")
                ? "container-padded"
                : "px-6",
            )}
          >
            {groupBy === "none" &&
              (!annotationGroupsReady ? null : visibleFlatItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                renderItems(visibleFlatItems, "all")
              ))}

            {groupBy === "auto" &&
              (syllabusItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                <MagazineHome
                  items={syllabusItems.map(({ zoteroItem }) => zoteroItem)}
                  tagGroups={tagGroups}
                  classDesks={magazineClassDesks}
                  subcollectionRoot={subcollectionRoot}
                  sortBy={sortBy}
                  packing={magazinePacking}
                  selectedItemIds={selectedItemIds}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  onContextMenu={handleContextMenu}
                />
              ))}

            {groupBy === "type" &&
              (!annotationGroupsReady ? null : visibleTypeGroups.length ===
                0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                visibleTypeGroups.map(({ itemType, label, items }) => (
                  <section
                    key={itemType}
                    className="syllabus-gallery-section"
                    data-gallery-group={`type-${itemType}`}
                  >
                    <GalleryGroupHeading icon={{ kind: "item-type", itemType }}>
                      {label}
                    </GalleryGroupHeading>
                    {renderItems(items, `type-${itemType}`)}
                  </section>
                ))
              ))}

            {groupBy === "creator" &&
              (!annotationGroupsReady ? null : visibleCreatorGroups.length ===
                  0 && visibleUncreditedItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                <>
                  {visibleCreatorGroups.map(({ key, label, items }, index) => (
                    <section
                      key={key}
                      className="syllabus-gallery-section"
                      data-gallery-group={`creator-${index}`}
                    >
                      <GalleryGroupHeading icon={{ kind: "creator" }}>
                        {label}
                      </GalleryGroupHeading>
                      {renderItems(items, `creator-${key}`)}
                    </section>
                  ))}
                  {visibleUncreditedItems.length > 0 && (
                    <section
                      className="syllabus-gallery-section"
                      data-gallery-group="uncredited"
                    >
                      <GalleryGroupHeading icon={{ kind: "uncredited" }}>
                        {getString("gallery-uncredited")}
                      </GalleryGroupHeading>
                      <p className="syllabus-gallery-class-description">
                        {getString("gallery-uncredited-desc")}
                      </p>
                      {renderItems(visibleUncreditedItems, "uncredited")}
                    </section>
                  )}
                </>
              ))}

            {groupBy === "tags" &&
              (!annotationGroupsReady ? null : visibleTagGroups.length === 0 &&
                visibleUntaggedItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                <>
                  {visibleTagGroups.map(({ tag, items }, index) => (
                    <section
                      key={tag}
                      className="syllabus-gallery-section"
                      data-gallery-group={`tag-${index}`}
                    >
                      <GalleryGroupHeading icon={{ kind: "tag" }}>
                        {tag}
                      </GalleryGroupHeading>
                      {renderItems(items, `tag-${tag}`)}
                    </section>
                  ))}
                  {visibleUntaggedItems.length > 0 && (
                    <section
                      className="syllabus-gallery-section"
                      data-gallery-group="untagged"
                    >
                      <GalleryGroupHeading icon={{ kind: "untagged" }}>
                        {getString("gallery-untagged")}
                      </GalleryGroupHeading>
                      <p className="syllabus-gallery-class-description">
                        {getString("gallery-untagged-desc")}
                      </p>
                      {renderItems(visibleUntaggedItems, "untagged")}
                    </section>
                  )}
                </>
              ))}

            {groupBy === "subcollections" &&
              (!annotationGroupsReady ? null : !visibleSubcollectionRoot ||
                !subtreeHasContent(visibleSubcollectionRoot) ? (
                <p className="text-secondary text-lg">
                  {isFiltered
                    ? emptyMessage
                    : getString("gallery-empty-subcollections")}
                </p>
              ) : (
                <GallerySubcollectionSection
                  node={visibleSubcollectionRoot}
                  depth={0}
                  isRoot
                  resolveItems={resolveSubcollectionItems}
                  renderItems={renderItems}
                />
              ))}

            {groupBy === "classes" &&
              (!annotationGroupsReady ? null : visibleClassGroups.length ===
                  0 && visibleFurtherReadingItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                <>
                  {visibleClassGroups.map((group) => {
                    const key = String(group.classNumber ?? "unnumbered");
                    return (
                      <section
                        key={key}
                        className="syllabus-gallery-section"
                        data-gallery-group={`class-${key}`}
                      >
                        <GalleryClassHeading
                          collectionId={collectionIdOrZero}
                          classNumber={group.classNumber}
                          syllabusMetadata={syllabusMetadata}
                        />
                        {renderClassAssignments(
                          group.itemAssignments,
                          group.classNumber,
                          `class-${key}`,
                        )}
                      </section>
                    );
                  })}
                  {visibleFurtherReadingItems.length > 0 && (
                    <section
                      className="syllabus-gallery-section"
                      data-gallery-group="further-reading"
                    >
                      <GalleryGroupHeading icon={{ kind: "further-reading" }}>
                        {getString("further-reading-heading")}
                      </GalleryGroupHeading>
                      <p className="syllabus-gallery-class-description">
                        {getString("further-reading-empty-desc")}
                      </p>
                      {renderItems(
                        visibleFurtherReadingItems.map((entry) => entry.item),
                        "further-reading",
                      )}
                    </section>
                  )}
                </>
              ))}
          </div>
        </GalleryViewportProvider>
      </div>
    </div>
  );
}

function subtreeHasContent(node: SubcollectionNode): boolean {
  if (node.itemIds.length > 0) {
    return true;
  }
  return node.children.some(subtreeHasContent);
}

function classNavLabel(
  collectionId: number,
  classNumber: number | null,
  syllabusMetadata: SettingsSyllabusMetadata,
): string {
  if (classNumber == null) {
    return getString("gallery-unnumbered");
  }
  const title = (
    classByNumber(syllabusMetadata, classNumber)?.title || ""
  ).trim();
  if (title) {
    return title;
  }
  const { singularCapitalized } =
    SyllabusManager.getNomenclatureFormatted(collectionId);
  return `${singularCapitalized} ${classNumber}`;
}

export function GalleryGroupIcon({ spec }: { spec: GalleryGroupIconSpec }) {
  if (spec.kind === "item-type") {
    return (
      <span
        className="icon icon-css icon-item-type syllabus-gallery-group-icon"
        data-item-type={spec.itemType}
        aria-hidden="true"
      />
    );
  }
  if (spec.kind === "collection") {
    return (
      <span
        className="icon icon-css icon-collection syllabus-gallery-group-icon"
        aria-hidden="true"
      />
    );
  }
  if (spec.kind === "syllabus" || spec.kind === "class") {
    return (
      <span
        className="icon icon-css icon-syllabus-collection syllabus-gallery-group-icon"
        aria-hidden="true"
      />
    );
  }
  const Icon =
    spec.kind === "creator"
      ? User
      : spec.kind === "uncredited"
        ? UserX
        : spec.kind === "tag"
          ? Tags
          : spec.kind === "untagged"
            ? Tag
            : spec.kind === "collection-root"
              ? FolderOpen
              : BookOpen;
  return (
    <Icon
      className="syllabus-gallery-group-icon"
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}

function GalleryGroupHeading({
  icon,
  children,
  muted = false,
}: {
  icon: GalleryGroupIconSpec;
  children: ComponentChildren;
  muted?: boolean;
}) {
  return (
    <h2
      className={
        muted
          ? "syllabus-gallery-section-title-muted"
          : "syllabus-gallery-section-title"
      }
    >
      <GalleryGroupIcon spec={icon} />
      <span>{children}</span>
    </h2>
  );
}

function filterSubcollectionNode(
  node: SubcollectionNode | null,
  matchingIds: Set<number> | null,
): SubcollectionNode | null {
  if (!node || !matchingIds) {
    return node;
  }
  const next: SubcollectionNode = {
    ...node,
    itemIds: node.itemIds.filter((id) => matchingIds.has(id)),
    children: node.children
      .map((child) => filterSubcollectionNode(child, matchingIds))
      .filter(
        (child): child is SubcollectionNode =>
          child != null && subtreeHasContent(child),
      ),
  };
  return next;
}

/** Keep branches that still have annotated items in this node or any descendant. */
function pruneSubcollectionByAnnotatedIds(
  node: SubcollectionNode,
  annotatedIds: Set<number>,
): SubcollectionNode | null {
  const children = node.children
    .map((child) => pruneSubcollectionByAnnotatedIds(child, annotatedIds))
    .filter((child): child is SubcollectionNode => child != null);
  const itemIds = node.itemIds.filter((id) => annotatedIds.has(id));
  if (itemIds.length === 0 && children.length === 0) {
    return null;
  }
  return { ...node, itemIds, children };
}

function GallerySubcollectionSection({
  node,
  depth,
  isRoot = false,
  resolveItems,
  renderItems,
}: {
  node: SubcollectionNode;
  depth: number;
  isRoot?: boolean;
  resolveItems: (ids: number[]) => Zotero.Item[];
  renderItems: (items: Zotero.Item[], keyPrefix: string) => JSX.Element;
}) {
  const items = resolveItems(node.itemIds);
  const hasContent = subtreeHasContent(node);

  if (!hasContent && !isRoot) {
    return null;
  }

  return (
    <div
      className={twMerge(
        "syllabus-subcollection-box in-[.print]:scheme-light",
        isRoot
          ? "space-y-6"
          : "rounded-lg border border-quinary bg-background p-4 space-y-4",
      )}
      data-collection-id={node.collectionId}
      data-depth={depth}
      data-gallery-group={isRoot ? undefined : `col-${node.collectionId}`}
    >
      {!isRoot && (
        <GalleryGroupHeading icon={collectionGroupIconSpec(node.collectionId)}>
          {node.name}
        </GalleryGroupHeading>
      )}

      {isRoot && items.length > 0 && (
        <section
          className="syllabus-gallery-section"
          data-gallery-group={`col-root-${node.collectionId}`}
        >
          <GalleryGroupHeading icon={{ kind: "collection-root" }} muted>
            {getString("gallery-in-this-collection")}
          </GalleryGroupHeading>
          {renderItems(items, `root-${node.collectionId}`)}
        </section>
      )}

      {!isRoot && items.length > 0
        ? renderItems(items, `col-${node.collectionId}`)
        : null}

      {node.children.map((child) => (
        <GallerySubcollectionSection
          key={child.collectionId}
          node={child}
          depth={depth + 1}
          resolveItems={resolveItems}
          renderItems={renderItems}
        />
      ))}
    </div>
  );
}

function GalleryClassHeading({
  collectionId,
  classNumber,
  syllabusMetadata,
}: {
  collectionId: number;
  classNumber: number | null;
  syllabusMetadata: SettingsSyllabusMetadata;
}) {
  if (classNumber == null) {
    return (
      <header className="syllabus-gallery-class-header">
        <GalleryGroupHeading icon={{ kind: "class" }}>
          {getString("gallery-unnumbered")}
        </GalleryGroupHeading>
        <p className="syllabus-gallery-class-description">
          {getString("gallery-unnumbered-desc")}
        </p>
      </header>
    );
  }

  const { singularCapitalized } =
    SyllabusManager.getNomenclatureFormatted(collectionId);
  const classMeta = classByNumber(syllabusMetadata, classNumber);
  const title = (classMeta?.title || "").trim();
  const description = (classMeta?.description || "").trim();
  const readingDate = classMeta?.readingDate;
  const classIsDone =
    SyllabusManager.getClassStatus(collectionId, classNumber) === "done";

  const className = `${singularCapitalized} ${classNumber}`;
  const showKicker = Boolean(title || classIsDone || readingDate);

  return (
    <header className="syllabus-gallery-class-header">
      {showKicker ? (
        <div className="syllabus-gallery-class-kicker">
          {title ? (
            <div className="syllabus-gallery-class-label">{className}</div>
          ) : null}
          {classIsDone ? (
            <span className="syllabus-gallery-class-done">
              {getString("status-done")}
            </span>
          ) : null}
          {readingDate ? (
            <span className="syllabus-gallery-class-date">
              {formatReadingDate(readingDate)}
            </span>
          ) : null}
        </div>
      ) : null}
      <GalleryGroupHeading icon={{ kind: "class" }}>
        {title || className}
      </GalleryGroupHeading>
      {description ? (
        <div className="syllabus-gallery-class-description">
          <ProseText text={description} />
        </div>
      ) : null}
    </header>
  );
}

function gallerySortOptions(): GallerySegmentOption<GallerySortBy>[] {
  return [
    {
      mode: "auto",
      label: getString("gallery-sort-auto"),
      title: getString("gallery-sort-auto-title"),
      Icon: ListOrdered,
    },
    {
      mode: "title",
      label: getString("gallery-sort-az"),
      title: getString("gallery-sort-az-title"),
      Icon: ArrowDownAZ,
    },
    {
      mode: "date",
      label: getString("gallery-sort-date"),
      title: getString("gallery-sort-date-title"),
      Icon: Calendar,
    },
    {
      mode: "dateAdded",
      label: getString("gallery-sort-date-added"),
      title: getString("gallery-sort-date-added-title"),
      Icon: CalendarPlus,
    },
  ];
}

function galleryQuoteOrderOptions(): GallerySegmentOption<AnnotationsQuoteOrder>[] {
  return [
    {
      mode: "location",
      label: getString("annotations-quote-order-location"),
      title: getString("annotations-quote-order-location-title"),
      Icon: ListOrdered,
    },
    {
      mode: "dateAdded",
      label: getString("annotations-quote-order-date-added"),
      title: getString("annotations-quote-order-date-added-title"),
      Icon: CalendarPlus,
    },
  ];
}

function galleryGroupByOptions(): GallerySegmentOption<GalleryGroupBy>[] {
  return [
    {
      mode: "none",
      label: getString("gallery-group-none"),
      title: getString("gallery-group-none-title"),
      Icon: LayoutGrid,
    },
    {
      mode: "auto",
      label: getString("gallery-group-auto"),
      title: getString("gallery-group-auto-title"),
      Icon: Sparkles,
    },
    {
      mode: "type",
      label: getString("gallery-group-type"),
      title: getString("gallery-group-type-title"),
      Icon: Shapes,
    },
    {
      mode: "creator",
      label: getString("gallery-group-creator"),
      title: getString("gallery-group-creator-title"),
      Icon: User,
    },
    {
      mode: "tags",
      label: getString("gallery-group-tags"),
      title: getString("gallery-group-tags-title"),
      Icon: Tags,
    },
    {
      mode: "subcollections",
      label: getString("gallery-group-subcollections"),
      title: getString("gallery-group-subcollections-title"),
      Icon: Folder,
    },
    {
      mode: "classes",
      label: getString("gallery-group-classes"),
      title: getString("gallery-group-classes-title"),
      Icon: GraduationCap,
    },
  ];
}

function galleryLayoutOptions(): GallerySegmentOption<GalleryLayout>[] {
  return [
    {
      mode: "card",
      label: getString("gallery-layout-card"),
      title: getString("gallery-layout-card-title"),
      Icon: LayoutList,
    },
    {
      mode: "cover",
      label: getString("gallery-layout-cover"),
      title: getString("gallery-layout-cover-title"),
      Icon: Image,
    },
    {
      mode: "annotations",
      label: getString("gallery-layout-annotations"),
      title: getString("gallery-layout-annotations-title"),
      Icon: Highlighter,
    },
    {
      mode: "magazine",
      label: getString("gallery-layout-magazine"),
      title: getString("gallery-layout-magazine-title"),
      Icon: Newspaper,
    },
  ];
}

function galleryDensityOptions(): GallerySegmentOption<ItemDensity>[] {
  return ITEM_DENSITIES.map((mode) => ({
    mode,
    label: densityLabel(mode),
    title: getString(
      mode === "row"
        ? "page-density-row"
        : mode === "standard"
          ? "page-density-standard"
          : "page-density-expanded",
    ),
    Icon: mode === "row" ? Rows3 : mode === "standard" ? Rows2 : Maximize2,
  }));
}

function magazinePackingOptions(): GallerySegmentOption<MagazinePacking>[] {
  return [
    {
      mode: "vertical",
      label: getString("gallery-packing-vertical"),
      title: getString("gallery-packing-vertical-title"),
      Icon: AlignJustify,
    },
    {
      mode: "grid",
      label: getString("gallery-packing-grid"),
      title: getString("gallery-packing-grid-title"),
      Icon: LayoutGrid,
    },
    {
      mode: "packed",
      label: getString("gallery-packing-packed"),
      title: getString("gallery-packing-packed-title"),
      Icon: StretchHorizontal,
    },
  ];
}

type GallerySegmentOption<T extends string> = {
  mode: T;
  label: string;
  title: string;
  Icon: typeof LayoutGrid;
};

function currentGalleryOption<T extends string>(
  options: GallerySegmentOption<T>[],
  value: T,
): GallerySegmentOption<T> {
  return options.find((option) => option.mode === value) ?? options[0];
}

function GalleryPageHeader({
  title,
  groupBy,
  onGroupBy,
  groupByGlobal,
  showClasses,
  showSubcollections = true,
  sortBy,
  onSortBy,
  sortByGlobal,
  layout,
  onLayout,
  layoutGlobal,
  magazinePacking,
  onMagazinePacking,
  magazinePackingGlobal,
  showItemsWithoutAnnotations,
  onShowItemsWithoutAnnotations,
  navGroups,
  activeGroupId,
  onSelectGroup,
  pillsRef,
}: {
  title: string;
  groupBy: GalleryGroupBy;
  onGroupBy: (mode: GalleryGroupBy) => void;
  groupByGlobal: GalleryGlobalSetting<GalleryGroupBy>;
  showClasses: boolean;
  showSubcollections?: boolean;
  sortBy: GallerySortBy;
  onSortBy: (mode: GallerySortBy) => void;
  sortByGlobal: GalleryGlobalSetting<GallerySortBy>;
  layout: GalleryLayout;
  onLayout: (mode: GalleryLayout) => void;
  layoutGlobal: GalleryGlobalSetting<GalleryLayout>;
  magazinePacking: MagazinePacking;
  onMagazinePacking: (packing: MagazinePacking) => void;
  magazinePackingGlobal: GalleryGlobalSetting<MagazinePacking>;
  showItemsWithoutAnnotations: boolean;
  onShowItemsWithoutAnnotations: (show: boolean) => void;
  navGroups: GalleryNavGroup[];
  activeGroupId: string | null;
  onSelectGroup: (id: string) => void;
  pillsRef: RefObject<HTMLElement>;
}) {
  const [open, setOpen] = useState(false);
  const [tourPinned, setTourPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuOpen = open || tourPinned;

  useEffect(() => {
    const win = Zotero.getMainWindow();
    if (!win) {
      return;
    }
    const onOpen = () => {
      setTourPinned(true);
      setOpen(true);
    };
    const onClose = () => {
      setTourPinned(false);
      setOpen(false);
    };
    win.addEventListener(GALLERY_TOUR_EVENT_OPEN_SETTINGS, onOpen);
    win.addEventListener(GALLERY_TOUR_EVENT_CLOSE_SETTINGS, onClose);
    return () => {
      win.removeEventListener(GALLERY_TOUR_EVENT_OPEN_SETTINGS, onOpen);
      win.removeEventListener(GALLERY_TOUR_EVENT_CLOSE_SETTINGS, onClose);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (tourPinned) {
        return;
      }
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node)) {
        return;
      }
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !tourPinned) {
        setOpen(false);
      }
    };
    const win = Zotero.getMainWindow();
    win.document.addEventListener("mousedown", onPointerDown, true);
    win.document.addEventListener("keydown", onKeyDown, true);
    return () => {
      win.document.removeEventListener("mousedown", onPointerDown, true);
      win.document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [menuOpen, tourPinned]);

  const layoutOptions = galleryLayoutOptions();
  const sortOptions = gallerySortOptions();
  const quoteOrderOptions = galleryQuoteOrderOptions();
  const [quoteOrder, setQuoteOrder] = useAnnotationsQuoteOrder();
  const densityOptions = galleryDensityOptions();
  const [density, setDensity] = useZoteroItemDensity();
  const allGroupBy = galleryGroupByOptions();
  const groupByOptions = allGroupBy.filter((option) => {
    if (option.mode === "auto" && layout !== "magazine") {
      return false;
    }
    if (option.mode === "classes" && !showClasses) {
      return false;
    }
    if (option.mode === "subcollections" && !showSubcollections) {
      return false;
    }
    return true;
  });
  const layoutOption = currentGalleryOption(layoutOptions, layout);
  const sortOption = currentGalleryOption(sortOptions, sortBy);
  const groupOption = currentGalleryOption(groupByOptions, groupBy);
  const LayoutIcon = layoutOption.Icon;
  const SortIcon = sortOption.Icon;
  const GroupIcon = groupOption.Icon;
  const prefsSummary = getString("gallery-prefs-summary", {
    args: {
      layout: layoutOption.label,
      sort: sortOption.label,
      group: groupOption.label,
    },
  });

  return (
    <div className="syllabus-gallery-header">
      <div className="syllabus-gallery-header-bar">
        <h1 className="syllabus-gallery-title" title={title}>
          {title}
        </h1>
        <div className="syllabus-gallery-menu" ref={rootRef}>
          <button
            type="button"
            className="syllabus-gallery-menu-btn"
            data-tour="gallery-options"
            aria-label={getString("gallery-options-aria")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={prefsSummary}
            onClick={() => setOpen((value) => !value)}
          >
            <span
              className="syllabus-gallery-prefs"
              dir="ltr"
              aria-hidden="true"
            >
              <span className="syllabus-gallery-prefs-paren">(</span>
              <LayoutIcon size={14} strokeWidth={2} />
              <span className="syllabus-gallery-prefs-sep">/</span>
              <SortIcon size={14} strokeWidth={2} />
              <span className="syllabus-gallery-prefs-sep">/</span>
              <GroupIcon size={14} strokeWidth={2} />
              <span className="syllabus-gallery-prefs-paren">)</span>
            </span>
            <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div
              className="syllabus-gallery-popover"
              role="menu"
              data-tour="gallery-settings"
            >
              <div className="syllabus-gallery-toolbar">
                <GallerySegmentedControl
                  label={getString("gallery-menu-view")}
                  ariaLabel={getString("gallery-menu-view")}
                  value={layout}
                  onChange={onLayout}
                  options={layoutOptions}
                  tourPrefix="gallery-layout"
                  globalSetting={layoutGlobal}
                />
                <GallerySegmentedControl
                  label={getString("gallery-menu-sort")}
                  ariaLabel={getString("gallery-menu-sort")}
                  value={sortBy}
                  onChange={onSortBy}
                  options={sortOptions}
                  globalSetting={sortByGlobal}
                />
                <GallerySegmentedControl
                  label={getString("gallery-menu-group")}
                  ariaLabel={getString("gallery-menu-group")}
                  value={groupBy}
                  onChange={onGroupBy}
                  options={groupByOptions}
                  tourPrefix="gallery-group"
                  globalSetting={groupByGlobal}
                />
                {layout === "card" ? (
                  <GallerySegmentedControl
                    label={getString("settings-density")}
                    ariaLabel={getString("settings-density")}
                    value={density}
                    onChange={setDensity}
                    options={densityOptions}
                  />
                ) : null}
                {layout === "magazine" ? (
                  <>
                    <GallerySegmentedControl
                      label={getString("gallery-menu-packing")}
                      ariaLabel={getString("gallery-menu-packing")}
                      value={magazinePacking}
                      onChange={onMagazinePacking}
                      options={magazinePackingOptions()}
                      globalSetting={magazinePackingGlobal}
                    />
                  </>
                ) : null}
                {layout === "annotations" ? (
                  <>
                    <GallerySegmentedControl
                      label={getString("annotations-quote-order-menu")}
                      ariaLabel={getString("annotations-quote-order-menu")}
                      value={quoteOrder}
                      onChange={setQuoteOrder}
                      options={quoteOrderOptions}
                    />
                    <label className="syllabus-gallery-toolbar-checkbox">
                      <input
                        type="checkbox"
                        checked={showItemsWithoutAnnotations}
                        onChange={(e) =>
                          onShowItemsWithoutAnnotations(e.currentTarget.checked)
                        }
                      />
                      <span>{getString("gallery-annotations-show-empty")}</span>
                    </label>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {navGroups.length > 0 ? (
        <nav
          className="syllabus-gallery-groups-nav"
          ref={pillsRef}
          aria-label={getString("gallery-groups-nav-aria")}
        >
          <div className="syllabus-gallery-groups-nav-inner">
            {navGroups.map((group) => {
              const isActive = group.id === activeGroupId;
              return (
                <button
                  key={group.id}
                  type="button"
                  className="syllabus-gallery-group-pill"
                  data-gallery-group-pill={group.id}
                  aria-current={isActive ? "true" : undefined}
                  title={getString("gallery-group-jump", {
                    args: { name: group.label },
                  })}
                  onClick={() => onSelectGroup(group.id)}
                >
                  <GalleryGroupIcon spec={group.icon} />
                  <span className="syllabus-gallery-group-pill-label">
                    {group.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function GallerySegmentedControl<T extends string>({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  tourPrefix,
  globalSetting,
}: {
  label: string;
  ariaLabel: string;
  value: T;
  onChange: (mode: T) => void;
  options: GallerySegmentOption<T>[];
  tourPrefix?: string;
  globalSetting?: GalleryGlobalSetting<T>;
}) {
  return (
    <div className="syllabus-gallery-toolbar-cluster">
      <div className="syllabus-gallery-toolbar-heading">
        <span className="syllabus-gallery-groupby-label">{label}</span>
        {globalSetting ? (
          <button
            type="button"
            className={twMerge(
              "syllabus-gallery-save-global",
              globalSetting.isCustom && "is-active",
            )}
            title={
              globalSetting.isCustom
                ? getString("gallery-save-globally-active-title")
                : getString("gallery-save-globally-title")
            }
            aria-label={getString("gallery-save-globally")}
            aria-pressed={globalSetting.isCustom}
            onClick={(event) => {
              event.stopPropagation();
              globalSetting.saveGlobally();
            }}
          >
            <Globe size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="syllabus-gallery-groupby"
      >
        {options.map(({ mode, label: optionLabel, title, Icon }) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={value === mode}
            title={title}
            className="syllabus-gallery-groupby-btn"
            data-tour={tourPrefix ? `${tourPrefix}-${mode}` : undefined}
            onClick={() => onChange(mode)}
          >
            <Icon size={12} strokeWidth={2} aria-hidden="true" />
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function uniqueItems(items: Zotero.Item[]): Zotero.Item[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export { GalleryTile } from "./GalleryTile";

export function renderGalleryPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  props: GalleryPageProps,
) {
  renderComponent(
    win,
    rootElement,
    <GalleryPage {...props} />,
    "syllabus-custom-view",
    `gallery:${props.viewKey}`,
  );
}
