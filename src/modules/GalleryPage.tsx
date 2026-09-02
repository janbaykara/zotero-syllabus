// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { memo } from "preact/compat";
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
  ALargeSmall,
  ArrowDownAZ,
  BookOpen,
  Calendar,
  CalendarPlus,
  CaseSensitive,
  Folder,
  FolderOpen,
  Globe,
  GraduationCap,
  Image,
  LayoutGrid,
  LayoutList,
  ListOrdered,
  MoreHorizontal,
  Newspaper,
  Shapes,
  Tag,
  Tags,
  User,
  UserX,
} from "lucide-preact";
import { renderComponent } from "../utils/react";
import { isZotero8OrLater } from "../utils/zotero";
import {
  getItemCreatorLine,
  getItemTitle,
  openItemBestAttachment,
  sortItems,
} from "../utils/items";
import {
  faviconUrlForHostname,
  getItemHostname,
  getVideoSiteHostname,
  isAudioGalleryItem,
  isVideoGalleryItem,
  isWebGalleryItem,
} from "../utils/itemCover";
import { GalleryCover } from "./GalleryCover";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useZoteroItemsViewRegularItemIds } from "./react-zotero-sync/itemsViewItems";
import {
  useZoteroTreeRowItems,
  useZoteroTreeRowTitle,
} from "./react-zotero-sync/treeRowItems";
import { useZoteroCollectionTitle } from "./react-zotero-sync/collectionTitle";
import { useZoteroSyllabusMetadata } from "./react-zotero-sync/syllabusMetadata";
import { ProseText } from "./ProseText";
import { useZoteroCompactMode } from "./react-zotero-sync/compactMode";
import { SlimSyllabusItemCard, useItemIdentifierSelection } from "./browsePage";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { useSyllabusClassGroups } from "./classGroups";
import { useGalleryGroupBy, type GalleryGroupBy } from "./galleryGroupBy";
import {
  findActiveGalleryGroupId,
  flattenSubcollectionNavGroups,
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
import { useMagazineTypeSize, type MagazineTypeSize } from "./magazineTypeSize";
import {
  GALLERY_TOUR_EVENT_CLOSE_SETTINGS,
  GALLERY_TOUR_EVENT_OPEN_SETTINGS,
  maybeShowGalleryTour,
} from "./galleryTour";
import {
  magazineSectionTemplate,
  pickRecentMediaItems,
  type MagazineDeskInput,
} from "./magazineDesks";
import { MagazineGrid } from "./MagazineTile";
import { MagazineHome } from "./MagazineHome";
import { MagazineShelf } from "./MagazineShelf";
import { GalleryViewportProvider, useNearViewport } from "./galleryVisibility";
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
import type { SettingsSyllabusMetadata } from "../utils/schemas";
import {
  getPrimaryAttachmentProgress,
  type AttachmentReadingProgress,
} from "../utils/readingProgress";
import {
  getItemReadStatusName,
  getReadStatusMetadata,
} from "../zotero-reading-list/compat";

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
  const [groupBy, setGroupBy, groupByGlobal] = useGalleryGroupBy(viewKey, {
    classes: isSyllabus,
    subcollections: isCollectionScope,
  });
  const [sortBy, setSortBy, sortByGlobal] = useGallerySortBy(viewKey);
  const [layout, setLayout, layoutGlobal] = useGalleryLayout(viewKey);
  const [magazineTypeSize, setMagazineTypeSize, magazineTypeSizeGlobal] =
    useMagazineTypeSize(viewKey);
  const [compactMode] = useZoteroCompactMode();
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
        itemIds: furtherReadingItems.map((item) => item.id),
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

  const navGroups = useMemo((): GalleryNavGroup[] => {
    if (groupBy === "type") {
      return typeGroups.map(({ itemType, label }) => ({
        id: `type-${itemType}`,
        label,
        icon: { kind: "item-type", itemType },
      }));
    }
    if (groupBy === "creator") {
      const groups: GalleryNavGroup[] = creatorGroups.map(
        ({ label }, index) => ({
          id: `creator-${index}`,
          label,
          icon: { kind: "creator" },
        }),
      );
      if (uncreditedItems.length > 0) {
        groups.push({
          id: "uncredited",
          label: getString("gallery-uncredited"),
          icon: { kind: "uncredited" },
        });
      }
      return groups;
    }
    if (groupBy === "tags") {
      const groups: GalleryNavGroup[] = tagGroups.map(({ tag }, index) => ({
        id: `tag-${index}`,
        label: tag,
        icon: { kind: "tag" },
      }));
      if (untaggedItems.length > 0) {
        groups.push({
          id: "untagged",
          label: getString("gallery-untagged"),
          icon: { kind: "untagged" },
        });
      }
      return groups;
    }
    if (groupBy === "subcollections") {
      if (!subcollectionRoot || !subtreeHasContent(subcollectionRoot)) {
        return [];
      }
      return flattenSubcollectionNavGroups(
        subcollectionRoot,
        getString("gallery-in-this-collection"),
      );
    }
    if (groupBy === "classes") {
      const groups: GalleryNavGroup[] = [];
      for (const group of classGroups) {
        if (
          group.itemAssignments.length === 0 &&
          (isFiltered || group.classNumber == null)
        ) {
          continue;
        }
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
      if (furtherReadingItems.length > 0) {
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
    classGroups,
    collectionIdOrZero,
    creatorGroups,
    furtherReadingItems.length,
    groupBy,
    isFiltered,
    subcollectionRoot,
    syllabusMetadata,
    tagGroups,
    typeGroups,
    uncreditedItems.length,
    untaggedItems.length,
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
          selected={selectedItemIds?.includes(item.id) || false}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      ))}
    </div>
  );

  const renderCards = (items: Zotero.Item[], keyPrefix: string) => (
    <div
      className={twMerge(
        "syllabus-gallery-cards flex flex-col",
        compactMode ? "gap-2" : "gap-4",
      )}
    >
      {sortItems(uniqueItems(items), sortBy).map((item) => (
        <SlimSyllabusItemCard
          key={`${keyPrefix}-${item.id}`}
          item={item}
          collectionId={collectionIdOrZero}
          keyPrefix={keyPrefix}
          compactMode={compactMode}
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
    <MagazineGrid
      items={items}
      keyPrefix={keyPrefix}
      sortBy={sortBy}
      template={template}
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
    if (layout === "magazine") {
      return renderMagazine(
        rows.map(({ item }) => item),
        keyPrefix,
      );
    }
    if (layout !== "card") {
      return renderCovers(
        rows.map(({ item }) => item),
        keyPrefix,
      );
    }
    const sorted = sortAssignmentRows(rows, sortBy);
    return (
      <div
        className={twMerge(
          "syllabus-gallery-cards flex flex-col",
          compactMode ? "gap-2" : "gap-4",
        )}
      >
        {sorted.map(({ item, assignment }) => {
          if (!assignment.id) {
            return null;
          }
          const priority = assignment.priority || "";
          return (
            <SyllabusItemCard
              key={`${keyPrefix}-${item.id}-${assignment.id}`}
              item={item}
              collectionId={collectionIdOrZero}
              classNumber={classNumber ?? undefined}
              assignment={assignment}
              slim={compactMode || !priority || priority === "optional"}
              compactMode={compactMode}
              readerMode={false}
              isLocked={true}
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
        "syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background focus:outline-none",
        layout === "magazine" && "syllabus-magazine-page",
        layout === "magazine" &&
          magazineTypeSize === "large" &&
          "is-large-type",
        compactMode && "compact-mode",
      )}
      dir={getUiDir()}
    >
      <div className="pb-10">
        <div
          ref={stickyRef}
          className={twMerge(
            "syllabus-gallery-sticky sticky top-0 z-40 bg-background",
            isZotero8OrLater() ? "md:pt-8 pt-6" : "pt-8",
          )}
        >
          <div className="px-6">
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
              magazineTypeSize={magazineTypeSize}
              onMagazineTypeSize={setMagazineTypeSize}
              magazineTypeSizeGlobal={magazineTypeSizeGlobal}
              navGroups={navGroups}
              activeGroupId={activeGroupId}
              onSelectGroup={handleSelectGroup}
              pillsRef={pillsRef}
            />
          </div>
        </div>
        <GalleryViewportProvider rootRef={pageRef}>
          <div className="px-6 pt-4">
            {layout === "magazine" && groupBy !== "none" ? (
              <>
                <MagazineShelf
                  kind="video"
                  items={pickRecentMediaItems(
                    syllabusItems.map(({ zoteroItem }) => zoteroItem),
                    "video",
                  )}
                  selectedItemIds={selectedItemIds}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  onContextMenu={handleContextMenu}
                />
                <MagazineShelf
                  kind="audio"
                  items={pickRecentMediaItems(
                    syllabusItems.map(({ zoteroItem }) => zoteroItem),
                    "audio",
                  )}
                  selectedItemIds={selectedItemIds}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  onContextMenu={handleContextMenu}
                />
              </>
            ) : null}
            {groupBy === "none" &&
              (syllabusItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : layout === "magazine" ? (
                <MagazineHome
                  items={syllabusItems.map(({ zoteroItem }) => zoteroItem)}
                  tagGroups={tagGroups}
                  classDesks={magazineClassDesks}
                  subcollectionRoot={subcollectionRoot}
                  sortBy={sortBy}
                  selectedItemIds={selectedItemIds}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  onContextMenu={handleContextMenu}
                />
              ) : (
                renderItems(
                  syllabusItems.map(({ zoteroItem }) => zoteroItem),
                  "all",
                )
              ))}

            {groupBy === "type" &&
              (typeGroups.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                typeGroups.map(({ itemType, label, items }) => (
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
              (creatorGroups.length === 0 && uncreditedItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                <>
                  {creatorGroups.map(({ key, label, items }, index) => (
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
                  {uncreditedItems.length > 0 && (
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
                      {renderItems(uncreditedItems, "uncredited")}
                    </section>
                  )}
                </>
              ))}

            {groupBy === "tags" &&
              (tagGroups.length === 0 && untaggedItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                <>
                  {tagGroups.map(({ tag, items }, index) => (
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
                  {untaggedItems.length > 0 && (
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
                      {renderItems(untaggedItems, "untagged")}
                    </section>
                  )}
                </>
              ))}

            {groupBy === "subcollections" &&
              (!subcollectionRoot || !subtreeHasContent(subcollectionRoot) ? (
                <p className="text-secondary text-lg">
                  {isFiltered
                    ? emptyMessage
                    : getString("gallery-empty-subcollections")}
                </p>
              ) : (
                <GallerySubcollectionSection
                  node={subcollectionRoot}
                  depth={0}
                  isRoot
                  resolveItems={resolveSubcollectionItems}
                  renderItems={renderItems}
                />
              ))}

            {groupBy === "classes" &&
              (classGroups.every(
                (group) => group.itemAssignments.length === 0,
              ) && furtherReadingItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
              ) : (
                <>
                  {classGroups.map((group) => {
                    if (
                      group.itemAssignments.length === 0 &&
                      (isFiltered || group.classNumber == null)
                    ) {
                      return null;
                    }
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
                  {furtherReadingItems.length > 0 && (
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
                      {renderItems(furtherReadingItems, "further-reading")}
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

function GalleryGroupIcon({ spec }: { spec: GalleryGroupIconSpec }) {
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
              : spec.kind === "class"
                ? GraduationCap
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
        <GalleryGroupHeading icon={{ kind: "collection" }}>
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

function galleryGroupByOptions(): GallerySegmentOption<GalleryGroupBy>[] {
  return [
    {
      mode: "none",
      label: getString("gallery-group-none"),
      title: getString("gallery-group-none-title"),
      Icon: LayoutGrid,
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
      mode: "cover",
      label: getString("gallery-layout-cover"),
      title: getString("gallery-layout-cover-title"),
      Icon: Image,
    },
    {
      mode: "magazine",
      label: getString("gallery-layout-magazine"),
      title: getString("gallery-layout-magazine-title"),
      Icon: Newspaper,
    },
    {
      mode: "card",
      label: getString("gallery-layout-card"),
      title: getString("gallery-layout-card-title"),
      Icon: LayoutList,
    },
  ];
}

function magazineTypeSizeOptions(): GallerySegmentOption<MagazineTypeSize>[] {
  return [
    {
      mode: "small",
      label: getString("gallery-type-small"),
      title: getString("gallery-type-small-title"),
      Icon: CaseSensitive,
    },
    {
      mode: "large",
      label: getString("gallery-type-large"),
      title: getString("gallery-type-large-title"),
      Icon: ALargeSmall,
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
  magazineTypeSize,
  onMagazineTypeSize,
  magazineTypeSizeGlobal,
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
  magazineTypeSize: MagazineTypeSize;
  onMagazineTypeSize: (size: MagazineTypeSize) => void;
  magazineTypeSizeGlobal: GalleryGlobalSetting<MagazineTypeSize>;
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
  const allGroupBy = galleryGroupByOptions();
  const groupByOptions = allGroupBy.filter((option) => {
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
                {layout === "magazine" ? (
                  <GallerySegmentedControl
                    label={getString("gallery-menu-type-size")}
                    ariaLabel={getString("gallery-menu-type-size")}
                    value={magazineTypeSize}
                    onChange={onMagazineTypeSize}
                    options={magazineTypeSizeOptions()}
                    globalSetting={magazineTypeSizeGlobal}
                  />
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

function sortAssignmentRows(
  rows: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>,
  sortBy: GallerySortBy,
) {
  if (sortBy === "auto") {
    return rows;
  }
  const order = new Map(
    sortItems(
      rows.map((row) => row.item),
      sortBy,
    ).map((item, index) => [item.id, index]),
  );
  return [...rows].sort(
    (a, b) => (order.get(a.item.id) ?? 0) - (order.get(b.item.id) ?? 0),
  );
}

type GalleryTileProps = {
  item: Zotero.Item;
  selected: boolean;
  interactive?: boolean;
  onClick: (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: (
    item: Zotero.Item,
    e: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
};

export const GalleryTile = memo(function GalleryTile({
  item,
  selected,
  interactive = true,
  onClick,
  onDoubleClick,
  onContextMenu,
}: GalleryTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const visible = useNearViewport(tileRef);
  const title = useMemo(
    () => getItemTitle(item) || getString("untitled"),
    [item],
  );
  const creator = useMemo(() => getItemCreatorLine(item), [item]);
  const hostname = useMemo(() => {
    if (isVideoGalleryItem(item)) {
      return getVideoSiteHostname(item);
    }
    if (isWebGalleryItem(item) || isAudioGalleryItem(item)) {
      return getItemHostname(item);
    }
    return "";
  }, [item]);
  const faviconSrc = useMemo(
    () => (hostname ? faviconUrlForHostname(hostname) : null),
    [hostname],
  );
  const readStatusName = useMemo(() => getItemReadStatusName(item), [item]);
  const readStatus = useMemo(
    () => (readStatusName ? getReadStatusMetadata(readStatusName) : undefined),
    [readStatusName],
  );
  const [progress, setProgress] = useState<AttachmentReadingProgress | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void getPrimaryAttachmentProgress(item).then((resolved) => {
      if (!cancelled) {
        setProgress(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, item]);

  return (
    <div
      ref={tileRef}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? -1 : undefined}
      data-item-id={item.id}
      className={twMerge(
        "syllabus-gallery-tile group min-w-0 select-none",
        interactive && "cursor-pointer outline-none",
      )}
      title={title}
      onClick={interactive ? (e) => onClick(item, e) : undefined}
      onDblClick={interactive ? () => onDoubleClick(item) : undefined}
      onContextMenu={interactive ? (e) => onContextMenu(item, e) : undefined}
    >
      <GalleryCover item={item} selected={selected} visible={visible} />
      <div className="syllabus-gallery-meta min-w-0 px-0.5">
        <div className="text-sm font-medium text-primary leading-snug line-clamp-2">
          {title}
        </div>
        {hostname ? (
          <div className="syllabus-gallery-hostrow">
            {faviconSrc ? (
              <img
                src={faviconSrc}
                alt=""
                className="syllabus-gallery-favicon"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
            <span className="truncate">{hostname}</span>
          </div>
        ) : creator ? (
          <div className="text-xs text-secondary truncate mt-0.5">
            {creator}
          </div>
        ) : null}
        {progress ? (
          <div
            className="syllabus-gallery-progress"
            title={getString("gallery-page-of", {
              args: { page: progress.page, total: progress.total },
            })}
          >
            <div className="syllabus-gallery-progress-track">
              <div
                className="syllabus-gallery-progress-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="syllabus-gallery-progress-pct">
              {progress.percent}%
            </span>
          </div>
        ) : null}
        {readStatus ? (
          <div className="text-[11px] text-secondary truncate mt-0.5 uppercase tracking-wide">
            {readStatus.icon} {readStatus.name}
          </div>
        ) : null}
      </div>
    </div>
  );
}, areGalleryTilePropsEqual);

function areGalleryTilePropsEqual(
  prev: GalleryTileProps,
  next: GalleryTileProps,
): boolean {
  return (
    prev.item.id === next.item.id &&
    prev.item.dateModified === next.item.dateModified &&
    prev.selected === next.selected &&
    prev.interactive === next.interactive &&
    prev.onClick === next.onClick &&
    prev.onDoubleClick === next.onDoubleClick &&
    prev.onContextMenu === next.onContextMenu
  );
}

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
  );
}
