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
  ArrowDownAZ,
  BookOpen,
  Calendar,
  Folder,
  FolderOpen,
  GraduationCap,
  Image,
  LayoutGrid,
  LayoutList,
  ListOrdered,
  MoreHorizontal,
  Shapes,
  Tag,
  Tags,
} from "lucide-preact";
import { renderComponent } from "../utils/react";
import { isZotero8OrLater } from "../utils/zotero";
import {
  getItemCreatorLine,
  getItemField,
  getItemTitle,
  openItemBestAttachment,
  sortItems,
} from "../utils/items";
import {
  faviconUrlForHostname,
  getItemHostname,
  getPlaceholderCover,
  getVideoSiteHostname,
  isAudioGalleryItem,
  isPlayableGalleryItem,
  isVideoGalleryItem,
  isWebGalleryItem,
  resolveItemCover,
  type ResolvedCover,
} from "../utils/itemCover";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useZoteroItemsViewRegularItemIds } from "./react-zotero-sync/itemsViewItems";
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
import { useGalleryLayout, type GalleryLayout } from "./galleryLayout";
import { GalleryViewportProvider, useNearViewport } from "./galleryVisibility";
import { useGallerySortBy, type GallerySortBy } from "./gallerySort";
import { collectionHasSyllabusNote } from "./syllabusNote";
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

interface GalleryPageProps {
  collectionId: number;
}

export function GalleryPage({ collectionId }: GalleryPageProps) {
  const [title] = useZoteroCollectionTitle(collectionId);
  const allItems = useZoteroCollectionItems(collectionId, {
    recursive: "pref",
  });
  const matchingIds = useZoteroItemsViewRegularItemIds(collectionId);
  const isFiltered = matchingIds != null;
  const syllabusItems = useMemo(() => {
    if (!matchingIds) {
      return allItems;
    }
    return allItems.filter(({ zoteroItem }) => matchingIds.has(zoteroItem.id));
  }, [allItems, matchingIds]);
  const isSyllabus = collectionHasSyllabusNote(collectionId);
  const [groupBy, setGroupBy] = useGalleryGroupBy(collectionId, isSyllabus);
  const [sortBy, setSortBy] = useGallerySortBy(collectionId);
  const [layout, setLayout] = useGalleryLayout(collectionId);
  const [compactMode] = useZoteroCompactMode();
  const [syllabusMetadata] = useZoteroSyllabusMetadata(collectionId);
  const { classGroups, furtherReadingItems } = useSyllabusClassGroups(
    collectionId,
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
  const { tagGroups, untaggedItems } = useCollectionTagGroups(syllabusItems);
  const { typeGroups } = useCollectionItemTypeGroups(syllabusItems);
  const {
    root: unfilteredSubcollectionRoot,
    resolveItems: resolveSubcollectionItems,
  } = useSubcollectionTree(collectionId);
  const subcollectionRoot = useMemo(
    () => filterSubcollectionNode(unfilteredSubcollectionRoot, matchingIds),
    [unfilteredSubcollectionRoot, matchingIds],
  );
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
    if (groupBy === "tags") {
      const groups = tagGroups.map(({ tag }, index) => ({
        id: `tag-${index}`,
        label: tag,
        icon: { kind: "tag" as const },
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
            collectionId,
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
    collectionId,
    furtherReadingItems.length,
    groupBy,
    isFiltered,
    subcollectionRoot,
    syllabusMetadata,
    tagGroups,
    typeGroups,
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
    const sections = [
      ...container.querySelectorAll<HTMLElement>("[data-gallery-group]"),
    ];
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
      const navKey = parseGalleryNavKey(e.key);
      if (!navKey && !isEnter) {
        return;
      }

      const { selectedItemIds: selected } = navStateRef.current;
      const currentIndex = getActiveGalleryIndex(
        els,
        selected,
        e.target,
        navKey ?? "down",
      );

      if (isEnter) {
        const currentEl = currentIndex >= 0 ? els[currentIndex] : null;
        const itemId = Number(currentEl?.dataset.itemId);
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
          collectionId={collectionId}
          keyPrefix={keyPrefix}
          compactMode={compactMode}
          selectedIdentifiers={selectedIdentifiers}
          selectedItemIds={selectedItemIds}
          onIdentifierClick={handleIdentifierClick}
        />
      ))}
    </div>
  );

  const renderItems = (items: Zotero.Item[], keyPrefix: string) =>
    layout === "card"
      ? renderCards(items, keyPrefix)
      : renderCovers(items, keyPrefix);

  const renderClassAssignments = (
    rows: Array<{ item: Zotero.Item; assignment: ItemSyllabusAssignment }>,
    classNumber: number | null,
    keyPrefix: string,
  ) => {
    if (rows.length === 0) {
      return null;
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
              collectionId={collectionId}
              classNumber={classNumber ?? undefined}
              assignment={assignment}
              slim={compactMode || !priority || priority === "optional"}
              compactMode={compactMode}
              readerMode={false}
              isLocked={true}
              selectedIdentifiers={selectedIdentifiers}
              onIdentifierClick={handleIdentifierClick}
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
              showClasses={isSyllabus}
              sortBy={sortBy}
              onSortBy={setSortBy}
              layout={layout}
              onLayout={setLayout}
              navGroups={navGroups}
              activeGroupId={activeGroupId}
              onSelectGroup={handleSelectGroup}
              pillsRef={pillsRef}
            />
          </div>
        </div>
        <GalleryViewportProvider rootRef={pageRef}>
          <div className="px-6 pt-4">
            {groupBy === "none" &&
              (syllabusItems.length === 0 ? (
                <p className="text-secondary text-lg">{emptyMessage}</p>
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
                          collectionId={collectionId}
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
    spec.kind === "tag"
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
      mode: "card",
      label: getString("gallery-layout-card"),
      title: getString("gallery-layout-card-title"),
      Icon: LayoutList,
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
  showClasses,
  sortBy,
  onSortBy,
  layout,
  onLayout,
  navGroups,
  activeGroupId,
  onSelectGroup,
  pillsRef,
}: {
  title: string;
  groupBy: GalleryGroupBy;
  onGroupBy: (mode: GalleryGroupBy) => void;
  showClasses: boolean;
  sortBy: GallerySortBy;
  onSortBy: (mode: GallerySortBy) => void;
  layout: GalleryLayout;
  onLayout: (mode: GalleryLayout) => void;
  navGroups: GalleryNavGroup[];
  activeGroupId: string | null;
  onSelectGroup: (id: string) => void;
  pillsRef: RefObject<HTMLElement>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node)) {
        return;
      }
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
  }, [open]);

  const layoutOptions = galleryLayoutOptions();
  const sortOptions = gallerySortOptions();
  const allGroupBy = galleryGroupByOptions();
  const groupByOptions = showClasses
    ? allGroupBy
    : allGroupBy.filter((option) => option.mode !== "classes");
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
            aria-label={getString("gallery-options-aria")}
            aria-haspopup="menu"
            aria-expanded={open}
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
          {open ? (
            <div className="syllabus-gallery-popover" role="menu">
              <div className="syllabus-gallery-toolbar">
                <GallerySegmentedControl
                  label={getString("gallery-menu-view")}
                  ariaLabel={getString("gallery-menu-view")}
                  value={layout}
                  onChange={onLayout}
                  options={layoutOptions}
                />
                <GallerySegmentedControl
                  label={getString("gallery-menu-sort")}
                  ariaLabel={getString("gallery-menu-sort")}
                  value={sortBy}
                  onChange={onSortBy}
                  options={sortOptions}
                />
                <GallerySegmentedControl
                  label={getString("gallery-menu-group")}
                  ariaLabel={getString("gallery-menu-group")}
                  value={groupBy}
                  onChange={onGroupBy}
                  options={groupByOptions}
                />
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
}: {
  label: string;
  ariaLabel: string;
  value: T;
  onChange: (mode: T) => void;
  options: GallerySegmentOption<T>[];
}) {
  return (
    <div className="syllabus-gallery-toolbar-cluster">
      <span className="syllabus-gallery-groupby-label">{label}</span>
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
  onClick: (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  onDoubleClick: (item: Zotero.Item) => void;
};

const GalleryTile = memo(function GalleryTile({
  item,
  selected,
  onClick,
  onDoubleClick,
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
      role="button"
      tabIndex={-1}
      data-item-id={item.id}
      className="syllabus-gallery-tile group min-w-0 cursor-pointer outline-none select-none"
      title={title}
      onClick={(e) => onClick(item, e)}
      onDblClick={() => onDoubleClick(item)}
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
    prev.onClick === next.onClick &&
    prev.onDoubleClick === next.onDoubleClick
  );
}

const PAGE_LIKE_ITEM_TYPES = new Set([
  "book",
  "bookSection",
  "conferencePaper",
  "document",
  "journalArticle",
  "manuscript",
  "preprint",
  "report",
  "thesis",
]);

type GalleryCoverProps = {
  item: Zotero.Item;
  selected: boolean;
  visible: boolean;
};

const GalleryCover = memo(function GalleryCover({
  item,
  selected,
  visible,
}: GalleryCoverProps) {
  const placeholder = useMemo(() => getPlaceholderCover(item), [item]);
  const [cover, setCover] = useState<ResolvedCover>(placeholder);

  useEffect(() => {
    setCover(placeholder);
  }, [placeholder]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void resolveItemCover(item).then((resolved) => {
      if (!cancelled) {
        setCover(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, item]);

  const isJournalLike =
    item.itemType === "journalArticle" || item.itemType === "conferencePaper";
  const isBookLike =
    item.itemType === "book" || item.itemType === "bookSection";
  const isPageLike = PAGE_LIKE_ITEM_TYPES.has(item.itemType);
  const isArtwork = item.itemType === "artwork";
  const showSpine = isBookLike;
  const useJournalFace = isJournalLike && cover.kind !== "image";
  const showBinder =
    item.itemType === "report" ||
    item.itemType === "document" ||
    item.itemType === "thesis";
  const isVideo = isVideoGalleryItem(item);
  const isWeb = isWebGalleryItem(item);
  const isAudio = isAudioGalleryItem(item);
  const showPlay = isPlayableGalleryItem(item);
  const showWebOverlay = isWeb && cover.kind === "image" && !isVideo;
  const showAudioCaption =
    isAudio && cover.kind === "image" && !cover.fromAttachment;
  const videoSite = isVideo ? getVideoSiteHostname(item) : "";
  const videoFavicon = videoSite ? faviconUrlForHostname(videoSite) : null;
  const useNaturalAspect =
    visible &&
    cover.kind === "image" &&
    !isVideo &&
    !isWeb &&
    (isPageLike || isArtwork);
  const coverShapeClass = isVideo
    ? "syllabus-gallery-cover-video"
    : isWeb
      ? "syllabus-gallery-cover-web"
      : useNaturalAspect
        ? "syllabus-gallery-cover-natural"
        : isPageLike
          ? "syllabus-gallery-cover-portrait"
          : "syllabus-gallery-cover-square";

  if (!visible) {
    return (
      <div
        className={twMerge(
          "relative w-full overflow-hidden rounded-[3px] bg-quinary",
          coverShapeClass,
          selected &&
            "ring-2 ring-[#7b4ddb] ring-offset-2 ring-offset-background",
        )}
      />
    );
  }

  return (
    <div
      className={twMerge(
        "relative w-full",
        showBinder
          ? "syllabus-gallery-cover-with-binder"
          : twMerge(
              "overflow-hidden rounded-[3px] bg-quinary shadow-card transition-shadow group-hover:shadow-card-hover",
              coverShapeClass,
              isJournalLike &&
                cover.kind === "image" &&
                "syllabus-gallery-journal-sheet",
            ),
        selected &&
          "ring-2 ring-[#7b4ddb] ring-offset-2 ring-offset-background",
      )}
    >
      {showBinder ? (
        <div className="syllabus-gallery-binder" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="syllabus-gallery-binder-ring" />
          ))}
        </div>
      ) : null}
      <div
        className={twMerge(
          showBinder
            ? twMerge(
                "syllabus-gallery-cover-face relative min-w-0 flex-1 overflow-hidden rounded-[3px] bg-quinary shadow-card transition-shadow group-hover:shadow-card-hover",
                coverShapeClass,
                isJournalLike &&
                  cover.kind === "image" &&
                  "syllabus-gallery-journal-sheet",
              )
            : "relative h-full w-full",
        )}
      >
        {cover.kind === "image" ? (
          <img
            src={cover.src}
            alt=""
            className={twMerge(
              useNaturalAspect
                ? "relative z-0 block h-auto w-full"
                : twMerge(
                    "absolute inset-0 h-full w-full",
                    cover.fit === "contain"
                      ? "object-contain bg-white"
                      : "object-cover",
                  ),
            )}
            draggable={false}
          />
        ) : useJournalFace ? (
          <JournalFace item={item} />
        ) : (
          <PlaceholderFace
            cover={cover}
            insetForSpine={showSpine}
            compact={isWeb}
          />
        )}
        {showWebOverlay || showAudioCaption ? (
          <div className="syllabus-gallery-web-caption">
            <div className="syllabus-gallery-web-caption-title">
              {placeholder.title}
            </div>
          </div>
        ) : null}
        {isVideo && videoFavicon ? (
          <img
            src={videoFavicon}
            alt=""
            className="syllabus-gallery-video-site"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        {showPlay ? (
          <div className="syllabus-gallery-play" aria-hidden="true">
            <span className="syllabus-gallery-play-btn" />
          </div>
        ) : null}
        {showSpine ? <div className="syllabus-gallery-book-spine" /> : null}
        {isJournalLike ? <div className="syllabus-gallery-page-fold" /> : null}
      </div>
    </div>
  );
}, areGalleryCoverPropsEqual);

function areGalleryCoverPropsEqual(
  prev: GalleryCoverProps,
  next: GalleryCoverProps,
): boolean {
  return (
    prev.item.id === next.item.id &&
    prev.item.dateModified === next.item.dateModified &&
    prev.selected === next.selected &&
    prev.visible === next.visible
  );
}

function itemField(item: Zotero.Item, field: string): string {
  return getItemField(item, field);
}

/** First-page mockups switch from a classic masthead to a SAGE-like layout. */
const JOURNAL_CONTEMPORARY_YEAR = 2000;

const JOURNAL_INK = [
  "#1e3a5f",
  "#6b2d3c",
  "#2d4a3e",
  "#3d4554",
  "#1a5a56",
  "#5c4a1f",
  "#3c2f5c",
  "#4a3728",
];

const JOURNAL_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "&",
]);

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function journalYear(item: Zotero.Item): number | null {
  const match = itemField(item, "date").match(/\d{4}/);
  if (!match || match[0] === "0000") {
    return null;
  }
  const year = Number(match[0]);
  return year >= 1000 && year <= 2100 ? year : null;
}

function journalInk(journal: string): string {
  return JOURNAL_INK[hashString(journal || "journal") % JOURNAL_INK.length];
}

function initialsFromPhrase(value: string): string {
  return value
    .split(/[\s,./&+:–—-]+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ""))
    .filter(
      (word) => word.length > 0 && !JOURNAL_STOP_WORDS.has(word.toLowerCase()),
    )
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 5);
}

function journalMark(journal: string, abbreviation: string): string {
  const letters = abbreviation.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (letters.length >= 2 && letters.length <= 5) {
    return letters;
  }
  const fromAbbr = initialsFromPhrase(abbreviation);
  if (fromAbbr.length >= 2) {
    return fromAbbr;
  }
  const head = (journal.split(/[:–—]/)[0] || journal).trim();
  const fromTitle = initialsFromPhrase(head);
  if (fromTitle.length >= 2) {
    return fromTitle;
  }
  return (head.replace(/[^A-Za-z]/g, "").slice(0, 3) || "J").toUpperCase();
}

function journalEditionLine(item: Zotero.Item): string {
  const volume = itemField(item, "volume");
  const issue = itemField(item, "issue");
  const pages = itemField(item, "pages");
  const year = journalYear(item);
  const yearText = year ? String(year) : "";

  const volIssue = [volume ? `Vol. ${volume}` : "", issue ? `No. ${issue}` : ""]
    .filter(Boolean)
    .join(", ");
  const head = yearText
    ? volIssue
      ? `${volIssue} (${yearText})`
      : yearText
    : volIssue;
  if (pages && head) {
    return `${head} · pp. ${pages}`;
  }
  if (pages) {
    return `pp. ${pages}`;
  }
  return head;
}

function cleanIssue(issue: string): string {
  return issue.replace(/^(issues?|no\.?|number)\s+/i, "").trim();
}

function journalEditionCompact(item: Zotero.Item): string {
  const volume = itemField(item, "volume");
  const issue = cleanIssue(itemField(item, "issue"));
  const year = journalYear(item);
  const shortIssue = issue.length > 0 && issue.length <= 12;
  const volIssue =
    volume && shortIssue
      ? `${volume}(${issue})`
      : volume
        ? `Vol. ${volume}`
        : shortIssue
          ? `No. ${issue}`
          : "";
  if (volIssue && year) {
    return `${volIssue} · ${year}`;
  }
  if (year) {
    return String(year);
  }
  return volIssue;
}

function itemAbstractSnippet(item: Zotero.Item): string {
  return itemField(item, "abstractNote")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^(?:research highlights(?:\s+and)?\s+)?abstracts?\b[\s:,.\-–—]*/i,
      "",
    )
    .replace(/(?:,\s*){2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function JournalFace({ item }: { item: Zotero.Item }) {
  const journal = useMemo(() => {
    return (
      itemField(item, "publicationTitle") ||
      itemField(item, "journalAbbreviation") ||
      itemField(item, "proceedingsTitle") ||
      itemField(item, "conferenceName") ||
      ""
    );
  }, [item]);
  const abbreviation = useMemo(
    () => itemField(item, "journalAbbreviation"),
    [item],
  );
  const year = useMemo(() => journalYear(item), [item]);
  const contemporary = year === null || year >= JOURNAL_CONTEMPORARY_YEAR;
  const edition = useMemo(
    () =>
      contemporary ? journalEditionCompact(item) : journalEditionLine(item),
    [item, contemporary],
  );
  const title = useMemo(
    () => itemField(item, "title") || getString("untitled"),
    [item],
  );
  const creator = useMemo(() => getItemCreatorLine(item), [item]);
  const abstractNote = useMemo(
    () => (contemporary ? itemAbstractSnippet(item) : ""),
    [item, contemporary],
  );
  const mark = useMemo(
    () => (journal ? journalMark(journal, abbreviation) : ""),
    [journal, abbreviation],
  );
  const ink = useMemo(() => journalInk(journal), [journal]);

  if (contemporary) {
    return (
      <div
        className={twMerge(
          "syllabus-gallery-journal is-contemporary",
          abstractNote && "has-abstract",
        )}
        style={{ "--journal-ink": ink } as JSX.CSSProperties}
      >
        {journal || edition ? (
          <div className="syllabus-gallery-journal-head">
            {mark ? (
              <div
                className="syllabus-gallery-journal-mark"
                data-len={String(mark.length)}
              >
                {mark}
              </div>
            ) : null}
            <div className="syllabus-gallery-journal-head-text">
              {journal ? (
                <div className="syllabus-gallery-journal-name">{journal}</div>
              ) : null}
              {edition ? (
                <div className="syllabus-gallery-journal-edition">
                  {edition}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="syllabus-gallery-journal-title">{title}</div>
        {creator ? (
          <div className="syllabus-gallery-journal-author">{creator}</div>
        ) : null}
        {abstractNote ? (
          <div className="syllabus-gallery-journal-abstract">
            {abstractNote}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="syllabus-gallery-journal">
      {journal ? (
        <div className="syllabus-gallery-journal-masthead">{journal}</div>
      ) : null}
      {edition ? (
        <div className="syllabus-gallery-journal-edition">{edition}</div>
      ) : null}
      {journal || edition ? (
        <div className="syllabus-gallery-journal-rule" />
      ) : null}
      <div className="syllabus-gallery-journal-title">{title}</div>
      {creator ? (
        <div className="syllabus-gallery-journal-author">{creator}</div>
      ) : null}
    </div>
  );
}

function PlaceholderFace({
  cover,
  insetForSpine = false,
  hideText = false,
  compact = false,
}: {
  cover: Extract<ResolvedCover, { kind: "placeholder" }>;
  insetForSpine?: boolean;
  hideText?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={twMerge(
        "absolute inset-0 flex flex-col justify-between text-white",
        insetForSpine ? "syllabus-gallery-placeholder-spine" : "p-3",
      )}
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${cover.color} 88%, white) 0%, ${cover.color} 55%, color-mix(in srgb, ${cover.color} 72%, black) 100%)`,
      }}
    >
      {hideText ? null : (
        <>
          <div
            className={twMerge(
              "font-semibold leading-snug drop-shadow-sm",
              compact ? "text-[12px] line-clamp-2" : "text-[13px] line-clamp-4",
            )}
          >
            {cover.title}
          </div>
          {cover.creator ? (
            <div className="text-[11px] opacity-85 line-clamp-2">
              {cover.creator}
            </div>
          ) : (
            <div />
          )}
        </>
      )}
    </div>
  );
}

export function renderGalleryPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  collectionId: number,
) {
  renderComponent(
    win,
    rootElement,
    <GalleryPage collectionId={collectionId} />,
    "syllabus-custom-view",
  );
}
