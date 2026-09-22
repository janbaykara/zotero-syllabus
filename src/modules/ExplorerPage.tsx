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
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  ArrowDownAZ,
  ALargeSmall,
  BookOpen,
  Calendar,
  CalendarPlus,
  CaseSensitive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  GraduationCap,
  GripVertical,
  Headphones,
  Highlighter,
  Image,
  LayoutGrid,
  LayoutList,
  ListOrdered,
  Maximize2,
  Newspaper,
  Pin,
  Rows2,
  Rows3,
  Rss,
  Shapes,
  Sparkles,
  Tags,
  User,
  Video,
} from "lucide-preact";
import { renderComponent } from "../utils/react";
import { isZotero8OrLater, libraryDisplayName } from "../utils/zotero";
import { getCachedCollectionByKey } from "../utils/cache";
import { isSyllabusMemberItem, openItemBestAttachment } from "../utils/items";
import { getString, getUiDir } from "../utils/locale";
import { formatRelativeReadingDate, formatReadingDate } from "../utils/dates";
import {
  ClassReadingBlock,
  openCollectionSyllabusAtClass,
  openCollectionSyllabusPage,
  openMyAnnotationsTab,
  openReadingScheduleTab,
  selectCollectionInLibrary,
  selectSavedSearchInLibrary,
  type ClassReading,
} from "./ClassReadingBlock";
import { isOptionalFeatureEnabled } from "./optionalFeatures";
import {
  ExplorerAnnotationShelf,
  groupAdjacentStreamEntries,
} from "./annotationStream";
import {
  buildClassReadings,
  filterSyllabiByLibrary,
  pickUpcomingClassReadings,
} from "./classReadings";
import { useSyllabi } from "./react-zotero-sync/useSyllabi";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import type { FluentMessageId } from "../../typings/i10n";
import type { GalleryLayout } from "./galleryLayout";
import type { GalleryGroupBy } from "./galleryGroupBy";
import type { GallerySortBy } from "./gallerySort";
import type { MagazineTypeSize } from "./magazineTypeSize";
import { GalleryTile } from "./GalleryPage";
import { MagazineGrid, type MagazineTileClick } from "./MagazineTile";
import {
  SlimSyllabusItemCard,
  useItemIdentifierSelection,
  densityLabel,
} from "./browsePage";
import { collectionHasSyllabusNote } from "./syllabusNote";
import { SyllabusManager } from "./syllabus";
import {
  ExplorerCollectionShelfBody,
  ExplorerSegmentedCoverRail,
  explorerCollectionGroupByModes,
  explorerCollectionSortByModes,
  explorerCollectionTypeSizeModes,
  type ExplorerShelfSegment,
} from "./ExplorerCollectionShelf";
import {
  ITEM_DENSITIES,
  useZoteroItemDensity,
  type ItemDensity,
} from "./react-zotero-sync/itemDensity";
import { GalleryViewportProvider } from "./galleryVisibility";
import {
  findActiveGalleryGroupId,
  scrollChildIntoNearestHorizontal,
  scrollElementBelowSticky,
} from "./galleryGroupNav";
import {
  explorerShelfGroupBy,
  explorerShelfMagazineTypeSize,
  explorerShelfSortBy,
  isExplorerCollectionShelf,
  isExplorerShelfEnabled,
  layoutsForExplorerShelf,
  mergeExplorerCatalog,
  savedSearchShelfKey,
  useExplorerShelves,
  type ExplorerShelf,
  type ExplorerShelfType,
} from "./explorerConfig";
import {
  EXPLORER_ARTICLE_DESK_LIMIT,
  EXPLORER_MEDIA_LIMIT,
  EXPLORER_RECENTLY_ADDED_LIMIT,
  pickNewestItems,
  pickRecentItemsByDate,
  useExplorerQueryData,
} from "./explorerQueries";
import { isAudioGalleryItem, isVideoGalleryItem } from "../utils/itemCover";
import type { MagazineSectionTemplate } from "./magazineDesks";
import { PinnedSection, usePinnedScheduleData } from "./PinnedSection";

const SHELF_TITLE_IDS: Record<
  Exclude<ExplorerShelfType, "collection" | "saved-search">,
  FluentMessageId
> = {
  pinned: "explorer-shelf-pinned",
  "upcoming-deadlines": "explorer-shelf-upcoming-deadlines",
  "watch-now": "explorer-shelf-watch-now",
  "listen-now": "explorer-shelf-listen-now",
  "recently-added": "explorer-shelf-recently-added",
  "recently-read": "explorer-shelf-recently-read",
  "recent-in-feed": "explorer-recent-in-feed",
  "recent-annotations": "explorer-recent-annotations",
};

function collectionForShelf(shelf: ExplorerShelf): Zotero.Collection | null {
  if (shelf.type !== "collection") {
    return null;
  }
  return (
    getCachedCollectionByKey(shelf.libraryID, shelf.collectionKey) ||
    Zotero.Collections.getByLibraryAndKey(
      shelf.libraryID,
      shelf.collectionKey,
    ) ||
    null
  );
}

function searchForShelf(shelf: ExplorerShelf): Zotero.Search | null {
  if (shelf.type !== "saved-search") {
    return null;
  }
  try {
    const search = Zotero.Searches.getByLibraryAndKey(
      shelf.libraryID,
      shelf.searchKey,
    );
    return search && !search.deleted ? search : null;
  } catch {
    return null;
  }
}

function shelfTitle(shelf: ExplorerShelf): string {
  if (shelf.type === "collection") {
    return (
      collectionForShelf(shelf)?.name || getString("explorer-add-collection")
    );
  }
  if (shelf.type === "saved-search") {
    return (
      searchForShelf(shelf)?.name || getString("explorer-add-saved-search")
    );
  }
  return getString(SHELF_TITLE_IDS[shelf.type]);
}

const PRESET_ICONS: Record<
  Exclude<ExplorerShelfType, "collection" | "saved-search">,
  typeof BookOpen
> = {
  pinned: Pin,
  "upcoming-deadlines": Calendar,
  "watch-now": Video,
  "listen-now": Headphones,
  "recently-read": BookOpen,
  "recently-added": Sparkles,
  "recent-in-feed": Rss,
  "recent-annotations": Highlighter,
};

function CatalogRowIcon({
  shelf,
  size = 16,
}: {
  shelf: ExplorerShelf;
  size?: number;
}) {
  if (shelf.type === "collection") {
    const collection = collectionForShelf(shelf);
    const iconKind =
      collection && collectionHasSyllabusNote(collection.id)
        ? "icon-syllabus-collection"
        : "icon-collection";
    return (
      <span
        className={`icon icon-css ${iconKind} syllabus-gallery-group-icon`}
        aria-hidden="true"
      />
    );
  }
  if (shelf.type === "saved-search") {
    return (
      <span
        className="icon icon-css icon-search syllabus-gallery-group-icon"
        aria-hidden="true"
      />
    );
  }
  const Icon = PRESET_ICONS[shelf.type];
  return (
    <Icon
      size={size}
      strokeWidth={2}
      className="syllabus-gallery-group-icon"
      aria-hidden="true"
    />
  );
}

function moveCatalogItem(
  shelves: ExplorerShelf[],
  from: number,
  to: number,
): ExplorerShelf[] {
  if (from === to || from < 0 || to < 0 || to > shelves.length) {
    return shelves;
  }
  const next = [...shelves];
  const [row] = next.splice(from, 1);
  next.splice(to > from ? to - 1 : to, 0, row);
  return next;
}

const LAYOUT_LABEL_IDS: Record<GalleryLayout, FluentMessageId> = {
  cover: "gallery-layout-cover",
  magazine: "gallery-layout-magazine",
  card: "gallery-layout-card",
  annotations: "gallery-layout-annotations",
};

const LAYOUT_TITLE_IDS: Record<GalleryLayout, FluentMessageId> = {
  cover: "gallery-layout-cover-title",
  magazine: "gallery-layout-magazine-title",
  card: "gallery-layout-card-title",
  annotations: "gallery-layout-annotations-title",
};

const LAYOUT_ICONS: Record<GalleryLayout, typeof Image> = {
  card: LayoutList,
  cover: Image,
  annotations: Highlighter,
  magazine: Newspaper,
};

const SORT_LABEL_IDS: Record<
  Exclude<GallerySortBy, "lastRead">,
  FluentMessageId
> = {
  auto: "gallery-sort-auto",
  title: "gallery-sort-az",
  date: "gallery-sort-date",
  dateAdded: "gallery-sort-date-added",
};

const SORT_TITLE_IDS: Record<
  Exclude<GallerySortBy, "lastRead">,
  FluentMessageId
> = {
  auto: "gallery-sort-auto-title",
  title: "gallery-sort-az-title",
  date: "gallery-sort-date-title",
  dateAdded: "gallery-sort-date-added-title",
};

const SORT_ICONS: Record<
  Exclude<GallerySortBy, "lastRead">,
  typeof ListOrdered
> = {
  auto: ListOrdered,
  title: ArrowDownAZ,
  date: Calendar,
  dateAdded: CalendarPlus,
};

const GROUP_LABEL_IDS: Record<GalleryGroupBy, FluentMessageId> = {
  none: "gallery-group-none",
  auto: "gallery-group-auto",
  type: "gallery-group-type",
  creator: "gallery-group-creator",
  tags: "gallery-group-tags",
  subcollections: "gallery-group-subcollections",
  classes: "gallery-group-classes",
};

const GROUP_TITLE_IDS: Record<GalleryGroupBy, FluentMessageId> = {
  none: "gallery-group-none-title",
  auto: "gallery-group-auto-title",
  type: "gallery-group-type-title",
  creator: "gallery-group-creator-title",
  tags: "gallery-group-tags-title",
  subcollections: "gallery-group-subcollections-title",
  classes: "gallery-group-classes-title",
};

const GROUP_ICONS: Record<GalleryGroupBy, typeof LayoutGrid> = {
  none: LayoutGrid,
  auto: Sparkles,
  type: Shapes,
  creator: User,
  tags: Tags,
  subcollections: Folder,
  classes: GraduationCap,
};

const TYPE_SIZE_LABEL_IDS: Record<MagazineTypeSize, FluentMessageId> = {
  small: "gallery-type-small",
  large: "gallery-type-large",
};

const TYPE_SIZE_TITLE_IDS: Record<MagazineTypeSize, FluentMessageId> = {
  small: "gallery-type-small-title",
  large: "gallery-type-large-title",
};

const TYPE_SIZE_ICONS: Record<MagazineTypeSize, typeof CaseSensitive> = {
  small: CaseSensitive,
  large: ALargeSmall,
};

const DENSITY_ICONS: Record<
  ItemDensity,
  typeof Rows3 | typeof Rows2 | typeof Maximize2
> = {
  row: Rows3,
  standard: Rows2,
  expanded: Maximize2,
};

const DENSITY_TITLE_IDS: Record<ItemDensity, FluentMessageId> = {
  row: "page-density-row",
  standard: "page-density-standard",
  expanded: "page-density-expanded",
};

function shelfShowsLayout(shelf: ExplorerShelf): boolean {
  return layoutsForExplorerShelf(shelf.type).length > 1;
}

function explorerShelfLayout(shelf: ExplorerShelf): GalleryLayout {
  const allowed = layoutsForExplorerShelf(shelf.type);
  if (allowed.length === 0) {
    return shelf.layout;
  }
  return allowed.includes(shelf.layout) ? shelf.layout : allowed[0];
}

function useExplorerPopover(
  open: boolean,
  setOpen: (open: boolean) => void,
  rootRef: { current: HTMLDivElement | null },
): JSX.CSSProperties {
  const [popoverStyle, setPopoverStyle] = useState<JSX.CSSProperties>({});
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const doc = rootRef.current?.ownerDocument || document;
    const updatePosition = () => {
      const el = rootRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const view = doc.documentElement;
      setPopoverStyle(
        getUiDir() === "rtl"
          ? { top: rect.bottom + 6, left: rect.left }
          : { top: rect.bottom + 6, right: view.clientWidth - rect.right },
      );
    };
    updatePosition();
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpenRef.current(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenRef.current(false);
      }
    };
    const win = doc.defaultView;
    win?.addEventListener("resize", updatePosition);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown);
    return () => {
      win?.removeEventListener("resize", updatePosition);
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("keydown", onKeyDown);
    };
  }, [open, rootRef]);

  return popoverStyle;
}

function ExplorerConfigureMenu({
  shelves,
  libraryID,
  topLevelCollectionKeys,
  onChange,
}: {
  shelves: ExplorerShelf[];
  libraryID: number;
  topLevelCollectionKeys: string[];
  onChange: (shelves: ExplorerShelf[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dragImageRef = useRef<HTMLElement | null>(null);
  const popoverStyle = useExplorerPopover(open, setOpen, rootRef);
  const savedSearchKeys = useMemo(() => {
    if (!open) {
      return [];
    }
    return librarySavedSearches(libraryID).map((search) => search.key);
  }, [libraryID, open]);

  const catalog = useMemo(
    () =>
      mergeExplorerCatalog(
        shelves,
        libraryID,
        topLevelCollectionKeys,
        savedSearchKeys,
      ),
    [libraryID, savedSearchKeys, shelves, topLevelCollectionKeys],
  );

  const draggingFrom = draggingId
    ? catalog.findIndex((row) => row.id === draggingId)
    : -1;
  const dropLine =
    draggingFrom < 0 ||
    dropIndex == null ||
    dropIndex === draggingFrom ||
    dropIndex === draggingFrom + 1
      ? null
      : dropIndex;

  const toggleRow = (id: string, enabled: boolean) => {
    onChange(
      catalog.map((shelf) => (shelf.id === id ? { ...shelf, enabled } : shelf)),
    );
  };

  const updateDropIndex = (
    index: number,
    clientY: number,
    row: HTMLElement,
  ) => {
    const rect = row.getBoundingClientRect();
    const after = clientY > rect.top + rect.height / 2;
    const next = after ? index + 1 : index;
    setDropIndex((current) => (current === next ? current : next));
  };

  const finishDrag = () => {
    draggingIdRef.current = null;
    dragImageRef.current?.remove();
    dragImageRef.current = null;
    setDraggingId(null);
    setDropIndex(null);
  };

  return (
    <div className="syllabus-explorer-configure" ref={rootRef}>
      <button
        type="button"
        className="syllabus-explorer-customize"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{getString("explorer-configure")}</span>
        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="syllabus-explorer-configure-popover"
          role="dialog"
          aria-labelledby="syllabus-explorer-configure-title"
          style={popoverStyle}
        >
          <div
            id="syllabus-explorer-configure-title"
            className="syllabus-explorer-configure-heading"
          >
            {getString("explorer-configure-display")}
          </div>
          <ul
            className="syllabus-explorer-configure-list"
            onDragOver={(event) => {
              if (!draggingIdRef.current || !event.dataTransfer) {
                return;
              }
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
          >
            {catalog.map((shelf, index) => (
              <li
                key={shelf.id}
                className={twMerge(
                  "syllabus-explorer-configure-row",
                  draggingId === shelf.id && "is-dragging",
                  dropLine === index && "is-drop-before",
                  dropLine === catalog.length &&
                    index === catalog.length - 1 &&
                    "is-drop-after",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "move";
                  }
                  updateDropIndex(
                    index,
                    event.clientY,
                    event.currentTarget as HTMLElement,
                  );
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromId =
                    event.dataTransfer?.getData("text/plain") ||
                    draggingIdRef.current;
                  const from = catalog.findIndex((row) => row.id === fromId);
                  const to = dropIndex ?? index;
                  onChange(moveCatalogItem(catalog, from, to));
                  finishDrag();
                }}
              >
                <label className="syllabus-explorer-configure-label">
                  <input
                    type="checkbox"
                    checked={isExplorerShelfEnabled(shelf)}
                    onChange={(event) =>
                      toggleRow(
                        shelf.id,
                        (event.target as HTMLInputElement).checked,
                      )
                    }
                  />
                  <CatalogRowIcon shelf={shelf} />
                  <span className="syllabus-explorer-configure-name">
                    {shelfTitle(shelf)}
                  </span>
                </label>
                <span
                  className="syllabus-explorer-configure-handle"
                  title={getString("explorer-configure-reorder")}
                  aria-label={getString("explorer-configure-reorder")}
                  draggable={true}
                  onDragStart={(event) => {
                    if (!event.dataTransfer) {
                      return;
                    }
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", shelf.id);
                    draggingIdRef.current = shelf.id;
                    setDraggingId(shelf.id);
                    setDropIndex(index);
                    const handle = event.currentTarget as HTMLElement;
                    const row = handle.closest("li");
                    if (row instanceof HTMLElement) {
                      try {
                        const rect = row.getBoundingClientRect();
                        const ghost = row.cloneNode(true) as HTMLElement;
                        ghost.classList.add(
                          "syllabus-explorer-configure-drag-image",
                        );
                        ghost.style.width = `${rect.width}px`;
                        row.ownerDocument.body.appendChild(ghost);
                        dragImageRef.current?.remove();
                        dragImageRef.current = ghost;
                        event.dataTransfer.setDragImage(
                          ghost,
                          event.clientX - rect.left,
                          event.clientY - rect.top,
                        );
                      } catch {
                        // Native drag still works without a custom preview.
                      }
                    }
                  }}
                  onDragEnd={finishDrag}
                >
                  <GripVertical size={16} strokeWidth={2} aria-hidden="true" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ExplorerShelfSettingsMenu({
  shelf,
  onChange,
}: {
  shelf: ExplorerShelf;
  onChange: (shelf: ExplorerShelf) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverStyle = useExplorerPopover(open, setOpen, rootRef);
  const titleId = `syllabus-explorer-shelf-settings-${shelf.id}`;
  const [density, setDensity] = useZoteroItemDensity();
  const showDensity =
    (shelf.type === "pinned" || shelf.type === "upcoming-deadlines") &&
    shelf.layout === "card";
  const collection = collectionForShelf(shelf);
  const isCollection = isExplorerCollectionShelf(shelf);
  const isSyllabus =
    isCollection && !!collection && collectionHasSyllabusNote(collection.id);
  const collectionSortBy = isCollection ? explorerShelfSortBy(shelf) : "auto";
  const collectionGroupBy = isCollection
    ? explorerShelfGroupBy(shelf, {
        classes: isSyllabus,
        subcollections: true,
        magazine: shelf.layout === "magazine",
      })
    : "none";
  const collectionTypeSize = isCollection
    ? explorerShelfMagazineTypeSize(shelf)
    : "small";
  const groupModes = isCollection
    ? explorerCollectionGroupByModes(shelf.layout, isSyllabus)
    : [];
  const sortModes = explorerCollectionSortByModes();
  const typeSizeModes = explorerCollectionTypeSizeModes();

  const patchCollection = (
    patch: Partial<{
      layout: GalleryLayout;
      groupBy: GalleryGroupBy;
      sortBy: GallerySortBy;
      magazineTypeSize: MagazineTypeSize;
    }>,
  ) => {
    if (!isExplorerCollectionShelf(shelf)) {
      return;
    }
    let next = { ...shelf, ...patch };
    if (
      patch.layout &&
      patch.layout !== "magazine" &&
      next.groupBy === "auto"
    ) {
      next = { ...next, groupBy: "none" };
    }
    if (patch.layout === "magazine" && next.groupBy === undefined) {
      // keep resolved default
    }
    onChange(next);
  };

  return (
    <div
      className="syllabus-explorer-configure syllabus-explorer-shelf-configure"
      ref={rootRef}
    >
      <button
        type="button"
        className="syllabus-explorer-customize"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{getString("explorer-configure")}</span>
        <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="syllabus-explorer-configure-popover"
          role="dialog"
          aria-labelledby={titleId}
          style={popoverStyle}
        >
          <div id={titleId} className="syllabus-explorer-configure-heading">
            {getString("gallery-options-title")}
          </div>
          <div className="syllabus-explorer-shelf-setting">
            <div className="syllabus-explorer-configure-heading">
              {getString("gallery-menu-view")}
            </div>
            <div
              role="radiogroup"
              aria-label={getString("gallery-menu-view")}
              className="syllabus-explorer-layout-toggle"
            >
              {layoutsForExplorerShelf(shelf.type).map((mode) => {
                const Icon = LAYOUT_ICONS[mode];
                const selected = shelf.layout === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={getString(LAYOUT_TITLE_IDS[mode])}
                    className={twMerge(
                      "syllabus-explorer-layout-btn",
                      selected && "is-selected",
                    )}
                    onClick={() =>
                      isCollection
                        ? patchCollection({ layout: mode })
                        : onChange({ ...shelf, layout: mode })
                    }
                  >
                    <Icon size={12} strokeWidth={2} aria-hidden="true" />
                    {getString(LAYOUT_LABEL_IDS[mode])}
                  </button>
                );
              })}
            </div>
          </div>
          {isCollection ? (
            <>
              <div className="syllabus-explorer-shelf-setting">
                <div className="syllabus-explorer-configure-heading">
                  {getString("gallery-menu-sort")}
                </div>
                <div
                  role="radiogroup"
                  aria-label={getString("gallery-menu-sort")}
                  className="syllabus-explorer-layout-toggle"
                >
                  {sortModes.map((mode) => {
                    const Icon = SORT_ICONS[mode];
                    const selected = collectionSortBy === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        title={getString(SORT_TITLE_IDS[mode])}
                        className={twMerge(
                          "syllabus-explorer-layout-btn",
                          selected && "is-selected",
                        )}
                        onClick={() => patchCollection({ sortBy: mode })}
                      >
                        <Icon size={12} strokeWidth={2} aria-hidden="true" />
                        {getString(SORT_LABEL_IDS[mode])}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="syllabus-explorer-shelf-setting">
                <div className="syllabus-explorer-configure-heading">
                  {getString("gallery-menu-group")}
                </div>
                <div
                  role="radiogroup"
                  aria-label={getString("gallery-menu-group")}
                  className="syllabus-explorer-layout-toggle"
                >
                  {groupModes.map((mode) => {
                    const Icon = GROUP_ICONS[mode];
                    const selected = collectionGroupBy === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        title={getString(GROUP_TITLE_IDS[mode])}
                        className={twMerge(
                          "syllabus-explorer-layout-btn",
                          selected && "is-selected",
                        )}
                        onClick={() => patchCollection({ groupBy: mode })}
                      >
                        <Icon size={12} strokeWidth={2} aria-hidden="true" />
                        {getString(GROUP_LABEL_IDS[mode])}
                      </button>
                    );
                  })}
                </div>
              </div>
              {shelf.layout === "magazine" ? (
                <div className="syllabus-explorer-shelf-setting">
                  <div className="syllabus-explorer-configure-heading">
                    {getString("gallery-menu-type-size")}
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={getString("gallery-menu-type-size")}
                    className="syllabus-explorer-layout-toggle"
                  >
                    {typeSizeModes.map((mode) => {
                      const Icon = TYPE_SIZE_ICONS[mode];
                      const selected = collectionTypeSize === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          title={getString(TYPE_SIZE_TITLE_IDS[mode])}
                          className={twMerge(
                            "syllabus-explorer-layout-btn",
                            selected && "is-selected",
                          )}
                          onClick={() =>
                            patchCollection({ magazineTypeSize: mode })
                          }
                        >
                          <Icon size={12} strokeWidth={2} aria-hidden="true" />
                          {getString(TYPE_SIZE_LABEL_IDS[mode])}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          {showDensity ? (
            <div className="syllabus-explorer-shelf-setting">
              <div className="syllabus-explorer-configure-heading">
                {getString("settings-density")}
              </div>
              <div
                role="radiogroup"
                aria-label={getString("settings-density")}
                className="syllabus-explorer-layout-toggle"
              >
                {ITEM_DENSITIES.map((mode) => {
                  const Icon = DENSITY_ICONS[mode];
                  const selected = density === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={getString(DENSITY_TITLE_IDS[mode])}
                      className={twMerge(
                        "syllabus-explorer-layout-btn",
                        selected && "is-selected",
                      )}
                      onClick={() => setDensity(mode)}
                    >
                      <Icon size={12} strokeWidth={2} aria-hidden="true" />
                      {densityLabel(mode)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {shelf.type === "recent-annotations" ? (
            <div className="syllabus-explorer-shelf-setting">
              <div className="syllabus-explorer-configure-heading">
                {getString("explorer-annotations-size")}
              </div>
              <div
                role="radiogroup"
                aria-label={getString("explorer-annotations-size")}
                className="syllabus-explorer-layout-toggle"
              >
                {(
                  [
                    {
                      mode: "small" as const,
                      label: getString("gallery-type-small"),
                      title: getString("explorer-annotations-size-small-title"),
                    },
                    {
                      mode: "large" as const,
                      label: getString("gallery-type-large"),
                      title: getString("explorer-annotations-size-large-title"),
                    },
                  ] as const
                ).map(({ mode, label, title }) => {
                  const selected = shelf.size === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={title}
                      className={twMerge(
                        "syllabus-explorer-layout-btn",
                        selected && "is-selected",
                      )}
                      onClick={() =>
                        onChange({
                          ...shelf,
                          size: mode,
                        })
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function shelfDescription(shelf: ExplorerShelf): string | null {
  switch (shelf.type) {
    case "pinned":
      return getString("explorer-shelf-pinned-desc");
    case "upcoming-deadlines":
      return getString("explorer-shelf-upcoming-deadlines-desc");
    case "watch-now":
      return getString("explorer-shelf-watch-now-desc");
    case "listen-now":
      return getString("explorer-shelf-listen-now-desc");
    case "recently-read":
      return getString("explorer-shelf-recently-read-desc");
    case "recently-added":
      return getString("explorer-shelf-recently-added-desc", {
        args: { days: shelf.days },
      });
    case "recent-in-feed":
      return getString("explorer-recent-in-feed-desc");
    case "recent-annotations":
      return getString("explorer-recent-annotations-desc");
    case "collection":
    case "saved-search":
      return null;
  }
}

function magazineTemplateForShelf(
  type: ExplorerShelfType,
  index: number,
): MagazineSectionTemplate {
  if (
    type === "watch-now" ||
    type === "listen-now" ||
    type === "recently-read"
  ) {
    return "strip";
  }
  const cycle: MagazineSectionTemplate[] = ["lead", "essay", "strip"];
  return cycle[index % 3];
}

function readCollectionItems(
  libraryID: number,
  collectionKey: string,
): Zotero.Item[] {
  const collection =
    getCachedCollectionByKey(libraryID, collectionKey) ||
    Zotero.Collections.getByLibraryAndKey(libraryID, collectionKey);
  if (!collection) {
    return [];
  }
  let recursive = false;
  try {
    recursive = !!Zotero.Prefs.get("recursiveCollections");
  } catch {
    // Keep false when the preference is unavailable.
  }
  if (!recursive) {
    return collection
      .getChildItems()
      .filter((item) => isSyllabusMemberItem(item));
  }
  const seen = new Set<number>();
  const items: Zotero.Item[] = [];
  const walk = (col: Zotero.Collection) => {
    for (const item of col.getChildItems()) {
      if (!isSyllabusMemberItem(item) || seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
    let children: Zotero.Collection[] = [];
    try {
      children = col.getChildCollections();
    } catch {
      // Keep empty when child collections cannot be read.
    }
    for (const child of children) {
      walk(child);
    }
  };
  walk(collection);
  return items;
}

function librarySavedSearches(libraryID: number): Zotero.Search[] {
  try {
    const api = Zotero.Searches as {
      getByLibrary?: (id: number) => Zotero.Search[] | false | null;
      getAll?: () => Zotero.Search[];
    };
    let searches: Zotero.Search[] = [];
    if (typeof api.getByLibrary === "function") {
      const byLibrary = api.getByLibrary(libraryID);
      searches = Array.isArray(byLibrary) ? byLibrary : [];
    } else if (typeof api.getAll === "function") {
      searches = (api.getAll() || []).filter(
        (search) => search.libraryID === libraryID,
      );
    }
    return searches
      .filter((search) => search && !search.deleted && search.key)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } catch {
    return [];
  }
}

function libraryCollections(
  libraryID: number,
): Array<{ collection: Zotero.Collection; depth: number }> {
  let all: Zotero.Collection[];
  try {
    all = Zotero.Collections.getByLibrary(libraryID).filter(
      (collection) => collection && !collection.deleted,
    );
  } catch {
    return [];
  }
  const depthOf = (collection: Zotero.Collection): number => {
    let depth = 0;
    let parentID = collection.parentID;
    const seen = new Set<number>();
    while (parentID && !seen.has(parentID)) {
      seen.add(parentID);
      depth += 1;
      try {
        const parent = Zotero.Collections.get(parentID);
        if (!parent) {
          break;
        }
        parentID = parent.parentID;
      } catch {
        break;
      }
    }
    return depth;
  };
  return all
    .map((collection) => ({ collection, depth: depthOf(collection) }))
    .sort((a, b) => {
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      return (a.collection.name || "").localeCompare(b.collection.name || "");
    });
}

function ExplorerShelfBody({
  items,
  layout,
  keyPrefix,
  template,
  collectionId,
  density,
  selectedIdentifiers,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
  onIdentifierClick,
}: {
  items: Zotero.Item[];
  layout: GalleryLayout;
  keyPrefix: string;
  template: MagazineSectionTemplate;
  collectionId: number;
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
  if (items.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("explorer-shelf-empty")}
      </p>
    );
  }
  if (layout === "cover") {
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
  if (layout === "card") {
    return (
      <div
        className={twMerge(
          "syllabus-gallery-cards flex flex-col",
          density !== "expanded" ? "gap-2" : "gap-4",
        )}
      >
        {items.map((item) => (
          <SlimSyllabusItemCard
            key={`${keyPrefix}-${item.id}`}
            item={item}
            collectionId={collectionId}
            keyPrefix={keyPrefix}
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
      keyPrefix={keyPrefix}
      sortBy="auto"
      template={template}
      selectedItemIds={selectedItemIds}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    />
  );
}

function ExplorerDeadlineDate({ isoDate }: { isoDate: string }) {
  const relative = formatRelativeReadingDate(isoDate);
  return (
    <div className="syllabus-explorer-deadline-date">
      {relative ? (
        <div className="text-3xl text-tertiary first-letter:capitalize">
          {relative}
        </div>
      ) : null}
      <div className="text-2xl text-secondary">
        {formatReadingDate(isoDate)}
      </div>
    </div>
  );
}

function upcomingDeadlineSegmentKey(classReading: ClassReading): string {
  return `${classReading.collectionId}-${classReading.classNumber}-${classReading.readingDate || ""}`;
}

/** Cover mode: one horizontal segment per class / deadline (Collection shelf pattern). */
function buildUpcomingDeadlineCoverSegments(
  readings: ClassReading[],
): ExplorerShelfSegment[] {
  const segments: ExplorerShelfSegment[] = [];
  for (const classReading of readings) {
    const items = classReading.items
      .filter(({ assignment }) => !!assignment.id)
      .map(({ item }) => item);
    if (!items.length) {
      continue;
    }
    const { singularCapitalized } = SyllabusManager.getNomenclatureFormatted(
      classReading.collectionId,
    );
    const className = `${singularCapitalized} ${classReading.classNumber}`;
    const title = (classReading.classTitle || "").trim();
    const done =
      SyllabusManager.getClassStatus(
        classReading.collectionId,
        classReading.classNumber,
      ) === "done";
    segments.push({
      key: upcomingDeadlineSegmentKey(classReading),
      // Prefer class title; fall back to "Class N". Collection stays in the kicker
      // so multi-course shelves stay identifiable (unlike single-collection rails).
      title: title || className,
      label: classReading.collectionName,
      date: classReading.readingDate
        ? formatRelativeReadingDate(classReading.readingDate) ||
          formatReadingDate(classReading.readingDate)
        : undefined,
      done,
      icon: { kind: "class" },
      items,
      onOpen: () =>
        openCollectionSyllabusAtClass(
          classReading.collectionId,
          classReading.classNumber,
        ),
    });
  }
  return segments;
}

function ExplorerDeadlineShelf({
  readings,
  density,
  layout,
  selectedItemIds = null,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  readings: ClassReading[];
  density: ItemDensity;
  layout: GalleryLayout;
  selectedItemIds?: number[] | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  if (!readings.length) {
    return (
      <p className="text-secondary text-sm">
        {getString("explorer-shelf-empty")}
      </p>
    );
  }

  if (layout === "cover") {
    const segments = buildUpcomingDeadlineCoverSegments(readings);
    return (
      <ExplorerSegmentedCoverRail
        segments={segments}
        keyPrefix="upcoming-deadlines"
        selectedItemIds={selectedItemIds}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />
    );
  }

  return (
    <div className="syllabus-explorer-deadlines">
      {readings.map((classReading) => (
        <div
          key={upcomingDeadlineSegmentKey(classReading)}
          className="syllabus-explorer-deadline-session"
        >
          {classReading.readingDate ? (
            <ExplorerDeadlineDate isoDate={classReading.readingDate} />
          ) : null}
          <ClassReadingBlock
            classReading={classReading}
            density={density}
            layout={layout}
            showCollectionLink
            fullWidthItems
            onCollectionClick={() =>
              openCollectionSyllabusPage(classReading.collectionId)
            }
            onItemClick={(item) => {
              try {
                ztoolkit.getGlobal("ZoteroPane").selectItem(item.id);
              } catch (error) {
                ztoolkit.log("Error selecting deadline item:", error);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function ExplorerPage({ libraryID }: { libraryID: number }) {
  const [shelves, setShelves] = useExplorerShelves();
  const visibleShelves = useMemo(
    () => shelves.filter(isExplorerShelfEnabled),
    [shelves],
  );
  const data = useExplorerQueryData(libraryID, visibleShelves);
  const allSyllabi = useSyllabi();
  const [density] = useZoteroItemDensity();
  const { selectedIdentifiers, selectedItemIds, handleIdentifierClick } =
    useItemIdentifierSelection();
  const pageRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLElement>(null);
  const suppressScrollSpyRef = useRef(false);
  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const title = libraryDisplayName(libraryID) || getString("untitled");
  const collections = useMemo(() => libraryCollections(libraryID), [libraryID]);
  const topLevelCollectionKeys = useMemo(
    () =>
      collections
        .filter((entry) => entry.depth === 0)
        .map((entry) => entry.collection.key),
    [collections],
  );
  const upcomingDeadlines = useMemo(
    () =>
      pickUpcomingClassReadings(
        buildClassReadings(filterSyllabiByLibrary(allSyllabi, libraryID)),
      ),
    [allSyllabi, libraryID],
  );
  const {
    pinnedItems,
    nextUp,
    reload: reloadPinned,
  } = usePinnedScheduleData(libraryID);
  const hasPinned = pinnedItems.length > 0 || nextUp.length > 0;

  const videos = useMemo(
    () => data.recentItems.filter((item) => isVideoGalleryItem(item)),
    [data.recentItems],
  );
  const audio = useMemo(
    () => data.recentItems.filter((item) => isAudioGalleryItem(item)),
    [data.recentItems],
  );

  const selectItem = useCallback((item: Zotero.Item) => {
    try {
      ztoolkit.getGlobal("ZoteroPane").selectItem(item.id);
    } catch (error) {
      ztoolkit.log("Error selecting explorer item:", error);
    }
  }, []);

  const handleClick = useCallback<MagazineTileClick>(
    (item, e) => {
      if (e.shiftKey) {
        handleIdentifierClick(item, undefined, e);
        return;
      }
      selectItem(item);
    },
    [handleIdentifierClick, selectItem],
  );

  const handleDoubleClick = useCallback((item: Zotero.Item) => {
    openItemBestAttachment(item);
  }, []);

  const handleContextMenu = useCallback<MagazineTileClick>((item, e) => {
    void openZoteroItemContextMenu(item, e);
  }, []);

  const itemsForShelf = useCallback(
    (shelf: ExplorerShelf): Zotero.Item[] => {
      switch (shelf.type) {
        case "watch-now":
          return pickNewestItems(videos, EXPLORER_MEDIA_LIMIT);
        case "listen-now":
          return pickNewestItems(audio, EXPLORER_MEDIA_LIMIT);
        case "recently-added":
          return pickRecentItemsByDate(data.recentItems, shelf.days).slice(
            0,
            EXPLORER_RECENTLY_ADDED_LIMIT,
          );
        case "recently-read":
          return data.recentlyRead.slice(0, shelf.limit);
        case "recent-in-feed":
          return pickRecentItemsByDate(data.feedItems, shelf.days).slice(
            0,
            EXPLORER_MEDIA_LIMIT,
          );
        case "recent-annotations":
          return groupAdjacentStreamEntries(
            data.annotations.slice(0, shelf.limit),
          )
            .map((group) => group.parent)
            .filter((item): item is Zotero.Item => !!item);
        case "upcoming-deadlines":
          return [];
        case "pinned":
          return [];
        case "collection":
          return readCollectionItems(
            shelf.libraryID,
            shelf.collectionKey,
          ).slice(0, EXPLORER_ARTICLE_DESK_LIMIT * 2);
        case "saved-search":
          return (
            data.savedSearchItems[
              savedSearchShelfKey(shelf.libraryID, shelf.searchKey)
            ] || []
          );
        default:
          return [];
      }
    },
    [
      audio,
      data.annotations,
      data.feedItems,
      data.recentItems,
      data.recentlyRead,
      data.savedSearchItems,
      videos,
    ],
  );

  const renderedShelves = useMemo(() => {
    const rows: Array<{ shelf: ExplorerShelf; items: Zotero.Item[] }> = [];
    for (const shelf of visibleShelves) {
      const items = itemsForShelf(shelf);
      const empty =
        shelf.type === "upcoming-deadlines"
          ? upcomingDeadlines.length === 0
          : shelf.type === "pinned"
            ? !hasPinned
            : items.length === 0;
      if (empty) {
        continue;
      }
      rows.push({ shelf, items });
    }
    return rows;
  }, [hasPinned, itemsForShelf, upcomingDeadlines.length, visibleShelves]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ids = await Zotero.Items.getAll(libraryID, true, false, true);
        if (!cancelled) {
          setItemCount(ids.length);
        }
      } catch (error) {
        ztoolkit.log("Error counting explorer library items:", error);
        if (!cancelled) {
          setItemCount(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [libraryID]);

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
      container.querySelectorAll("[data-explorer-nav]"),
      (el) => el as HTMLElement,
    );
    if (sections.length === 0) {
      setActiveShelfId(null);
      return;
    }
    const activationLine = sticky
      ? sticky.getBoundingClientRect().bottom
      : container.getBoundingClientRect().top;
    const nextId = findActiveGalleryGroupId(
      sections.map((section) => ({
        id: section.dataset.explorerNav || "",
        top: section.getBoundingClientRect().top,
      })),
      activationLine,
    );
    setActiveShelfId(nextId);
  }, []);

  useEffect(() => {
    const container = pageRef.current;
    if (!container || renderedShelves.length === 0) {
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
  }, [renderedShelves, updateActiveFromScroll]);

  useLayoutEffect(() => {
    const strip = pillsRef.current;
    if (!strip || !activeShelfId) {
      return;
    }
    const pill = Array.from(
      strip.querySelectorAll("[data-explorer-nav-pill]"),
      (el) => el as HTMLElement,
    ).find((el) => el.dataset.explorerNavPill === activeShelfId);
    if (pill) {
      scrollChildIntoNearestHorizontal(strip, pill);
    }
  }, [activeShelfId]);

  const handleSelectShelf = useCallback(
    (id: string) => {
      const container = pageRef.current;
      const sticky = stickyRef.current;
      if (!container) {
        return;
      }
      const section = Array.from(
        container.querySelectorAll("[data-explorer-nav]"),
        (el) => el as HTMLElement,
      ).find((el) => el.dataset.explorerNav === id);
      if (!section) {
        return;
      }
      suppressScrollSpyRef.current = true;
      setActiveShelfId(id);
      scrollElementBelowSticky(container, section, sticky);
      const win = Zotero.getMainWindow();
      win?.setTimeout(() => {
        suppressScrollSpyRef.current = false;
        updateActiveFromScroll();
      }, 400);
    },
    [updateActiveFromScroll],
  );

  const bodyProps = {
    density,
    selectedIdentifiers,
    selectedItemIds,
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    onContextMenu: handleContextMenu,
    onIdentifierClick: handleIdentifierClick,
  };

  return (
    <div
      ref={pageRef}
      tabIndex={-1}
      className={twMerge(
        "syllabus-page syllabus-explorer-page syllabus-magazine-page overflow-y-auto overflow-x-hidden h-full bg-background focus:outline-none",
        density !== "expanded" && `density-${density}`,
      )}
      data-item-density={density}
      dir={getUiDir()}
    >
      <div className="pb-12">
        <div
          ref={stickyRef}
          className={twMerge(
            "syllabus-explorer-sticky sticky top-0 z-40 bg-background",
            isZotero8OrLater() ? "md:pt-8 pt-6" : "pt-8",
          )}
        >
          <div className="px-6 flex flex-row items-start justify-between gap-3">
            <div className="syllabus-explorer-title-block min-w-0">
              <h1 className="syllabus-explorer-title text-primary min-w-0 truncate">
                {title}
              </h1>
              {itemCount != null ? (
                <p className="syllabus-explorer-library-count">
                  {getString("explorer-library-count", {
                    args: { count: itemCount },
                  })}
                </p>
              ) : null}
            </div>
            <ExplorerConfigureMenu
              shelves={shelves}
              libraryID={libraryID}
              topLevelCollectionKeys={topLevelCollectionKeys}
              onChange={setShelves}
            />
          </div>
          {renderedShelves.length > 1 ? (
            <nav
              className="syllabus-gallery-groups-nav syllabus-explorer-nav px-6"
              ref={pillsRef}
              aria-label={getString("explorer-nav-aria")}
            >
              <div className="syllabus-gallery-groups-nav-inner">
                {renderedShelves.map(({ shelf }) => {
                  const label = shelfTitle(shelf);
                  const isActive = shelf.id === activeShelfId;
                  return (
                    <button
                      key={shelf.id}
                      type="button"
                      className="syllabus-gallery-group-pill"
                      data-explorer-nav-pill={shelf.id}
                      aria-current={isActive ? "true" : undefined}
                      title={getString("gallery-group-jump", {
                        args: { name: label },
                      })}
                      onClick={() => handleSelectShelf(shelf.id)}
                    >
                      <CatalogRowIcon shelf={shelf} size={12} />
                      <span className="syllabus-gallery-group-pill-label">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          ) : null}
        </div>
        <GalleryViewportProvider rootRef={pageRef}>
          <div className="px-6 pt-6 flex flex-col gap-10">
            {renderedShelves.map(({ shelf, items }, index) => {
              const collection = collectionForShelf(shelf);
              const savedSearch = searchForShelf(shelf);
              const collectionId = collection?.id || 0;
              const heading = shelfTitle(shelf);
              const description = shelfDescription(shelf);
              const openCollection = () => {
                if (collectionId) {
                  selectCollectionInLibrary(collectionId);
                }
              };
              const openSearch = () => {
                if (savedSearch) {
                  selectSavedSearchInLibrary(savedSearch);
                }
              };
              return (
                <section
                  key={shelf.id}
                  className="syllabus-magazine-desk"
                  data-explorer-shelf={shelf.type}
                  data-explorer-nav={shelf.id}
                >
                  <div className="syllabus-explorer-shelf-header">
                    <div className="syllabus-explorer-shelf-heading">
                      <h2 className="syllabus-magazine-desk-title">
                        {shelf.type === "collection" ? (
                          <button
                            type="button"
                            className="syllabus-explorer-collection-link"
                            disabled={!collectionId}
                            onClick={openCollection}
                          >
                            <span
                              className={`icon icon-css ${
                                collectionHasSyllabusNote(collectionId)
                                  ? "icon-syllabus-collection"
                                  : "icon-collection"
                              } syllabus-gallery-group-icon`}
                              aria-hidden="true"
                            />
                            <span>{heading}</span>
                          </button>
                        ) : shelf.type === "saved-search" ? (
                          <button
                            type="button"
                            className="syllabus-explorer-collection-link"
                            disabled={!savedSearch}
                            onClick={openSearch}
                          >
                            <span
                              className="icon icon-css icon-search syllabus-gallery-group-icon"
                              aria-hidden="true"
                            />
                            <span>{heading}</span>
                          </button>
                        ) : shelf.type === "upcoming-deadlines" ? (
                          isOptionalFeatureEnabled("readingSchedule") ? (
                            <button
                              type="button"
                              className="syllabus-explorer-collection-link"
                              onClick={() => openReadingScheduleTab()}
                            >
                              <span
                                className="icon icon-css icon-calendar syllabus-gallery-group-icon"
                                aria-hidden="true"
                              />
                              <span>{heading}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="icon icon-css icon-calendar syllabus-gallery-group-icon"
                                aria-hidden="true"
                              />
                              <span>{heading}</span>
                            </span>
                          )
                        ) : shelf.type === "pinned" ? (
                          <span className="inline-flex items-center gap-1">
                            <Pin
                              size={16}
                              strokeWidth={2}
                              className="syllabus-gallery-group-icon"
                              aria-hidden="true"
                            />
                            <span>{heading}</span>
                          </span>
                        ) : (
                          <span>{heading}</span>
                        )}
                      </h2>
                      {description ? (
                        <p className="syllabus-explorer-shelf-desc">
                          {description}
                        </p>
                      ) : (
                        <div className="h-4" />
                      )}
                    </div>
                    {shelf.type === "upcoming-deadlines" &&
                    isOptionalFeatureEnabled("readingSchedule") ? (
                      <div className="inline-flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="syllabus-explorer-customize syllabus-explorer-shelf-goto"
                          onClick={() => openReadingScheduleTab()}
                        >
                          <span>
                            {getString("explorer-go-to-reading-schedule")}
                          </span>
                          {getUiDir() === "rtl" ? (
                            <ChevronLeft
                              size={12}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronRight
                              size={12}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                        <ExplorerShelfSettingsMenu
                          shelf={shelf}
                          onChange={(next) =>
                            setShelves(
                              shelves.map((row) =>
                                row.id === next.id ? next : row,
                              ),
                            )
                          }
                        />
                      </div>
                    ) : shelf.type === "recent-annotations" &&
                      isOptionalFeatureEnabled("annotations") ? (
                      <div className="inline-flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="syllabus-explorer-customize syllabus-explorer-shelf-goto"
                          onClick={() => openMyAnnotationsTab(libraryID)}
                        >
                          <span>
                            {getString("explorer-go-to-my-annotations")}
                          </span>
                          {getUiDir() === "rtl" ? (
                            <ChevronLeft
                              size={12}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronRight
                              size={12}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                        <ExplorerShelfSettingsMenu
                          shelf={shelf}
                          onChange={(next) =>
                            setShelves(
                              shelves.map((row) =>
                                row.id === next.id ? next : row,
                              ),
                            )
                          }
                        />
                      </div>
                    ) : shelf.type === "recent-annotations" ? (
                      <ExplorerShelfSettingsMenu
                        shelf={shelf}
                        onChange={(next) =>
                          setShelves(
                            shelves.map((row) =>
                              row.id === next.id ? next : row,
                            ),
                          )
                        }
                      />
                    ) : shelfShowsLayout(shelf) ? (
                      <ExplorerShelfSettingsMenu
                        shelf={shelf}
                        onChange={(next) =>
                          setShelves(
                            shelves.map((row) =>
                              row.id === next.id ? next : row,
                            ),
                          )
                        }
                      />
                    ) : null}
                  </div>
                  {shelf.type === "upcoming-deadlines" ? (
                    <ExplorerDeadlineShelf
                      readings={upcomingDeadlines}
                      density={density}
                      layout={explorerShelfLayout(shelf)}
                      selectedItemIds={selectedItemIds}
                      onClick={handleClick}
                      onDoubleClick={handleDoubleClick}
                      onContextMenu={handleContextMenu}
                    />
                  ) : shelf.type === "pinned" ? (
                    <PinnedSection
                      density={density}
                      layout={explorerShelfLayout(shelf)}
                      showLibraryName={false}
                      pinnedItems={pinnedItems}
                      nextUp={nextUp}
                      onChanged={reloadPinned}
                      embedded
                    />
                  ) : shelf.type === "recent-annotations" &&
                    shelf.layout !== "magazine" ? (
                    <ExplorerAnnotationShelf
                      annotations={data.annotations.slice(0, shelf.limit)}
                      selectedItemIds={selectedItemIds}
                      onClick={handleClick}
                      onDoubleClick={handleDoubleClick}
                      onContextMenu={handleContextMenu}
                    />
                  ) : isExplorerCollectionShelf(shelf) && collectionId ? (
                    <ExplorerCollectionShelfBody
                      shelf={shelf}
                      collectionId={collectionId}
                      syllabus={
                        collectionHasSyllabusNote(collectionId)
                          ? allSyllabi.find(
                              (entry) => entry.collection.id === collectionId,
                            ) || null
                          : null
                      }
                      fallbackItems={items}
                      keyPrefix={shelf.id}
                      template={magazineTemplateForShelf(shelf.type, index)}
                      {...bodyProps}
                    />
                  ) : (
                    <ExplorerShelfBody
                      items={items}
                      layout={explorerShelfLayout(shelf)}
                      keyPrefix={shelf.id}
                      template={magazineTemplateForShelf(shelf.type, index)}
                      collectionId={collectionId}
                      {...bodyProps}
                    />
                  )}
                </section>
              );
            })}
          </div>
        </GalleryViewportProvider>
      </div>
    </div>
  );
}

export function renderExplorerPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  libraryID: number,
) {
  renderComponent(
    win,
    rootElement,
    <ExplorerPage libraryID={libraryID} />,
    "syllabus-custom-view",
    `explorer:${libraryID}`,
  );
}
