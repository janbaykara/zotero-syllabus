// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  ArrowDownAZ,
  BookOpen,
  Calendar,
  CalendarPlus,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Shapes,
  Tags,
  User,
} from "lucide-preact";
import { isZotero8OrLater } from "../utils/zotero";
import { openItemBestAttachment, sortItems } from "../utils/items";
import { getString, getUiDir } from "../utils/locale";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import { renderComponent } from "../utils/react";
import type { GalleryGroupBy } from "./galleryGroupBy";
import type { GallerySortBy } from "./gallerySort";
import {
  useMyAnnotationsGroupBy,
  useMyAnnotationsLayout,
  useMyAnnotationsSortBy,
  type MyAnnotationsLayout,
} from "./myAnnotationsPrefs";
import { GalleryViewportProvider } from "./galleryVisibility";
import { useItemIdentifierSelection } from "./browsePage";
import type { MagazineTileClick } from "./MagazineTile";
import { ExplorerAnnotationTile } from "./annotationTiles";
import {
  useMyAnnotatedRecentlyRead,
  type ExplorerAnnotationGroup,
} from "./explorerQueries";
import { useCollectionTagGroups } from "./tagGroups";
import { useCollectionItemTypeGroups } from "./typeGroups";
import { useCollectionCreatorGroups } from "./creatorGroups";

type SegmentOption<T extends string> = {
  mode: T;
  label: string;
  title: string;
  Icon: typeof LayoutGrid;
};

function layoutOptions(): SegmentOption<MyAnnotationsLayout>[] {
  return [
    {
      mode: "vertical",
      label: getString("my-annotations-layout-vertical"),
      title: getString("my-annotations-layout-vertical-title"),
      Icon: LayoutList,
    },
    {
      mode: "grid",
      label: getString("my-annotations-layout-grid"),
      title: getString("my-annotations-layout-grid-title"),
      Icon: LayoutGrid,
    },
  ];
}

function sortOptions(): SegmentOption<GallerySortBy>[] {
  return [
    {
      mode: "lastRead",
      label: getString("gallery-sort-last-read"),
      title: getString("gallery-sort-last-read-title"),
      Icon: BookOpen,
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

function groupByOptions(): SegmentOption<GalleryGroupBy>[] {
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
  ];
}

function useConfigurePopover(
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

function MyAnnotationsSettingsMenu({
  layout,
  onLayout,
  sortBy,
  onSortBy,
  groupBy,
  onGroupBy,
}: {
  layout: MyAnnotationsLayout;
  onLayout: (mode: MyAnnotationsLayout) => void;
  sortBy: GallerySortBy;
  onSortBy: (mode: GallerySortBy) => void;
  groupBy: GalleryGroupBy;
  onGroupBy: (mode: GalleryGroupBy) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverStyle = useConfigurePopover(open, setOpen, rootRef);
  const titleId = "syllabus-my-annotations-settings";
  const layouts = layoutOptions();
  const sorts = sortOptions();
  const groups = groupByOptions();

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
              {layouts.map(({ mode, label, title, Icon }) => {
                const selected = layout === mode;
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
                    onClick={() => onLayout(mode)}
                  >
                    <Icon size={12} strokeWidth={2} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="syllabus-explorer-shelf-setting">
            <div className="syllabus-explorer-configure-heading">
              {getString("gallery-menu-sort")}
            </div>
            <div
              role="radiogroup"
              aria-label={getString("gallery-menu-sort")}
              className="syllabus-explorer-layout-toggle"
            >
              {sorts.map(({ mode, label, title, Icon }) => {
                const selected = sortBy === mode;
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
                    onClick={() => onSortBy(mode)}
                  >
                    <Icon size={12} strokeWidth={2} aria-hidden="true" />
                    {label}
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
              {groups.map(({ mode, label, title, Icon }) => {
                const selected = groupBy === mode;
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
                    onClick={() => onGroupBy(mode)}
                  >
                    <Icon size={12} strokeWidth={2} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sortAnnotationGroups(
  groups: ExplorerAnnotationGroup[],
  sortBy: GallerySortBy,
): ExplorerAnnotationGroup[] {
  if (sortBy === "auto" || sortBy === "lastRead") {
    return [...groups].sort(
      (a, b) =>
        (b.lastRead || 0) - (a.lastRead || 0) ||
        (a.parent?.id || 0) - (b.parent?.id || 0),
    );
  }
  const parents = groups
    .map((group) => group.parent)
    .filter((item): item is Zotero.Item => !!item);
  const order = new Map(
    sortItems(parents, sortBy).map((item, index) => [item.id, index]),
  );
  return [...groups].sort((a, b) => {
    const aOrder = a.parent
      ? (order.get(a.parent.id) ?? 0)
      : Number.MAX_SAFE_INTEGER;
    const bOrder = b.parent
      ? (order.get(b.parent.id) ?? 0)
      : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

function AnnotationGroupsGrid({
  groups,
  arrangement,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  groups: ExplorerAnnotationGroup[];
  arrangement: MyAnnotationsLayout;
  selectedItemIds: number[] | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("my-annotations-empty")}
      </p>
    );
  }
  return (
    <div
      className={
        arrangement === "grid"
          ? "syllabus-my-annotations-grid"
          : "syllabus-my-annotations-vertical"
      }
    >
      {groups.map((group) => (
        <ExplorerAnnotationTile
          key={
            group.parent?.id ?? group.annotations.map((row) => row.id).join("-")
          }
          rows={group.annotations}
          layout="cover"
          size="large"
          arrangement="stack"
          selected={
            !!group.parent &&
            (selectedItemIds?.includes(group.parent.id) || false)
          }
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

export function MyAnnotationsPage({ libraryID }: { libraryID: number }) {
  const groups = useMyAnnotatedRecentlyRead(libraryID);
  const [layout, setLayout] = useMyAnnotationsLayout();
  const [groupBy, setGroupBy] = useMyAnnotationsGroupBy({
    classes: false,
    subcollections: false,
    magazine: false,
  });
  const [sortBy, setSortBy] = useMyAnnotationsSortBy();
  const { selectedItemIds, handleIdentifierClick } =
    useItemIdentifierSelection();
  const pageRef = useRef<HTMLDivElement>(null);

  const syllabusItems = useMemo(
    () =>
      groups
        .map((group) => group.parent)
        .filter((item): item is Zotero.Item => !!item)
        .map((zoteroItem) => ({ zoteroItem, assignments: [] as unknown[] })),
    [groups],
  );
  const { tagGroups, untaggedItems } = useCollectionTagGroups(syllabusItems);
  const { typeGroups } = useCollectionItemTypeGroups(syllabusItems);
  const { creatorGroups, uncreditedItems } =
    useCollectionCreatorGroups(syllabusItems);

  const groupsByParentId = useMemo(() => {
    const map = new Map<number, ExplorerAnnotationGroup>();
    for (const group of groups) {
      if (group.parent) {
        map.set(group.parent.id, group);
      }
    }
    return map;
  }, [groups]);

  const sortedGroups = useMemo(
    () => sortAnnotationGroups(groups, sortBy),
    [groups, sortBy],
  );

  const selectItem = useCallback((item: Zotero.Item) => {
    try {
      ztoolkit.getGlobal("ZoteroPane").selectItem(item.id);
    } catch (error) {
      ztoolkit.log("Error selecting My Annotations item:", error);
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

  const renderGroups = (itemList: Zotero.Item[]) => {
    const mapped = itemList
      .map((item) => groupsByParentId.get(item.id))
      .filter((group): group is ExplorerAnnotationGroup => !!group);
    return (
      <AnnotationGroupsGrid
        groups={sortAnnotationGroups(mapped, sortBy)}
        arrangement={layout}
        selectedItemIds={selectedItemIds}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />
    );
  };

  return (
    <div
      className="syllabus-page overflow-y-auto overflow-x-hidden h-full"
      dir={getUiDir()}
      ref={pageRef}
    >
      <div
        className={twMerge(
          "sticky top-0 z-20 bg-background py-1",
          isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
        )}
      >
        <div className="container-padded bg-background">
          <div className="flex flex-row items-start gap-2 justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-3xl">
                {getString("view-tab-my-annotations")}
              </div>
              <p className="text-secondary text-base mt-1">
                {getString("my-annotations-desc")}
              </p>
            </div>
            <MyAnnotationsSettingsMenu
              layout={layout}
              onLayout={setLayout}
              sortBy={sortBy}
              onSortBy={setSortBy}
              groupBy={groupBy}
              onGroupBy={setGroupBy}
            />
          </div>
        </div>
      </div>
      <GalleryViewportProvider rootRef={pageRef}>
        <div
          className={twMerge(
            "syllabus-my-annotations-body pt-6 pb-10 flex flex-col gap-8 box-border min-w-0",
            layout === "grid" ? "is-grid-body px-6 w-full" : "container-padded",
          )}
        >
          {groupBy === "type" ? (
            typeGroups.length === 0 ? (
              <p className="text-secondary text-base">
                {getString("my-annotations-empty")}
              </p>
            ) : (
              typeGroups.map(({ itemType, label, items }) => (
                <section
                  key={itemType}
                  className="syllabus-gallery-section"
                  data-gallery-group={`type-${itemType}`}
                >
                  <h2 className="syllabus-gallery-section-title">{label}</h2>
                  {renderGroups(items)}
                </section>
              ))
            )
          ) : groupBy === "creator" ? (
            creatorGroups.length === 0 && uncreditedItems.length === 0 ? (
              <p className="text-secondary text-base">
                {getString("my-annotations-empty")}
              </p>
            ) : (
              <>
                {creatorGroups.map(({ key, label, items }) => (
                  <section
                    key={key}
                    className="syllabus-gallery-section"
                    data-gallery-group={`creator-${key}`}
                  >
                    <h2 className="syllabus-gallery-section-title">{label}</h2>
                    {renderGroups(items)}
                  </section>
                ))}
                {uncreditedItems.length > 0 ? (
                  <section
                    className="syllabus-gallery-section"
                    data-gallery-group="uncredited"
                  >
                    <h2 className="syllabus-gallery-section-title">
                      {getString("gallery-uncredited")}
                    </h2>
                    {renderGroups(uncreditedItems)}
                  </section>
                ) : null}
              </>
            )
          ) : groupBy === "tags" ? (
            tagGroups.length === 0 && untaggedItems.length === 0 ? (
              <p className="text-secondary text-base">
                {getString("my-annotations-empty")}
              </p>
            ) : (
              <>
                {tagGroups.map(({ tag, items }) => (
                  <section
                    key={tag}
                    className="syllabus-gallery-section"
                    data-gallery-group={`tag-${tag}`}
                  >
                    <h2 className="syllabus-gallery-section-title">{tag}</h2>
                    {renderGroups(items)}
                  </section>
                ))}
                {untaggedItems.length > 0 ? (
                  <section
                    className="syllabus-gallery-section"
                    data-gallery-group="untagged"
                  >
                    <h2 className="syllabus-gallery-section-title">
                      {getString("gallery-untagged")}
                    </h2>
                    {renderGroups(untaggedItems)}
                  </section>
                ) : null}
              </>
            )
          ) : (
            <AnnotationGroupsGrid
              groups={sortedGroups}
              arrangement={layout}
              selectedItemIds={selectedItemIds}
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>
      </GalleryViewportProvider>
    </div>
  );
}

export function renderMyAnnotationsPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  libraryID: number,
) {
  renderComponent(
    win,
    rootElement,
    <MyAnnotationsPage libraryID={libraryID} />,
    "syllabus-custom-view",
  );
}
