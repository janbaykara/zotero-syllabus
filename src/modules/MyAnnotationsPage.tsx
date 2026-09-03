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
  Calendar,
  CalendarPlus,
  ChevronDown,
  Globe,
  Image,
  LayoutGrid,
  LayoutList,
  ListOrdered,
  Newspaper,
  Shapes,
  Tags,
  User,
} from "lucide-preact";
import { isZotero8OrLater } from "../utils/zotero";
import { openItemBestAttachment, sortItems } from "../utils/items";
import { getString, getUiDir } from "../utils/locale";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import { renderComponent } from "../utils/react";
import type { GalleryLayout } from "./galleryLayout";
import {
  useGalleryLayout,
  type GalleryGlobalSetting,
} from "./galleryLayout";
import {
  useGalleryGroupBy,
  type GalleryGroupBy,
} from "./galleryGroupBy";
import { useGallerySortBy, type GallerySortBy } from "./gallerySort";
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

export const MY_ANNOTATIONS_VIEW_KEY = "my-annotations";

type SegmentOption<T extends string> = {
  mode: T;
  label: string;
  title: string;
  Icon: typeof LayoutGrid;
};

function layoutOptions(): SegmentOption<GalleryLayout>[] {
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

function sortOptions(): SegmentOption<GallerySortBy>[] {
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

function GlobalSaveButton<T>({
  setting,
}: {
  setting: GalleryGlobalSetting<T>;
}) {
  return (
    <button
      type="button"
      className={twMerge(
        "syllabus-gallery-save-global",
        setting.isCustom && "is-active",
      )}
      title={
        setting.isCustom
          ? getString("gallery-save-globally-active-title")
          : getString("gallery-save-globally-title")
      }
      aria-label={getString("gallery-save-globally")}
      aria-pressed={setting.isCustom}
      onClick={(event) => {
        event.stopPropagation();
        setting.saveGlobally();
      }}
    >
      <Globe size={14} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

function MyAnnotationsSettingsMenu({
  layout,
  onLayout,
  layoutGlobal,
  sortBy,
  onSortBy,
  sortByGlobal,
  groupBy,
  onGroupBy,
  groupByGlobal,
}: {
  layout: GalleryLayout;
  onLayout: (mode: GalleryLayout) => void;
  layoutGlobal: GalleryGlobalSetting<GalleryLayout>;
  sortBy: GallerySortBy;
  onSortBy: (mode: GallerySortBy) => void;
  sortByGlobal: GalleryGlobalSetting<GallerySortBy>;
  groupBy: GalleryGroupBy;
  onGroupBy: (mode: GalleryGroupBy) => void;
  groupByGlobal: GalleryGlobalSetting<GalleryGroupBy>;
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
            <div className="syllabus-gallery-toolbar-heading">
              <span className="syllabus-explorer-configure-heading">
                {getString("gallery-menu-view")}
              </span>
              <GlobalSaveButton setting={layoutGlobal} />
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
            <div className="syllabus-gallery-toolbar-heading">
              <span className="syllabus-explorer-configure-heading">
                {getString("gallery-menu-sort")}
              </span>
              <GlobalSaveButton setting={sortByGlobal} />
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
            <div className="syllabus-gallery-toolbar-heading">
              <span className="syllabus-explorer-configure-heading">
                {getString("gallery-menu-group")}
              </span>
              <GlobalSaveButton setting={groupByGlobal} />
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
  if (sortBy === "auto") {
    return groups;
  }
  const parents = groups
    .map((group) => group.parent)
    .filter((item): item is Zotero.Item => !!item);
  const order = new Map(
    sortItems(parents, sortBy).map((item, index) => [item.id, index]),
  );
  return [...groups].sort((a, b) => {
    const aOrder = a.parent ? (order.get(a.parent.id) ?? 0) : Number.MAX_SAFE_INTEGER;
    const bOrder = b.parent ? (order.get(b.parent.id) ?? 0) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

function AnnotationGroupsGrid({
  groups,
  tileLayout,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  groups: ExplorerAnnotationGroup[];
  tileLayout: "cover" | "card";
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
        tileLayout === "cover"
          ? "syllabus-my-annotations-covers"
          : "syllabus-explorer-annotation-cards"
      }
    >
      {groups.map((group) => (
        <ExplorerAnnotationTile
          key={
            group.parent?.id ??
            group.annotations.map((row) => row.id).join("-")
          }
          rows={group.annotations}
          layout={tileLayout}
          size="large"
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
  const viewKey = MY_ANNOTATIONS_VIEW_KEY;
  const groups = useMyAnnotatedRecentlyRead(libraryID);
  const [layout, setLayout, layoutGlobal] = useGalleryLayout(viewKey);
  const [groupBy, setGroupBy, groupByGlobal] = useGalleryGroupBy(viewKey, {
    classes: false,
    subcollections: false,
    magazine: false,
  });
  const [sortBy, setSortBy, sortByGlobal] = useGallerySortBy(viewKey);
  const { selectedItemIds, handleIdentifierClick } =
    useItemIdentifierSelection();
  const pageRef = useRef<HTMLDivElement>(null);

  const tileLayout: "cover" | "card" = layout === "card" ? "card" : "cover";

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
        tileLayout={tileLayout}
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
              layoutGlobal={layoutGlobal}
              sortBy={sortBy}
              onSortBy={setSortBy}
              sortByGlobal={sortByGlobal}
              groupBy={groupBy}
              onGroupBy={setGroupBy}
              groupByGlobal={groupByGlobal}
            />
          </div>
        </div>
      </div>
      <GalleryViewportProvider rootRef={pageRef}>
        <div className="container-padded px-6 pt-6 pb-10 flex flex-col gap-8">
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
              tileLayout={tileLayout}
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
