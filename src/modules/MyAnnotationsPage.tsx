// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { isZotero8OrLater } from "../utils/zotero";
import { getString, getUiDir } from "../utils/locale";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import { renderComponent } from "../utils/react";
import {
  useMyAnnotationsOrder,
  type MyAnnotationsOrder,
} from "./myAnnotationsPrefs";
import { MyAnnotationsMenu } from "./MyAnnotationsMenu";
import { GalleryViewportProvider } from "./galleryVisibility";
import { useItemIdentifierSelection } from "./browsePage";
import type { MagazineTileClick } from "./MagazineTile";
import {
  AnnotationStreamGroup,
  groupAdjacentStreamEntries,
  openAnnotationGroupInReader,
} from "./annotationStream";
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
      className="syllabus-page syllabus-my-annotations-page overflow-y-auto overflow-x-hidden h-full bg-background"
      dir={getUiDir()}
      ref={pageRef}
    >
      <div
        ref={headerRef}
        className={twMerge(
          "sticky top-0 z-20 w-full bg-background py-1",
          isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
        )}
      >
        <div className="container-padded bg-background">
          <div className="flex flex-row items-center gap-2 justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-3xl">
                {getString("view-tab-my-annotations")}
              </div>
              <p className="text-secondary text-base mt-1">
                {getString("my-annotations-desc")}
              </p>
            </div>
            <div className="inline-flex items-center gap-2.5 shrink grow-0">
              <MyAnnotationsMenu order={order} onOrder={handleOrderChange} />
            </div>
          </div>
        </div>
      </div>
      <GalleryViewportProvider rootRef={pageRef}>
        <div className="syllabus-my-annotations-body syllabus-my-annotations-stream container-padded pt-6 pb-10 flex flex-col gap-6 min-w-0">
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
                onClick={(_item, e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openAnnotationGroupInReader(group);
                }}
                onDoubleClick={() => {
                  openAnnotationGroupInReader(group);
                }}
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
