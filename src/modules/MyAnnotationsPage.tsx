// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { ArrowDown, ArrowUp } from "lucide-preact";
import { isZotero8OrLater } from "../utils/zotero";
import { openAnnotationIdInReader, openItemBestAttachment } from "../utils/items";
import { getString, getUiDir } from "../utils/locale";
import { formatRelativeTimestamp } from "../utils/dates";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import { renderComponent } from "../utils/react";
import {
  useMyAnnotationsOrder,
  type MyAnnotationsOrder,
} from "./myAnnotationsPrefs";
import { GalleryViewportProvider } from "./galleryVisibility";
import { useItemIdentifierSelection } from "./browsePage";
import type { MagazineTileClick } from "./MagazineTile";
import { GalleryTile } from "./GalleryPage";
import {
  useMyAnnotationsStream,
  type MyAnnotationStreamEntry,
} from "./explorerQueries";

function dateMs(value: string | undefined): number {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortStreamRows(
  rows: MyAnnotationStreamEntry[],
  order: MyAnnotationsOrder,
): MyAnnotationStreamEntry[] {
  const sorted = [...rows].sort(
    (a, b) =>
      dateMs(a.dateAdded) - dateMs(b.dateAdded) ||
      dateMs(a.dateModified) - dateMs(b.dateModified) ||
      a.id - b.id,
  );
  if (order === "newestFirst") {
    sorted.reverse();
  }
  return sorted;
}

type StreamParentGroup = {
  key: string;
  parent: Zotero.Item | null;
  entries: MyAnnotationStreamEntry[];
};

/** Collapse consecutive same-parent rows so one cover serves the run. */
function groupAdjacentStreamEntries(
  rows: MyAnnotationStreamEntry[],
): StreamParentGroup[] {
  const groups: StreamParentGroup[] = [];
  for (const entry of rows) {
    const parentId = entry.parent?.id ?? null;
    const last = groups[groups.length - 1];
    const lastId = last?.parent?.id ?? null;
    if (last && parentId != null && parentId === lastId) {
      last.entries.push(entry);
      continue;
    }
    groups.push({
      key:
        parentId != null
          ? `parent-${parentId}-${entry.id}`
          : `orphan-${entry.id}`,
      parent: entry.parent,
      entries: [entry],
    });
  }
  return groups;
}

function formatAnnotationPageLabel(page: string): string {
  try {
    const cite = (
      Zotero as typeof Zotero & {
        Cite?: { getLocatorString?: (locator: string) => string };
      }
    ).Cite;
    const locator = cite?.getLocatorString?.("page");
    if (locator) {
      return `${locator} ${page}`;
    }
  } catch {
    // Fall through to Fluent.
  }
  return getString("my-annotations-page", { args: { page } });
}

function AnnotationStreamBody({ entry }: { entry: MyAnnotationStreamEntry }) {
  const stamp = formatRelativeTimestamp(entry.dateAdded || entry.dateModified);
  const pageText = entry.pageLabel
    ? formatAnnotationPageLabel(entry.pageLabel)
    : "";
  return (
    <div
      className="syllabus-my-annotations-stream-body min-w-0"
      data-annotation-id={entry.id}
      role="button"
      tabIndex={0}
      title={getString("my-annotations-open-in-reader")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openAnnotationIdInReader(entry.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          openAnnotationIdInReader(entry.id);
        }
      }}
    >
      {entry.quote ? (
        <div className="syllabus-my-annotations-stream-quote">
          <mark
            className="syllabus-magazine-highlight-mark"
            style={{ "--highlight-color": entry.color } as JSX.CSSProperties}
          >
            {entry.quote}
          </mark>
        </div>
      ) : null}
      {pageText || stamp ? (
        <div className="syllabus-my-annotations-stream-meta">
          {pageText ? (
            <span className="syllabus-my-annotations-stream-location">
              {pageText}
            </span>
          ) : null}
          {pageText && stamp ? (
            <span className="syllabus-my-annotations-stream-meta-sep" aria-hidden="true">
              ·
            </span>
          ) : null}
          {stamp ? (
            <time
              className="syllabus-my-annotations-stream-time"
              dateTime={stamp.iso}
              title={stamp.absolute}
            >
              {stamp.relative}
            </time>
          ) : null}
        </div>
      ) : null}
      {entry.comment ? (
        <div className="syllabus-my-annotations-stream-comment">
          {entry.comment}
        </div>
      ) : null}
    </div>
  );
}

function AnnotationStreamGroup({
  group,
  selected,
  onContextMenu,
}: {
  group: StreamParentGroup;
  selected: boolean;
  onContextMenu: MagazineTileClick;
}) {
  const parent = group.parent;
  const openGroupInReader = useCallback(() => {
    const first = group.entries[0];
    if (first) {
      openAnnotationIdInReader(first.id);
      return;
    }
    if (parent) {
      openItemBestAttachment(parent);
    }
  }, [group.entries, parent]);

  return (
    <article
      className={twMerge(
        "syllabus-my-annotations-stream-entry",
        selected && "is-selected",
      )}
      data-parent-id={parent?.id ?? ""}
      data-annotation-count={group.entries.length}
    >
      <div className="syllabus-my-annotations-stream-avatar">
        {parent ? (
          <GalleryTile
            item={parent}
            selected={selected}
            interactive
            onClick={(_item, e) => {
              e.preventDefault();
              e.stopPropagation();
              openGroupInReader();
            }}
            onDoubleClick={(_item) => {
              openGroupInReader();
            }}
            onContextMenu={onContextMenu}
          />
        ) : (
          <div className="syllabus-my-annotations-stream-avatar-empty" />
        )}
      </div>
      <div className="syllabus-my-annotations-stream-stack min-w-0">
        {group.entries.map((entry) => (
          <AnnotationStreamBody key={entry.id} entry={entry} />
        ))}
      </div>
    </article>
  );
}

function OrderToggle({
  order,
  onOrder,
}: {
  order: MyAnnotationsOrder;
  onOrder: (mode: MyAnnotationsOrder) => void;
}) {
  const options: {
    mode: MyAnnotationsOrder;
    label: string;
    title: string;
    Icon: typeof ArrowDown;
  }[] = [
    {
      mode: "newestLast",
      label: getString("my-annotations-order-newest-last"),
      title: getString("my-annotations-order-newest-last-title"),
      Icon: ArrowDown,
    },
    {
      mode: "newestFirst",
      label: getString("my-annotations-order-newest-first"),
      title: getString("my-annotations-order-newest-first-title"),
      Icon: ArrowUp,
    },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={getString("view-tab-my-annotations")}
      className="syllabus-explorer-layout-toggle syllabus-my-annotations-order-toggle"
    >
      {options.map(({ mode, label, title, Icon }) => {
        const selected = order === mode;
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
            onClick={() => onOrder(mode)}
          >
            <Icon size={12} strokeWidth={2} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function LoadPreviousButton({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="syllabus-my-annotations-load-previous-wrap">
      <button
        type="button"
        className="syllabus-my-annotations-load-previous"
        disabled={loading}
        onClick={onClick}
      >
        {loading
          ? getString("my-annotations-load-previous-loading")
          : getString("my-annotations-load-previous")}
      </button>
    </div>
  );
}

const NEAR_EDGE_PX = 80;

export function MyAnnotationsPage({ libraryID }: { libraryID: number }) {
  const { rows, hasMore, loading, loadingMore, loadPrevious } =
    useMyAnnotationsStream(libraryID);
  const [order, setOrder] = useMyAnnotationsOrder();
  const { selectedItemIds } = useItemIdentifierSelection();
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const pinnedToLiveRef = useRef(true);
  const pendingScrollRef = useRef<
    { kind: "live" } | { kind: "anchor"; height: number; top: number } | null
  >({ kind: "live" });
  const prevRowCountRef = useRef(0);
  const skipNextPinTrackRef = useRef(false);

  const displayRows = useMemo(() => sortStreamRows(rows, order), [rows, order]);
  const displayGroups = useMemo(
    () => groupAdjacentStreamEntries(displayRows),
    [displayRows],
  );

  const handleContextMenu = useCallback<MagazineTileClick>((item, e) => {
    void openZoteroItemContextMenu(item, e);
  }, []);

  const updatePinnedFromScroll = useCallback(() => {
    if (skipNextPinTrackRef.current) {
      return;
    }
    const el = pageRef.current;
    if (!el) {
      return;
    }
    if (order === "newestLast") {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      pinnedToLiveRef.current = distance <= NEAR_EDGE_PX;
    } else {
      pinnedToLiveRef.current = el.scrollTop <= NEAR_EDGE_PX;
    }
  }, [order]);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const header = headerRef.current;
    if (!page || !header) {
      return;
    }
    const syncStickyTop = () => {
      const gap = 12;
      const top = Math.ceil(header.getBoundingClientRect().height + gap);
      page.style.setProperty(
        "--syllabus-my-annotations-sticky-top",
        `${top}px`,
      );
    };
    syncStickyTop();
    const observer = new ResizeObserver(syncStickyTop);
    observer.observe(header);
    const win = page.ownerDocument.defaultView;
    win?.addEventListener("resize", syncStickyTop);
    return () => {
      observer.disconnect();
      win?.removeEventListener("resize", syncStickyTop);
    };
  }, []);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) {
      return;
    }
    const onScroll = () => updatePinnedFromScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [updatePinnedFromScroll]);

  const handleOrderChange = useCallback(
    (next: MyAnnotationsOrder) => {
      setOrder(next);
      pinnedToLiveRef.current = true;
      pendingScrollRef.current = { kind: "live" };
      skipNextPinTrackRef.current = true;
    },
    [setOrder],
  );

  const handleLoadPrevious = useCallback(async () => {
    const el = pageRef.current;
    if (el) {
      pendingScrollRef.current = {
        kind: "anchor",
        height: el.scrollHeight,
        top: el.scrollTop,
      };
      skipNextPinTrackRef.current = true;
    }
    await loadPrevious();
  }, [loadPrevious]);

  useLayoutEffect(() => {
    const el = pageRef.current;
    if (!el) {
      return;
    }
    const pending = pendingScrollRef.current;
    const grew = displayRows.length > prevRowCountRef.current;
    prevRowCountRef.current = displayRows.length;

    if (pending?.kind === "anchor") {
      const delta = el.scrollHeight - pending.height;
      el.scrollTop = pending.top + delta;
      pendingScrollRef.current = null;
      skipNextPinTrackRef.current = false;
      updatePinnedFromScroll();
      return;
    }

    const shouldStickLive =
      pending?.kind === "live" ||
      (pinnedToLiveRef.current && (grew || loading === false));

    if (shouldStickLive) {
      if (order === "newestLast") {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTop = 0;
      }
      pendingScrollRef.current = null;
      skipNextPinTrackRef.current = false;
      pinnedToLiveRef.current = true;
    }
  }, [displayRows, order, loading, updatePinnedFromScroll]);

  const loadPreviousControl =
    hasMore && !loading ? (
      <LoadPreviousButton
        loading={loadingMore}
        onClick={() => {
          void handleLoadPrevious();
        }}
      />
    ) : null;

  return (
    <div
      className="syllabus-page syllabus-my-annotations-page overflow-y-auto overflow-x-hidden h-full"
      dir={getUiDir()}
      ref={pageRef}
    >
      <div
        ref={headerRef}
        className={twMerge(
          "sticky top-0 z-20 bg-background py-1",
          isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
        )}
      >
        <div className="syllabus-my-annotations-inset bg-background">
          <div className="flex flex-row items-start gap-2 justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-3xl">
                {getString("view-tab-my-annotations")}
              </div>
              <p className="text-secondary text-base mt-1">
                {getString("my-annotations-desc")}
              </p>
            </div>
            <OrderToggle order={order} onOrder={handleOrderChange} />
          </div>
        </div>
      </div>
      <GalleryViewportProvider rootRef={pageRef}>
        <div className="syllabus-my-annotations-body syllabus-my-annotations-stream syllabus-my-annotations-inset pt-6 pb-10 flex flex-col gap-6 min-w-0">
          {order === "newestLast" ? loadPreviousControl : null}
          {loading && displayRows.length === 0 ? (
            <p className="text-secondary text-base">
              {getString("my-annotations-load-previous-loading")}
            </p>
          ) : displayRows.length === 0 ? (
            <p className="text-secondary text-base">
              {getString("my-annotations-empty")}
            </p>
          ) : (
            displayGroups.map((group) => (
              <AnnotationStreamGroup
                key={group.key}
                group={group}
                selected={
                  !!group.parent &&
                  (selectedItemIds?.includes(group.parent.id) || false)
                }
                onContextMenu={handleContextMenu}
              />
            ))
          )}
          {order === "newestFirst" ? loadPreviousControl : null}
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
