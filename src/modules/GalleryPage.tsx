// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  ArrowDownAZ,
  Calendar,
  Folder,
  GraduationCap,
  Image,
  LayoutGrid,
  LayoutList,
  ListOrdered,
  MoreHorizontal,
  Shapes,
  Tags,
} from "lucide-preact";
import { renderComponent } from "../utils/react";
import { isZotero8OrLater } from "../utils/zotero";
import { openItemBestAttachment, sortItems } from "../utils/items";
import {
  faviconUrlForHostname,
  getItemHostname,
  getPlaceholderCover,
  getVideoSiteHostname,
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
import { useGalleryLayout, type GalleryLayout } from "./galleryLayout";
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
import { formatReadingDate } from "../utils/dates";
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
    ? "No matching items."
    : "No items in this collection.";

  const handleClick = useCallback(
    (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => {
      if (e.shiftKey) {
        handleIdentifierClick(item, undefined, e);
        return;
      }
      try {
        const pane = ztoolkit.getGlobal("ZoteroPane");
        pane.selectItem(item.id);
      } catch (err) {
        ztoolkit.log("Error selecting gallery item:", err);
      }
    },
    [handleIdentifierClick],
  );

  const handleDoubleClick = useCallback((item: Zotero.Item) => {
    openItemBestAttachment(item);
  }, []);

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
      className={twMerge(
        "syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background",
        compactMode && "compact-mode",
      )}
    >
      <div
        className={twMerge(
          "px-6 pb-10",
          isZotero8OrLater() ? "md:pt-8 pt-6" : "pt-8",
        )}
      >
        <GalleryPageHeader
          title={title || "Untitled"}
          groupBy={groupBy}
          onGroupBy={setGroupBy}
          showClasses={isSyllabus}
          sortBy={sortBy}
          onSortBy={setSortBy}
          layout={layout}
          onLayout={setLayout}
        />

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
              <section key={itemType} className="syllabus-gallery-section">
                <h2 className="syllabus-gallery-section-title">{label}</h2>
                {renderItems(items, `type-${itemType}`)}
              </section>
            ))
          ))}

        {groupBy === "tags" &&
          (tagGroups.length === 0 && untaggedItems.length === 0 ? (
            <p className="text-secondary text-lg">{emptyMessage}</p>
          ) : (
            <>
              {tagGroups.map(({ tag, items }) => (
                <section key={tag} className="syllabus-gallery-section">
                  <h2 className="syllabus-gallery-section-title">{tag}</h2>
                  {renderItems(items, `tag-${tag}`)}
                </section>
              ))}
              {untaggedItems.length > 0 && (
                <section className="syllabus-gallery-section">
                  <h2 className="syllabus-gallery-section-title">Untagged</h2>
                  <p className="syllabus-gallery-class-description">
                    Items in this section have no tags.
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
                : "No subcollections or items in this collection."}
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
          (classGroups.every((group) => group.itemAssignments.length === 0) &&
          furtherReadingItems.length === 0 ? (
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
                  <section key={key} className="syllabus-gallery-section">
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
                <section className="syllabus-gallery-section">
                  <h2 className="syllabus-gallery-section-title">
                    Further reading
                  </h2>
                  <p className="syllabus-gallery-class-description">
                    Items in this section have not been assigned to any class.
                  </p>
                  {renderItems(furtherReadingItems, "further-reading")}
                </section>
              )}
            </>
          ))}
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
    >
      {!isRoot && (
        <h2 className="syllabus-gallery-section-title">{node.name}</h2>
      )}

      {isRoot && items.length > 0 && (
        <section className="syllabus-gallery-section">
          <h2 className="syllabus-gallery-section-title-muted">
            In this collection
          </h2>
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
        <h2 className="syllabus-gallery-section-title">Unnumbered</h2>
        <p className="syllabus-gallery-class-description">
          Assigned without a class number.
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

  return (
    <header className="syllabus-gallery-class-header">
      <div className="syllabus-gallery-class-kicker">
        {title ? (
          <div className="syllabus-gallery-class-label">
            {singularCapitalized} {classNumber}
          </div>
        ) : (
          <h2 className="syllabus-gallery-class-label">
            {singularCapitalized} {classNumber}
          </h2>
        )}
        {classIsDone ? (
          <span className="syllabus-gallery-class-done">Done</span>
        ) : null}
        {readingDate ? (
          <span className="syllabus-gallery-class-date">
            {formatReadingDate(readingDate)}
          </span>
        ) : null}
      </div>
      {title ? (
        <h2 className="syllabus-gallery-section-title">{title}</h2>
      ) : null}
      {description ? (
        <div className="syllabus-gallery-class-description">
          <ProseText text={description} />
        </div>
      ) : null}
    </header>
  );
}

const GALLERY_SORT_OPTIONS: GallerySegmentOption<GallerySortBy>[] = [
  {
    mode: "auto",
    label: "Auto",
    title: "Automatic order (collection or syllabus)",
    Icon: ListOrdered,
  },
  {
    mode: "title",
    label: "A–Z",
    title: "Sort A–Z",
    Icon: ArrowDownAZ,
  },
  {
    mode: "date",
    label: "Date",
    title: "Sort by date (newest first)",
    Icon: Calendar,
  },
];

const GALLERY_GROUP_BY_OPTIONS: GallerySegmentOption<GalleryGroupBy>[] = [
  { mode: "none", label: "None", title: "No grouping", Icon: LayoutGrid },
  {
    mode: "type",
    label: "Type",
    title: "Group by item type",
    Icon: Shapes,
  },
  {
    mode: "tags",
    label: "Tags",
    title: "Group by tags",
    Icon: Tags,
  },
  {
    mode: "subcollections",
    label: "Sub-collections",
    title: "Group by sub-collections",
    Icon: Folder,
  },
  {
    mode: "classes",
    label: "Classes",
    title: "Group by classes",
    Icon: GraduationCap,
  },
];

const GALLERY_LAYOUT_OPTIONS: GallerySegmentOption<GalleryLayout>[] = [
  {
    mode: "cover",
    label: "Cover",
    title: "Cover art",
    Icon: Image,
  },
  {
    mode: "card",
    label: "Card",
    title: "Syllabus cards",
    Icon: LayoutList,
  },
];

type GallerySegmentOption<T extends string> = {
  mode: T;
  label: string;
  title: string;
  Icon: typeof LayoutGrid;
};

function GalleryPageHeader({
  title,
  groupBy,
  onGroupBy,
  showClasses,
  sortBy,
  onSortBy,
  layout,
  onLayout,
}: {
  title: string;
  groupBy: GalleryGroupBy;
  onGroupBy: (mode: GalleryGroupBy) => void;
  showClasses: boolean;
  sortBy: GallerySortBy;
  onSortBy: (mode: GallerySortBy) => void;
  layout: GalleryLayout;
  onLayout: (mode: GalleryLayout) => void;
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

  const groupByOptions = showClasses
    ? GALLERY_GROUP_BY_OPTIONS
    : GALLERY_GROUP_BY_OPTIONS.filter((option) => option.mode !== "classes");

  return (
    <div className="syllabus-gallery-header">
      <h1 className="syllabus-gallery-title">{title}</h1>
      <div className="syllabus-gallery-menu" ref={rootRef}>
        <button
          type="button"
          className="syllabus-gallery-menu-btn"
          aria-label="Gallery view options"
          aria-haspopup="menu"
          aria-expanded={open}
          title="View options"
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        {open ? (
          <div className="syllabus-gallery-popover" role="menu">
            <div className="syllabus-gallery-toolbar">
              <GallerySegmentedControl
                label="View"
                ariaLabel="Gallery item layout"
                value={layout}
                onChange={onLayout}
                options={GALLERY_LAYOUT_OPTIONS}
              />
              <GallerySegmentedControl
                label="Sort"
                ariaLabel="Sort gallery items"
                value={sortBy}
                onChange={onSortBy}
                options={GALLERY_SORT_OPTIONS}
              />
              <GallerySegmentedControl
                label="Group by"
                ariaLabel="Group gallery items"
                value={groupBy}
                onChange={onGroupBy}
                options={groupByOptions}
              />
            </div>
          </div>
        ) : null}
      </div>
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

function GalleryTile({
  item,
  selected,
  onClick,
  onDoubleClick,
}: {
  item: Zotero.Item;
  selected: boolean;
  onClick: (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  onDoubleClick: (item: Zotero.Item) => void;
}) {
  const title = useMemo(() => {
    try {
      return item.getField("title") || "Untitled";
    } catch {
      return "Untitled";
    }
  }, [item]);
  const creator = useMemo(() => {
    try {
      return (item.firstCreator || item.getField("firstCreator") || "").trim();
    } catch {
      return "";
    }
  }, [item]);
  const hostname = useMemo(() => {
    if (isVideoGalleryItem(item)) {
      return getVideoSiteHostname(item);
    }
    if (isWebGalleryItem(item)) {
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
    let cancelled = false;
    void getPrimaryAttachmentProgress(item).then((resolved) => {
      if (!cancelled) {
        setProgress(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [item]);

  return (
    <div
      role="button"
      tabIndex={0}
      className="syllabus-gallery-tile group min-w-0 cursor-pointer outline-none select-none"
      title={title}
      onClick={(e) => onClick(item, e)}
      onDblClick={() => onDoubleClick(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onDoubleClick(item);
        }
      }}
    >
      <GalleryCover item={item} selected={selected} />
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
            title={`Page ${progress.page} of ${progress.total}`}
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
}

const PAGE_LIKE_ITEM_TYPES = new Set([
  "book",
  "bookSection",
  "conferencePaper",
  "document",
  "journalArticle",
  "magazineArticle",
  "manuscript",
  "preprint",
  "report",
  "thesis",
]);

function GalleryCover({
  item,
  selected,
}: {
  item: Zotero.Item;
  selected: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const placeholder = useMemo(() => getPlaceholderCover(item), [item]);
  const [visible, setVisible] = useState(false);
  const [cover, setCover] = useState<ResolvedCover>(placeholder);

  useEffect(() => {
    setCover(placeholder);
  }, [placeholder]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const win = Zotero.getMainWindow();
    const Observer = win.IntersectionObserver;
    if (typeof Observer !== "function") {
      setVisible(true);
      return;
    }
    const observer = new Observer(
      (entries: IntersectionObserverEntry[]) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
        }
      },
      {
        root: el.closest(".syllabus-page") as Element | null,
        rootMargin: "240px",
      },
    );
    observer.observe(el);
    const timeout = win.setTimeout(() => setVisible(true), 500);
    return () => {
      observer.disconnect();
      win.clearTimeout(timeout);
    };
  }, []);

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
  const showWebOverlay = isWeb && cover.kind === "image" && !isVideo;
  const videoSite = isVideo ? getVideoSiteHostname(item) : "";
  const videoFavicon = videoSite ? faviconUrlForHostname(videoSite) : null;
  const useNaturalAspect =
    cover.kind === "image" && !isVideo && !isWeb && (isPageLike || isArtwork);
  const coverShapeClass = isVideo
    ? "syllabus-gallery-cover-video"
    : useNaturalAspect
      ? "syllabus-gallery-cover-natural"
      : isPageLike
        ? "syllabus-gallery-cover-portrait"
        : "syllabus-gallery-cover-square";

  return (
    <div
      ref={rootRef}
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
          showBinder &&
            twMerge(
              "syllabus-gallery-cover-face relative min-w-0 flex-1 overflow-hidden rounded-[3px] bg-quinary shadow-card transition-shadow group-hover:shadow-card-hover",
              coverShapeClass,
              isJournalLike &&
                cover.kind === "image" &&
                "syllabus-gallery-journal-sheet",
            ),
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
            hideText={isVideo}
          />
        )}
        {showWebOverlay ? (
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
        {isVideo ? (
          <div className="syllabus-gallery-play" aria-hidden="true">
            <span className="syllabus-gallery-play-btn" />
          </div>
        ) : null}
        {showSpine ? <div className="syllabus-gallery-book-spine" /> : null}
        {isJournalLike ? <div className="syllabus-gallery-page-fold" /> : null}
      </div>
    </div>
  );
}

function itemField(item: Zotero.Item, field: string): string {
  try {
    return String(item.getField(field as any) || "").trim();
  } catch {
    return "";
  }
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

function itemAuthorLine(item: Zotero.Item): string {
  try {
    const creators = item.getCreatorsJSON() || [];
    const authors = creators.filter(
      (creator) => creator.creatorType === "author",
    );
    const list = authors.length > 0 ? authors : creators;
    const names = list
      .map((creator) =>
        (
          creator.name || `${creator.firstName || ""} ${creator.lastName || ""}`
        ).trim(),
      )
      .filter(Boolean);
    if (names.length === 1) {
      return names[0];
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]}`;
    }
    if (names.length > 2) {
      return `${names[0]} et al.`;
    }
  } catch {
    // Fall through to firstCreator.
  }
  try {
    return (item.firstCreator || itemField(item, "firstCreator")).trim();
  } catch {
    return "";
  }
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
  const title = useMemo(() => itemField(item, "title") || "Untitled", [item]);
  const creator = useMemo(() => itemAuthorLine(item), [item]);
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
}: {
  cover: Extract<ResolvedCover, { kind: "placeholder" }>;
  insetForSpine?: boolean;
  hideText?: boolean;
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
          <div className="text-[13px] font-semibold leading-snug line-clamp-4 drop-shadow-sm">
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
