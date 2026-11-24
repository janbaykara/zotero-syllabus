// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { RefObject } from "preact";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { LoaderCircle } from "lucide-preact";
import { twMerge } from "tailwind-merge";
import { isZotero8OrLater } from "../utils/zotero";
import { getString, getUiDir } from "../utils/locale";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import { renderComponent } from "@janbaykara/zotero-preact";
import { useDebouncedEffect } from "../utils/react/useDebouncedEffect";
import {
  annotationMatchesColorFilter,
  annotationMatchesTagFilter,
  collectAnnotationColors,
} from "@janbaykara/zotero-annotations";
import {
  ANNOTATION_COLOR_FILTER_FEED,
  ANNOTATION_TAG_FILTER_FEED,
  useAnnotationColorFilter,
  useAnnotationTagFilter,
  useAnnotationsQuoteOrder,
  useMyAnnotationsOrder,
  useMyAnnotationsSearchScope,
  type MyAnnotationsOrder,
} from "./myAnnotationsPrefs";
import { MyAnnotationsMenu } from "./MyAnnotationsMenu";
import { MyAnnotationsSearchMenu } from "./MyAnnotationsSearchMenu";
import { GalleryViewportProvider } from "./galleryVisibility";
import { useItemIdentifierSelection } from "./browsePage";
import type { MagazineTileClick } from "./MagazineTile";
import {
  AnnotationActivityGap,
  AnnotationStreamGroup,
  groupAdjacentStreamEntries,
  openAnnotationGroupInReader,
  type AnnotationStreamParentGroup,
} from "./annotationStream";
import {
  AnnotationSelectionProvider,
  orderedAnnotationIdsFromEntries,
} from "./annotationSelection";
import { AnnotationBatchBar } from "./AnnotationBatchBar";
import {
  annotationsStreamForParent,
  isFulltextStreamEntry,
  isMyAnnotationsSearchActive,
  normalizeMyAnnotationsSearchQuery,
  sortAnnotationsByQuoteOrder,
  useMyAnnotationsStream,
  type MyAnnotationStreamEntry,
} from "./explorerQueries";
import {
  setMyAnnotationsParentItemId,
  useMyAnnotationsParentItemId,
} from "./myAnnotationsIsolation";
import { AnnotationTimelineRail } from "./AnnotationTimelineRail";
import { getCachedItem } from "@janbaykara/zotero-cache";

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

function streamGroupEdgeAdded(
  group: AnnotationStreamParentGroup,
  edge: "start" | "end",
): string | undefined {
  const entry =
    edge === "start"
      ? group.entries[0]
      : group.entries[group.entries.length - 1];
  return entry?.dateAdded || entry?.dateModified;
}

function LoadPreviousButton({
  loading,
  onClick,
  sentinelRef,
}: {
  loading: boolean;
  onClick: () => void;
  sentinelRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <div
      className="syllabus-my-annotations-load-previous-wrap"
      ref={sentinelRef}
    >
      {loading ? (
        <div
          className="syllabus-my-annotations-load-previous-status"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoaderCircle
            size={14}
            className="animate-spin shrink-0"
            aria-hidden="true"
          />
          <span>{getString("my-annotations-load-previous-loading")}</span>
        </div>
      ) : (
        <button
          type="button"
          className="syllabus-my-annotations-load-previous"
          onClick={onClick}
        >
          {getString("my-annotations-load-previous")}
        </button>
      )}
    </div>
  );
}

const NEAR_EDGE_PX = 80;

type ScrollAnchor =
  | { kind: "live" }
  | {
      kind: "anchor";
      /** Keep this annotation's on-screen offset after older rows prepend. */
      annotationId: string;
      offset: number;
    }
  | {
      kind: "height";
      height: number;
      top: number;
    };

/** First annotation intersecting the scroll viewport (for prepend anchoring). */
function captureAnnotationScrollAnchor(
  container: HTMLElement,
): Exclude<ScrollAnchor, { kind: "live" }> {
  const containerTop = container.getBoundingClientRect().top;
  const nodes = Array.from(
    container.querySelectorAll("[data-annotation-id]"),
  ) as HTMLElement[];
  for (const node of nodes) {
    const id = node.getAttribute("data-annotation-id");
    if (!id) {
      continue;
    }
    const rect = node.getBoundingClientRect();
    if (rect.bottom > containerTop + 1) {
      return {
        kind: "anchor",
        annotationId: id,
        offset: rect.top - containerTop,
      };
    }
  }
  return {
    kind: "height",
    height: container.scrollHeight,
    top: container.scrollTop,
  };
}

function restoreScrollAnchor(
  container: HTMLElement,
  anchor: Exclude<ScrollAnchor, { kind: "live" }>,
): void {
  if (anchor.kind === "height") {
    container.scrollTop = anchor.top + (container.scrollHeight - anchor.height);
    return;
  }
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(anchor.annotationId)
      : anchor.annotationId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const node = container.querySelector<HTMLElement>(
    `[data-annotation-id="${escaped}"]`,
  );
  if (!node) {
    return;
  }
  const containerTop = container.getBoundingClientRect().top;
  const nextOffset = node.getBoundingClientRect().top - containerTop;
  container.scrollTop += nextOffset - anchor.offset;
}

export function MyAnnotationsPage({ libraryID }: { libraryID: number }) {
  const parentItemId = useMyAnnotationsParentItemId();
  const [isolatedRows, setIsolatedRows] = useState<
    MyAnnotationStreamEntry[] | null
  >(null);
  const [isolatedLoading, setIsolatedLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchScope, setSearchScope] = useMyAnnotationsSearchScope();
  const applySearchInput = useCallback(
    (value: string, options?: { immediate?: boolean }) => {
      setSearchInput(value);
      const normalized = normalizeMyAnnotationsSearchQuery(value);
      // Clear immediately; paste also commits without waiting for debounce.
      if (!normalized || options?.immediate) {
        setDebouncedQuery(normalized);
      }
    },
    [],
  );
  useDebouncedEffect(
    () => {
      setDebouncedQuery(normalizeMyAnnotationsSearchQuery(searchInput));
    },
    [searchInput],
    300,
  );
  const libraryStream = useMyAnnotationsStream(
    libraryID,
    parentItemId ? "" : debouncedQuery,
    searchScope,
  );

  useEffect(() => {
    if (!parentItemId) {
      setIsolatedRows(null);
      setIsolatedLoading(false);
      return;
    }
    let cancelled = false;
    setIsolatedLoading(true);
    void (async () => {
      const item =
        getCachedItem(parentItemId) || Zotero.Items.get(parentItemId);
      if (!item) {
        if (!cancelled) {
          setIsolatedRows([]);
          setIsolatedLoading(false);
        }
        return;
      }
      try {
        const rows = await annotationsStreamForParent(item);
        if (!cancelled) {
          setIsolatedRows(rows);
          setIsolatedLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsolatedRows([]);
          setIsolatedLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parentItemId]);

  const isolated = parentItemId != null;
  const rows = isolated ? isolatedRows || [] : libraryStream.rows;
  const colors = isolated
    ? collectAnnotationColors(rows.map((row) => row.color))
    : libraryStream.colors;
  const hasMore = isolated ? false : libraryStream.hasMore;
  const loading = isolated ? isolatedLoading : libraryStream.loading;
  const loadingMore = isolated ? false : libraryStream.loadingMore;
  const loadPrevious = libraryStream.loadPrevious;
  const searchActive = !isolated && isMyAnnotationsSearchActive(debouncedQuery);

  const isolatedParent = useMemo(() => {
    if (!parentItemId) {
      return null;
    }
    return (
      getCachedItem(parentItemId) || Zotero.Items.get(parentItemId) || null
    );
  }, [parentItemId]);
  const isolatedTitle = useMemo(() => {
    if (!isolatedParent) {
      return "";
    }
    try {
      return (
        isolatedParent.getDisplayTitle?.() ||
        isolatedParent.getField?.("title") ||
        ""
      );
    } catch {
      return "";
    }
  }, [isolatedParent]);
  const [order, setOrder] = useMyAnnotationsOrder();
  const [quoteOrder] = useAnnotationsQuoteOrder();
  const [colorFilter] = useAnnotationColorFilter(ANNOTATION_COLOR_FILTER_FEED);
  const [tagFilter] = useAnnotationTagFilter(ANNOTATION_TAG_FILTER_FEED);
  const { selectedItemIds } = useItemIdentifierSelection();
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const loadPreviousSentinelRef = useRef<HTMLDivElement>(null);
  const pinnedToLiveRef = useRef(true);
  const pendingScrollRef = useRef<ScrollAnchor | null>({ kind: "live" });
  const prevDisplayRowCountRef = useRef(0);
  const prevStreamRowCountRef = useRef(0);
  const skipNextPinTrackRef = useRef(false);
  /** Set on real user scroll so open/live-stick cannot cascade-load. */
  const userScrolledRef = useRef(false);

  useEffect(() => {
    if (searchActive && !isolated) {
      return;
    }
    pinnedToLiveRef.current = true;
    pendingScrollRef.current = { kind: "live" };
    skipNextPinTrackRef.current = true;
    userScrolledRef.current = false;
  }, [searchActive, isolated, parentItemId]);

  const displayRows = useMemo(
    () =>
      sortStreamRows(rows, order).filter(
        (row) =>
          isFulltextStreamEntry(row) ||
          (annotationMatchesColorFilter(row.color, colorFilter) &&
            annotationMatchesTagFilter(row.tags, tagFilter)),
      ),
    [rows, order, colorFilter, tagFilter],
  );
  const displayGroups = useMemo(
    () => groupAdjacentStreamEntries(displayRows),
    [displayRows],
  );
  const orderedAnnotationIds = useMemo(
    () =>
      displayGroups.flatMap((group) =>
        orderedAnnotationIdsFromEntries(
          sortAnnotationsByQuoteOrder(group.entries, quoteOrder),
        ),
      ),
    [displayGroups, quoteOrder],
  );

  const handleContextMenu = useCallback<MagazineTileClick>((item, e) => {
    void openZoteroItemContextMenu(item, e);
  }, []);

  const scrollToAnnotation = useCallback((annotationId: number) => {
    const page = pageRef.current;
    if (!page) {
      return;
    }
    const target = page.querySelector(
      `[data-annotation-id="${annotationId}"]`,
    ) as HTMLElement | null;
    if (!target) {
      return;
    }
    pinnedToLiveRef.current = false;
    skipNextPinTrackRef.current = true;
    userScrolledRef.current = true;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    queueMicrotask(() => {
      skipNextPinTrackRef.current = false;
    });
  }, []);

  const clearIsolation = useCallback(() => {
    setMyAnnotationsParentItemId(null);
    pinnedToLiveRef.current = true;
    pendingScrollRef.current = { kind: "live" };
    skipNextPinTrackRef.current = true;
    userScrolledRef.current = false;
  }, []);

  const isolateToParent = useCallback((item: Zotero.Item) => {
    try {
      if (!item.isRegularItem?.()) {
        return;
      }
    } catch {
      return;
    }
    setMyAnnotationsParentItemId(item.id);
    pinnedToLiveRef.current = true;
    pendingScrollRef.current = { kind: "live" };
    skipNextPinTrackRef.current = true;
    userScrolledRef.current = false;
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
    const win = page.ownerDocument.defaultView;
    const observer =
      win && typeof win.ResizeObserver === "function"
        ? new win.ResizeObserver(syncStickyTop)
        : null;
    observer?.observe(header);
    win?.addEventListener("resize", syncStickyTop);
    return () => {
      observer?.disconnect();
      win?.removeEventListener("resize", syncStickyTop);
    };
  }, []);

  const handleOrderChange = useCallback(
    (next: MyAnnotationsOrder) => {
      setOrder(next);
      pinnedToLiveRef.current = true;
      pendingScrollRef.current = { kind: "live" };
      skipNextPinTrackRef.current = true;
      userScrolledRef.current = false;
    },
    [setOrder],
  );

  const handleLoadPrevious = useCallback(async () => {
    if (!hasMore || loading || loadingMore) {
      return;
    }
    const el = pageRef.current;
    if (el && order === "newestLast") {
      // newestLast prepends above the viewport — pin a visible annotation.
      // newestFirst appends below — scrollTop can stay as-is.
      pendingScrollRef.current = captureAnnotationScrollAnchor(el);
      skipNextPinTrackRef.current = true;
    }
    await loadPrevious();
  }, [hasMore, loading, loadingMore, loadPrevious, order]);

  useLayoutEffect(() => {
    const el = pageRef.current;
    if (!el) {
      return;
    }
    const pending = pendingScrollRef.current;
    // Stream row count (not filtered display) — filters can hide a whole page
    // and would otherwise leave the prepend anchor stuck forever.
    const streamGrew = rows.length > prevStreamRowCountRef.current;
    const displayGrew = displayRows.length > prevDisplayRowCountRef.current;
    prevStreamRowCountRef.current = rows.length;
    prevDisplayRowCountRef.current = displayRows.length;

    if (pending?.kind === "anchor" || pending?.kind === "height") {
      // Wait until rows actually arrive — loading indicator swap must not
      // clear the anchor or the prepend will jump the viewport to the top.
      if (!streamGrew) {
        // loadPrevious no-op / failed: drop the anchor so layout can proceed.
        if (!loadingMore) {
          pendingScrollRef.current = null;
          skipNextPinTrackRef.current = false;
        }
        return;
      }
      // Keep skipNextPinTrack through the restore scroll so it does not count
      // as user intent.
      restoreScrollAnchor(el, pending);
      pendingScrollRef.current = null;
      updatePinnedFromScroll();
      queueMicrotask(() => {
        skipNextPinTrackRef.current = false;
      });
      return;
    }

    // Only stick when opening/order-change (pending live) or new rows while
    // pinned — never on every render via `loading === false` (that yanked the
    // viewport back to the live edge and killed upward autoload).
    const shouldStickLive =
      pending?.kind === "live" || (pinnedToLiveRef.current && displayGrew);

    if (shouldStickLive) {
      skipNextPinTrackRef.current = true;
      if (order === "newestLast") {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTop = 0;
      }
      pendingScrollRef.current = null;
      pinnedToLiveRef.current = true;
      queueMicrotask(() => {
        skipNextPinTrackRef.current = false;
      });
    }
  }, [displayRows, rows.length, order, loadingMore, updatePinnedFromScroll]);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) {
      return;
    }
    const onScroll = () => {
      if (!skipNextPinTrackRef.current) {
        userScrolledRef.current = true;
      }
      updatePinnedFromScroll();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [updatePinnedFromScroll]);

  // Autoload when the Load-previous control intersects the scrollport after
  // the user has scrolled (IO root = the feed scroller).
  useEffect(() => {
    const root = pageRef.current;
    const target = loadPreviousSentinelRef.current;
    if (!root || !target || !hasMore || loading) {
      return;
    }
    const win = root.ownerDocument.defaultView;
    if (!win || typeof win.IntersectionObserver !== "function") {
      return;
    }
    const observer = new win.IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        if (!userScrolledRef.current || skipNextPinTrackRef.current) {
          return;
        }
        void handleLoadPrevious();
      },
      { root, rootMargin: `${NEAR_EDGE_PX}px`, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, order, handleLoadPrevious, rows.length]);

  const loadPreviousControl = loading ? null : hasMore ? (
    <LoadPreviousButton
      loading={loadingMore}
      sentinelRef={loadPreviousSentinelRef}
      onClick={() => {
        void handleLoadPrevious();
      }}
    />
  ) : rows.length > 0 ? (
    <div className="syllabus-annotations-activity-gap" role="status">
      <span
        className="syllabus-annotations-activity-gap-rule"
        aria-hidden="true"
      />
      <span className="syllabus-annotations-activity-gap-label">
        {getString(
          searchActive ? "my-annotations-end-search" : "my-annotations-end",
        )}
      </span>
      <span
        className="syllabus-annotations-activity-gap-rule"
        aria-hidden="true"
      />
    </div>
  ) : null;

  return (
    <AnnotationSelectionProvider orderedIds={orderedAnnotationIds}>
      <div
        className="syllabus-page syllabus-my-annotations-page h-full bg-background flex flex-col min-h-0"
        dir={getUiDir()}
      >
        <div
          className="syllabus-my-annotations-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          ref={pageRef}
        >
          <div className="syllabus-my-annotations-layout">
            <aside className="syllabus-my-annotations-layout-minimap">
              <AnnotationTimelineRail
                entries={displayRows}
                onSelect={scrollToAnnotation}
                scrollRootRef={pageRef}
              />
            </aside>
            <div className="syllabus-my-annotations-layout-main">
              <div
                ref={headerRef}
                className={twMerge(
                  "sticky top-0 z-20 w-full bg-background py-1",
                  isZotero8OrLater() ? "pt-4 md:pt-8" : "pt-8",
                )}
              >
                <div className="syllabus-my-annotations-main-pad bg-background">
                  <div className="flex flex-row items-center gap-2 justify-between">
                    <div className="min-w-0 shrink">
                      <div className="font-semibold text-3xl min-w-0">
                        {isolated && isolatedTitle
                          ? getString("my-annotations-isolated-for", {
                              args: { title: isolatedTitle },
                            })
                          : getString("view-tab-my-annotations")}
                      </div>
                      {isolated ? (
                        <button
                          type="button"
                          className="syllabus-my-annotations-clear-isolation text-accent-blue text-base mt-1 border-0 bg-transparent cursor-pointer p-0 text-left min-w-0 max-w-full hover:underline"
                          onClick={clearIsolation}
                        >
                          {getString("my-annotations-show-all-items")}
                        </button>
                      ) : (
                        <p className="text-secondary text-base mt-1">
                          {getString("my-annotations-desc")}
                        </p>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-2.5 shrink grow-0">
                      {!isolated ? (
                        <MyAnnotationsSearchMenu
                          searchInput={searchInput}
                          onSearchInput={applySearchInput}
                          searchScope={searchScope}
                          onSearchScope={setSearchScope}
                          searchActive={searchActive}
                        />
                      ) : null}
                      <MyAnnotationsMenu
                        order={order}
                        onOrder={handleOrderChange}
                        colors={colors}
                        libraryID={libraryID}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <GalleryViewportProvider rootRef={pageRef}>
                <div className="syllabus-my-annotations-main-pad pt-6 pb-10">
                  <div className="syllabus-my-annotations-body syllabus-my-annotations-stream flex flex-col gap-6 min-w-0">
                    {order === "newestLast" ? loadPreviousControl : null}
                    {loading && rows.length === 0 ? (
                      <p className="text-secondary text-base">
                        {getString("my-annotations-load-previous-loading")}
                      </p>
                    ) : displayRows.length === 0 ? (
                      <p className="text-secondary text-base">
                        {getString(
                          searchActive
                            ? "my-annotations-empty-search"
                            : rows.length === 0
                              ? "my-annotations-empty"
                              : colorFilter.length > 0 && tagFilter.length > 0
                                ? "my-annotations-empty-filters"
                                : tagFilter.length > 0
                                  ? "my-annotations-empty-tag-filter"
                                  : "my-annotations-empty-color-filter",
                        )}
                      </p>
                    ) : (
                      displayGroups.map((group, i) => {
                        const prev = i > 0 ? displayGroups[i - 1] : null;
                        return (
                          <Fragment key={group.key}>
                            {quoteOrder === "dateAdded" && prev ? (
                              <AnnotationActivityGap
                                from={streamGroupEdgeAdded(prev, "end")}
                                to={streamGroupEdgeAdded(group, "start")}
                              />
                            ) : null}
                            <AnnotationStreamGroup
                              group={group}
                              selected={
                                !!group.parent &&
                                (selectedItemIds?.includes(group.parent.id) ||
                                  false)
                              }
                              searchQuery={isolated ? "" : debouncedQuery}
                              richText
                              onClick={(_item, e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Click a cover isolates the feed to that book.
                                if (group.parent && !isolated) {
                                  isolateToParent(group.parent);
                                  return;
                                }
                                openAnnotationGroupInReader(group);
                              }}
                              onDoubleClick={() => {
                                openAnnotationGroupInReader(group);
                              }}
                              onContextMenu={handleContextMenu}
                            />
                          </Fragment>
                        );
                      })
                    )}
                    {order === "newestFirst" ? loadPreviousControl : null}
                  </div>
                </div>
              </GalleryViewportProvider>
            </div>
            <div
              className="syllabus-my-annotations-layout-balance"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="syllabus-annotation-batch-dock shrink-0">
          <div className="container-padded">
            <AnnotationBatchBar libraryID={libraryID} />
          </div>
        </div>
      </div>
    </AnnotationSelectionProvider>
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
