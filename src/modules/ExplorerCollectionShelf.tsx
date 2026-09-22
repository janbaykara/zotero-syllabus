// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { getCachedItem } from "../utils/cache";
import { sortItems } from "../utils/items";
import { formatReadingDate } from "../utils/dates";
import { getString } from "../utils/locale";
import {
  openCollectionSyllabusAtClass,
  selectCollectionInLibrary,
} from "./ClassReadingBlock";
import {
  buildSyllabusClassGroups,
  sortClassAssignmentRows,
  type ClassAssignmentRow,
  type SyllabusClassGroup,
} from "./classGroups";
import { useCollectionCreatorGroups } from "./creatorGroups";
import { useCollectionTagGroups } from "./tagGroups";
import { useCollectionItemTypeGroups } from "./typeGroups";
import {
  useSubcollectionTree,
  type SubcollectionNode,
} from "./subcollectionGroups";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import type { SyllabusData } from "./react-zotero-sync/useSyllabi";
import { SyllabusManager } from "./syllabus";
import { collectionHasSyllabusNote } from "./syllabusNote";
import { GalleryTile, GalleryGroupIcon } from "./GalleryPage";
import type { GalleryGroupIconSpec } from "./galleryGroupNav";
import { collectionGroupIconSpec } from "./galleryGroupNav";
import { MagazineGrid, type MagazineTileClick } from "./MagazineTile";
import { SlimSyllabusItemCard } from "./browsePage";
import { SyllabusItemCard } from "./SyllabusItemCard";
import {
  chromeByItemIdFromAssignments,
  type ReadingTileChrome,
} from "./readingAssignmentChrome";
import type { GalleryLayout } from "./galleryLayout";
import type { GalleryGroupBy } from "./galleryGroupBy";
import type { GallerySortBy } from "./gallerySort";
import type { MagazineTypeSize } from "./magazineTypeSize";
import type { ItemDensity } from "./react-zotero-sync/itemDensity";
import type { MagazineSectionTemplate } from "./magazineDesks";
import type { JSX } from "preact";
import {
  explorerShelfGroupBy,
  explorerShelfMagazineTypeSize,
  explorerShelfSortBy,
  type ExplorerCollectionShelf,
} from "./explorerConfig";

export type ExplorerShelfSegment = {
  key: string;
  title: string;
  label?: string;
  date?: string;
  done?: boolean;
  icon?: GalleryGroupIconSpec;
  items: Zotero.Item[];
  /** Class grouping: assignment rows so priority chrome / cards can show. */
  itemAssignments?: ClassAssignmentRow[];
  classNumber?: number | null;
  /** When segments span collections (e.g. upcoming deadlines). */
  collectionId?: number;
  onOpen?: () => void;
};

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

function uniqueClassItems(rows: ClassAssignmentRow[]): Zotero.Item[] {
  const seen = new Set<number>();
  const items: Zotero.Item[] = [];
  for (const { item } of rows) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    items.push(item);
  }
  return items;
}

function sortSegmentItems(
  items: Zotero.Item[],
  sortBy: GallerySortBy,
): Zotero.Item[] {
  return sortItems(uniqueItems(items), sortBy);
}

function collectSubtreeItemIds(node: SubcollectionNode): number[] {
  const ids = [...node.itemIds];
  for (const child of node.children) {
    ids.push(...collectSubtreeItemIds(child));
  }
  return ids;
}

function resolveItemIds(ids: number[]): Zotero.Item[] {
  const items: Zotero.Item[] = [];
  const seen = new Set<number>();
  for (const id of ids) {
    if (seen.has(id)) {
      continue;
    }
    const item = getCachedItem(id);
    if (!item || !item.isRegularItem()) {
      continue;
    }
    seen.add(id);
    items.push(item);
  }
  return items;
}

function ClassSegmentHeader({
  collectionId,
  classNumber,
  classMeta,
  onOpen,
}: {
  collectionId: number;
  classNumber: number | null;
  classMeta: SyllabusClassGroup["syllabusMetadata"];
  onOpen: () => void;
}) {
  if (classNumber == null) {
    return (
      <button
        type="button"
        className="syllabus-explorer-class-segment-header"
        onClick={onOpen}
      >
        <div
          className="syllabus-explorer-class-segment-kicker"
          aria-hidden="true"
        />
        <div className="syllabus-explorer-class-segment-title">
          <GalleryGroupIcon spec={{ kind: "class" }} />
          <span>{getString("gallery-unnumbered")}</span>
        </div>
      </button>
    );
  }

  const { singularCapitalized } =
    SyllabusManager.getNomenclatureFormatted(collectionId);
  const className = `${singularCapitalized} ${classNumber}`;
  const title = (classMeta?.title || "").trim();
  const readingDate = classMeta?.readingDate;
  const classIsDone =
    SyllabusManager.getClassStatus(collectionId, classNumber) === "done";

  return (
    <button
      type="button"
      className="syllabus-explorer-class-segment-header"
      onClick={onOpen}
    >
      <div className="syllabus-explorer-class-segment-kicker">
        {title ? (
          <span className="syllabus-explorer-class-segment-label">
            {className}
          </span>
        ) : null}
        {classIsDone ? (
          <span className="syllabus-explorer-class-segment-done">
            {getString("status-done")}
          </span>
        ) : null}
        {readingDate ? (
          <span className="syllabus-explorer-class-segment-date">
            {formatReadingDate(readingDate)}
          </span>
        ) : null}
      </div>
      <div className="syllabus-explorer-class-segment-title">
        <GalleryGroupIcon spec={{ kind: "class" }} />
        <span>{title || className}</span>
      </div>
    </button>
  );
}

function SegmentHeader({ segment }: { segment: ExplorerShelfSegment }) {
  const title = (
    <div className="syllabus-explorer-class-segment-title">
      {segment.icon ? <GalleryGroupIcon spec={segment.icon} /> : null}
      <span>{segment.title}</span>
    </div>
  );
  if (segment.onOpen) {
    return (
      <button
        type="button"
        className="syllabus-explorer-class-segment-header"
        onClick={segment.onOpen}
      >
        <div className="syllabus-explorer-class-segment-kicker">
          {segment.label ? (
            <span className="syllabus-explorer-class-segment-label">
              {segment.label}
            </span>
          ) : null}
          {segment.done ? (
            <span className="syllabus-explorer-class-segment-done">
              {getString("status-done")}
            </span>
          ) : null}
          {segment.date ? (
            <span className="syllabus-explorer-class-segment-date">
              {segment.date}
            </span>
          ) : null}
        </div>
        {title}
      </button>
    );
  }
  return (
    <div className="syllabus-explorer-class-segment-header">
      <div
        className="syllabus-explorer-class-segment-kicker"
        aria-hidden="true"
      />
      {title}
    </div>
  );
}

/** Horizontal Cover rail: one segment per group. */
export function ExplorerSegmentedCoverRail({
  segments,
  keyPrefix,
  collectionId = 0,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
  classHeaders,
}: {
  segments: ExplorerShelfSegment[];
  keyPrefix: string;
  collectionId?: number;
  selectedItemIds: number[] | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  /** Optional class-specific headers keyed by segment.key */
  classHeaders?: Record<
    string,
    {
      collectionId: number;
      classNumber: number | null;
      classMeta: SyllabusClassGroup["syllabusMetadata"];
      onOpen: () => void;
    }
  >;
}) {
  if (segments.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("explorer-shelf-empty")}
      </p>
    );
  }

  return (
    <div className="syllabus-explorer-class-cover-rail">
      {segments.map((segment) => {
        const classHeader = classHeaders?.[segment.key];
        const segmentCollectionId = segment.collectionId ?? collectionId;
        const chromeByItemId = segment.itemAssignments
          ? chromeByItemIdFromAssignments(
              segmentCollectionId,
              segment.itemAssignments,
            )
          : undefined;
        return (
          <section
            key={`${keyPrefix}-${segment.key}`}
            className={twMerge(
              "syllabus-explorer-class-segment",
              segment.done ? "is-done" : null,
            )}
            data-explorer-class={segment.key}
          >
            {classHeader ? (
              <ClassSegmentHeader {...classHeader} />
            ) : (
              <SegmentHeader segment={segment} />
            )}
            <div className="syllabus-explorer-class-segment-covers">
              {segment.items.map((item) => (
                <GalleryTile
                  key={`${keyPrefix}-${segment.key}-${item.id}`}
                  item={item}
                  collectionId={segmentCollectionId}
                  selected={selectedItemIds?.includes(item.id) || false}
                  chrome={chromeByItemId?.get(item.id)}
                  onClick={onClick}
                  onDoubleClick={onDoubleClick}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FlatCoverRail({
  items,
  keyPrefix,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  items: Zotero.Item[];
  keyPrefix: string;
  selectedItemIds: number[] | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  if (items.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("explorer-shelf-empty")}
      </p>
    );
  }
  return (
    <div className="syllabus-explorer-cover-rail">
      {items.map((item) => (
        <GalleryTile
          key={`${keyPrefix}-${item.id}`}
          item={item}
          selected={selectedItemIds?.includes(item.id) || false}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

function buildClassSegments(
  collectionId: number,
  syllabus: SyllabusData,
  sortBy: GallerySortBy,
): {
  segments: ExplorerShelfSegment[];
  classHeaders: NonNullable<
    Parameters<typeof ExplorerSegmentedCoverRail>[0]["classHeaders"]
  >;
} {
  const { classGroups, furtherReadingItems } = buildSyllabusClassGroups(
    collectionId,
    syllabus.items,
    syllabus.metadata,
  );
  const segments: ExplorerShelfSegment[] = [];
  const classHeaders: NonNullable<
    Parameters<typeof ExplorerSegmentedCoverRail>[0]["classHeaders"]
  > = {};

  for (const group of classGroups) {
    const itemAssignments = sortClassAssignmentRows(
      group.itemAssignments,
      sortBy,
    );
    const items = uniqueClassItems(itemAssignments);
    if (items.length === 0) {
      continue;
    }
    const key = String(group.classNumber ?? "unnumbered");
    const done =
      group.classNumber != null &&
      SyllabusManager.getClassStatus(collectionId, group.classNumber) ===
        "done";
    segments.push({
      key,
      title: "",
      items,
      itemAssignments,
      classNumber: group.classNumber,
      done,
      onOpen: () =>
        openCollectionSyllabusAtClass(collectionId, group.classNumber),
    });
    classHeaders[key] = {
      collectionId,
      classNumber: group.classNumber,
      classMeta: group.syllabusMetadata,
      onOpen: () =>
        openCollectionSyllabusAtClass(collectionId, group.classNumber),
    };
  }

  if (furtherReadingItems.length > 0) {
    segments.push({
      key: "further-reading",
      title: getString("further-reading-heading"),
      icon: { kind: "further-reading" },
      items: sortSegmentItems(
        furtherReadingItems.map((entry) => entry.item),
        sortBy,
      ),
      onOpen: () =>
        openCollectionSyllabusAtClass(collectionId, "further-reading"),
    });
  }

  return { segments, classHeaders };
}

function buildSubcollectionSegments(
  root: SubcollectionNode | null,
  sortBy: GallerySortBy,
  onOpenCollection: (collectionId: number) => void,
): ExplorerShelfSegment[] {
  if (!root) {
    return [];
  }
  const segments: ExplorerShelfSegment[] = [];
  const rootItems = sortSegmentItems(resolveItemIds(root.itemIds), sortBy);
  if (rootItems.length > 0) {
    segments.push({
      key: `col-root-${root.collectionId}`,
      title: root.name,
      icon: { kind: "collection-root" },
      items: rootItems,
      onOpen: () => onOpenCollection(root.collectionId),
    });
  }
  for (const child of root.children) {
    const items = sortSegmentItems(
      resolveItemIds(collectSubtreeItemIds(child)),
      sortBy,
    );
    if (items.length === 0) {
      continue;
    }
    segments.push({
      key: `col-${child.collectionId}`,
      title: child.name,
      icon: collectionGroupIconSpec(child.collectionId),
      items,
      onOpen: () => onOpenCollection(child.collectionId),
    });
  }
  return segments;
}

export function ExplorerCollectionShelfBody({
  shelf,
  collectionId,
  syllabus,
  fallbackItems,
  keyPrefix,
  template,
  density,
  selectedIdentifiers,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
  onIdentifierClick,
}: {
  shelf: ExplorerCollectionShelf;
  collectionId: number;
  syllabus: SyllabusData | null;
  fallbackItems: Zotero.Item[];
  keyPrefix: string;
  template: MagazineSectionTemplate;
  density: ItemDensity;
  selectedIdentifiers: Set<string>;
  selectedItemIds: number[] | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  onIdentifierClick: (
    item: Zotero.Item,
    assignmentId: string | undefined,
    e?: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
}) {
  const isSyllabus =
    collectionId > 0 && collectionHasSyllabusNote(collectionId);
  const layout = shelf.layout;
  const sortBy = explorerShelfSortBy(shelf);
  const groupBy = explorerShelfGroupBy(shelf, {
    classes: isSyllabus,
    subcollections: true,
    magazine: layout === "magazine",
  });
  const magazineTypeSize = explorerShelfMagazineTypeSize(shelf);

  const collectionItems = useZoteroCollectionItems(collectionId, {
    recursive: "pref",
  });
  const syllabusItems = useMemo(() => {
    if (syllabus) {
      return syllabus.items;
    }
    return collectionItems;
  }, [syllabus, collectionItems]);

  const flatItems = useMemo(() => {
    const fromSyllabus = syllabusItems.map(({ zoteroItem }) => zoteroItem);
    if (fromSyllabus.length > 0) {
      return sortSegmentItems(fromSyllabus, sortBy);
    }
    return sortSegmentItems(fallbackItems, sortBy);
  }, [syllabusItems, fallbackItems, sortBy]);

  const { typeGroups } = useCollectionItemTypeGroups(syllabusItems);
  const { creatorGroups, uncreditedItems } =
    useCollectionCreatorGroups(syllabusItems);
  const { tagGroups, untaggedItems } = useCollectionTagGroups(syllabusItems);
  const { root: subcollectionRoot } = useSubcollectionTree(collectionId);

  const openCollection = (id: number) => selectCollectionInLibrary(id);

  const classBundle = useMemo(() => {
    if (groupBy !== "classes" || !syllabus) {
      return null;
    }
    return buildClassSegments(collectionId, syllabus, sortBy);
  }, [groupBy, syllabus, collectionId, sortBy]);

  const segments: ExplorerShelfSegment[] = useMemo(() => {
    if (groupBy === "none" || groupBy === "auto") {
      return [];
    }
    if (groupBy === "classes" && classBundle) {
      return classBundle.segments;
    }
    if (groupBy === "type") {
      return typeGroups
        .filter((group) => group.items.length > 0)
        .map((group) => ({
          key: `type-${group.itemType}`,
          title: group.label,
          icon: { kind: "item-type" as const, itemType: group.itemType },
          items: sortSegmentItems(group.items, sortBy),
          onOpen: () => openCollection(collectionId),
        }));
    }
    if (groupBy === "creator") {
      const rows: ExplorerShelfSegment[] = creatorGroups
        .filter((group) => group.items.length > 0)
        .map((group) => ({
          key: `creator-${group.key}`,
          title: group.label,
          icon: { kind: "creator" as const },
          items: sortSegmentItems(group.items, sortBy),
          onOpen: () => openCollection(collectionId),
        }));
      if (uncreditedItems.length > 0) {
        rows.push({
          key: "uncredited",
          title: getString("gallery-uncredited"),
          icon: { kind: "uncredited" },
          items: sortSegmentItems(uncreditedItems, sortBy),
          onOpen: () => openCollection(collectionId),
        });
      }
      return rows;
    }
    if (groupBy === "tags") {
      const rows: ExplorerShelfSegment[] = tagGroups
        .filter((group) => group.items.length > 0)
        .map((group) => ({
          key: `tag-${group.tag}`,
          title: group.tag,
          icon: { kind: "tag" as const },
          items: sortSegmentItems(group.items, sortBy),
          onOpen: () => openCollection(collectionId),
        }));
      if (untaggedItems.length > 0) {
        rows.push({
          key: "untagged",
          title: getString("gallery-untagged"),
          icon: { kind: "untagged" },
          items: sortSegmentItems(untaggedItems, sortBy),
          onOpen: () => openCollection(collectionId),
        });
      }
      return rows;
    }
    if (groupBy === "subcollections") {
      return buildSubcollectionSegments(
        subcollectionRoot,
        sortBy,
        openCollection,
      );
    }
    return [];
  }, [
    groupBy,
    classBundle,
    typeGroups,
    creatorGroups,
    uncreditedItems,
    tagGroups,
    untaggedItems,
    subcollectionRoot,
    sortBy,
    collectionId,
  ]);

  const renderSegmentBody = (segment: ExplorerShelfSegment) => {
    const { items, key: segmentKey, itemAssignments, classNumber } = segment;
    const chromeByItemId: ReadonlyMap<number, ReadingTileChrome> | undefined =
      itemAssignments
        ? chromeByItemIdFromAssignments(collectionId, itemAssignments)
        : undefined;

    if (layout === "cover") {
      return null;
    }
    if (layout === "card") {
      if (itemAssignments) {
        return (
          <div
            className={twMerge(
              "syllabus-gallery-cards flex flex-col",
              density !== "expanded" ? "gap-2" : "gap-4",
            )}
          >
            {itemAssignments.map(({ item, assignment }) => {
              if (!assignment.id) {
                return null;
              }
              return (
                <SyllabusItemCard
                  key={`${keyPrefix}-${segmentKey}-${item.id}-${assignment.id}`}
                  item={item}
                  collectionId={collectionId}
                  classNumber={classNumber ?? undefined}
                  assignment={assignment}
                  slim={true}
                  density={density}
                  readerMode={false}
                  isLocked={true}
                  selectedIdentifiers={selectedIdentifiers}
                  onIdentifierClick={onIdentifierClick}
                  onContextMenu={onContextMenu}
                  isZoteroSelected={selectedItemIds?.includes(item.id) || false}
                  isIdentifierSelected={selectedIdentifiers.has(
                    `assignment:${assignment.id}`,
                  )}
                />
              );
            })}
          </div>
        );
      }
      return (
        <div
          className={twMerge(
            "syllabus-gallery-cards flex flex-col",
            density !== "expanded" ? "gap-2" : "gap-4",
          )}
        >
          {items.map((item) => (
            <SlimSyllabusItemCard
              key={`${keyPrefix}-${segmentKey}-${item.id}`}
              item={item}
              collectionId={collectionId}
              keyPrefix={`${keyPrefix}-${segmentKey}`}
              density={density}
              selectedIdentifiers={selectedIdentifiers}
              selectedItemIds={selectedItemIds}
              onIdentifierClick={onIdentifierClick}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      );
    }
    return (
      <MagazineGrid
        items={items}
        keyPrefix={`${keyPrefix}-${segmentKey}`}
        sortBy={sortBy}
        template={template}
        collectionId={collectionId}
        selectedItemIds={selectedItemIds}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        chromeByItemId={chromeByItemId}
      />
    );
  };

  if (layout === "cover") {
    if (groupBy === "none" || groupBy === "auto") {
      return (
        <FlatCoverRail
          items={flatItems}
          keyPrefix={keyPrefix}
          selectedItemIds={selectedItemIds}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      );
    }
    return (
      <ExplorerSegmentedCoverRail
        segments={segments}
        keyPrefix={keyPrefix}
        collectionId={collectionId}
        selectedItemIds={selectedItemIds}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        classHeaders={classBundle?.classHeaders}
      />
    );
  }

  if (groupBy === "none" || groupBy === "auto") {
    if (flatItems.length === 0) {
      return (
        <p className="text-secondary text-base">
          {getString("explorer-shelf-empty")}
        </p>
      );
    }
    if (layout === "card") {
      return renderSegmentBody({ key: "all", title: "", items: flatItems });
    }
    return (
      <div
        className={twMerge(
          layout === "magazine" &&
            magazineTypeSize === "large" &&
            "is-large-type",
        )}
      >
        <MagazineGrid
          items={flatItems}
          keyPrefix={keyPrefix}
          sortBy={sortBy}
          template={template}
          collectionId={collectionId}
          selectedItemIds={selectedItemIds}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("explorer-shelf-empty")}
      </p>
    );
  }

  return (
    <div
      className={twMerge(
        "flex flex-col gap-8",
        layout === "magazine" &&
          magazineTypeSize === "large" &&
          "is-large-type",
      )}
    >
      {segments.map((segment) => {
        const classHeader = classBundle?.classHeaders?.[segment.key];
        const heading =
          segment.title ||
          (classHeader
            ? (() => {
                const { singularCapitalized } =
                  SyllabusManager.getNomenclatureFormatted(collectionId);
                const metaTitle = (classHeader.classMeta?.title || "").trim();
                if (classHeader.classNumber == null) {
                  return getString("gallery-unnumbered");
                }
                return (
                  metaTitle ||
                  `${singularCapitalized} ${classHeader.classNumber}`
                );
              })()
            : segment.key);
        const icon: GalleryGroupIconSpec | undefined = classHeader
          ? { kind: "class" }
          : segment.icon;
        return (
          <section key={`${keyPrefix}-${segment.key}`} className="min-w-0">
            <h3 className="syllabus-explorer-shelf-group-title syllabus-gallery-section-title text-lg font-semibold mb-3">
              {icon ? <GalleryGroupIcon spec={icon} /> : null}
              <span>{heading}</span>
            </h3>
            {renderSegmentBody(segment)}
          </section>
        );
      })}
    </div>
  );
}

/** Options helpers for the shelf settings menu (same labels as Gallery). */
export function explorerCollectionGroupByModes(
  layout: GalleryLayout,
  isSyllabus: boolean,
): GalleryGroupBy[] {
  const modes: GalleryGroupBy[] = ["none"];
  if (layout === "magazine") {
    modes.push("auto");
  }
  modes.push("type", "creator", "tags", "subcollections");
  if (isSyllabus) {
    modes.push("classes");
  }
  return modes;
}

export function explorerCollectionSortByModes(): Array<
  Exclude<GallerySortBy, "lastRead">
> {
  return ["auto", "title", "date", "dateAdded"];
}

export function explorerCollectionTypeSizeModes(): MagazineTypeSize[] {
  return ["small", "large"];
}
