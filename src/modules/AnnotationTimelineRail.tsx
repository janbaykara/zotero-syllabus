// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { RefObject } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { getString, getUiDir } from "../utils/locale";
import { parseItemDateMs, toLocalDateKey } from "../utils/dates";
import type { MyAnnotationStreamEntry } from "./explorerQueries";

export type AnnotationTimelineGroup = {
  /** First annotation id in this consecutive date+parent run (scroll target). */
  id: number;
  dateKey: string;
  dateLabel: string;
  parentKey: string;
  title: string;
};

function parentTitle(entry: MyAnnotationStreamEntry): string {
  const parent = entry.parent;
  if (!parent) {
    return getString("my-annotations-timeline-untitled");
  }
  try {
    const title =
      parent.getDisplayTitle?.() || parent.getField?.("title") || "";
    const trimmed = String(title || "").trim();
    if (trimmed) {
      return trimmed;
    }
  } catch {
    // Fall through.
  }
  return getString("my-annotations-timeline-untitled");
}

function parentKey(entry: MyAnnotationStreamEntry): string {
  const parent = entry.parent;
  if (parent && typeof parent.id === "number" && parent.id > 0) {
    return `item:${parent.id}`;
  }
  return `orphan:${entry.id}`;
}

function zoteroLocale(): string {
  try {
    if (typeof Zotero !== "undefined" && Zotero.locale) {
      return Zotero.locale;
    }
  } catch {
    // Tests / early startup.
  }
  return "en-US";
}

function dateLabelForDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat(zoteroLocale(), {
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return toLocalDateKey(date);
  }
}

function yearKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 4);
}

function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function monthLabelForKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) {
    return monthKey;
  }
  const date = new Date(year, month - 1, 1);
  try {
    // Year is shown as its own heading; keep month-only here.
    return new Intl.DateTimeFormat(zoteroLocale(), {
      month: "long",
    }).format(date);
  } catch {
    return monthKey;
  }
}

/** Absolute month distance between `YYYY-MM` keys (0 = same month). */
function monthDistance(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  if (!ay || !am || !by || !bm) {
    return 0;
  }
  return Math.abs(ay * 12 + am - (by * 12 + bm));
}

/** Absolute year distance between `YYYY` keys (0 = same year). */
function yearDistance(a: string, b: string): number {
  const ay = Number(a);
  const by = Number(b);
  if (!ay || !by) {
    return 0;
  }
  return Math.abs(ay - by);
}

/**
 * Collapse the stream into date headers + one row per parent per day.
 * Same calendar day → one date label; each parent item listed at most once that day.
 */
export function buildAnnotationTimelineGroups(
  entries: MyAnnotationStreamEntry[],
): AnnotationTimelineGroup[] {
  const groups: AnnotationTimelineGroup[] = [];
  const seen = new Set<number>();
  const seenParentOnDate = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    const ms = parseItemDateMs(entry.dateAdded || entry.dateModified);
    if (!ms) {
      continue;
    }
    const date = new Date(ms);
    const dateKey = toLocalDateKey(date);
    const key = parentKey(entry);
    const dayParent = `${dateKey}\0${key}`;
    if (seenParentOnDate.has(dayParent)) {
      continue;
    }
    seenParentOnDate.add(dayParent);
    groups.push({
      id: entry.id,
      dateKey,
      dateLabel: dateLabelForDate(date),
      parentKey: key,
      title: parentTitle(entry),
    });
  }
  return groups;
}

function annotationDateMap(
  entries: MyAnnotationStreamEntry[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const entry of entries) {
    const ms = parseItemDateMs(entry.dateAdded || entry.dateModified);
    if (!ms) {
      continue;
    }
    map.set(entry.id, toLocalDateKey(new Date(ms)));
  }
  return map;
}

/** Date whose annotation sits nearest the upper focus line of the scrollport. */
function activeDateFromScroll(
  root: HTMLElement,
  idToDate: Map<number, string>,
): string | null {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.height <= 0) {
    return null;
  }
  const focusY = rootRect.top + Math.min(140, rootRect.height * 0.28);
  let bestKey: string | null = null;
  let bestDist = Infinity;
  let firstKey: string | null = null;
  let lastKey: string | null = null;

  for (const node of root.querySelectorAll("[data-annotation-id]")) {
    const el = node as HTMLElement;
    const id = Number(el.getAttribute("data-annotation-id"));
    const dateKey = idToDate.get(id);
    if (!dateKey) {
      continue;
    }
    if (!firstKey) {
      firstKey = dateKey;
    }
    lastKey = dateKey;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < rootRect.top || rect.top > rootRect.bottom) {
      continue;
    }
    const dist = Math.abs(rect.top - focusY);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = dateKey;
    }
  }

  if (bestKey) {
    return bestKey;
  }
  // Past the last / before the first annotation in the viewport.
  const maxScroll = root.scrollHeight - root.clientHeight;
  if (maxScroll <= 0) {
    return firstKey;
  }
  if (root.scrollTop <= 4) {
    return firstKey;
  }
  if (root.scrollTop >= maxScroll - 4) {
    return lastKey;
  }
  return firstKey;
}

/** Keep the rail’s scroll progress aligned with the feed scroller. */
function syncRailScroll(root: HTMLElement, rail: HTMLElement): void {
  const pageMax = root.scrollHeight - root.clientHeight;
  const railMax = rail.scrollHeight - rail.clientHeight;
  if (railMax <= 0) {
    rail.scrollTop = 0;
    return;
  }
  if (pageMax <= 0) {
    rail.scrollTop = 0;
    return;
  }
  rail.scrollTop = (root.scrollTop / pageMax) * railMax;
}

export function AnnotationTimelineRail({
  entries,
  onSelect,
  scrollRootRef,
  className,
}: {
  entries: MyAnnotationStreamEntry[];
  onSelect: (annotationId: number) => void;
  /** Feed scroller whose position the rail mirrors. */
  scrollRootRef: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const railRef = useRef<HTMLElement>(null);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const uiDir = getUiDir();
  const collapseGlyph = uiDir === "rtl" ? ">>" : "<<";
  const expandGlyph = uiDir === "rtl" ? "<<" : ">>";

  const groups = useMemo(
    () => buildAnnotationTimelineGroups(entries),
    [entries],
  );

  const idToDate = useMemo(() => annotationDateMap(entries), [entries]);

  const rows = useMemo(() => {
    type TimelineRow =
      | { kind: "gap"; key: string; scope: "year" | "month" }
      | { kind: "year"; key: string; label: string }
      | { kind: "month"; key: string; label: string }
      | {
          kind: "date-block";
          key: string;
          label: string;
          titles: AnnotationTimelineGroup[];
        };
    const out: TimelineRow[] = [];
    let lastDate = "";
    let lastMonth = "";
    let lastYear = "";
    let openBlock: Extract<TimelineRow, { kind: "date-block" }> | null = null;

    const flushBlock = () => {
      if (openBlock) {
        out.push(openBlock);
        openBlock = null;
      }
    };

    for (const group of groups) {
      const yearKey = yearKeyFromDateKey(group.dateKey);
      const monthKey = monthKeyFromDateKey(group.dateKey);

      if (yearKey !== lastYear) {
        flushBlock();
        const yearsSkipped = lastYear
          ? yearDistance(lastYear, yearKey) > 1
          : false;
        if (yearsSkipped) {
          out.push({
            kind: "gap",
            key: `y-${lastYear}..${yearKey}`,
            scope: "year",
          });
        }
        // Month gap across a year boundary only when years are adjacent
        // (a year *** already covers multi-year jumps).
        if (
          lastMonth &&
          !yearsSkipped &&
          monthDistance(lastMonth, monthKey) > 1
        ) {
          out.push({
            kind: "gap",
            key: `m-${lastMonth}..${monthKey}`,
            scope: "month",
          });
        }
        lastYear = yearKey;
        lastMonth = "";
        out.push({
          kind: "year",
          key: yearKey,
          label: yearKey,
        });
      }

      if (monthKey !== lastMonth) {
        flushBlock();
        if (lastMonth && monthDistance(lastMonth, monthKey) > 1) {
          out.push({
            kind: "gap",
            key: `m-${lastMonth}..${monthKey}`,
            scope: "month",
          });
        }
        lastMonth = monthKey;
        out.push({
          kind: "month",
          key: monthKey,
          label: monthLabelForKey(monthKey),
        });
      }

      if (group.dateKey !== lastDate) {
        flushBlock();
        lastDate = group.dateKey;
        openBlock = {
          kind: "date-block",
          key: group.dateKey,
          label: group.dateLabel,
          titles: [],
        };
      }
      openBlock?.titles.push(group);
    }
    flushBlock();
    return out;
  }, [groups]);

  const activeYearKey = activeDateKey
    ? yearKeyFromDateKey(activeDateKey)
    : null;
  const activeMonthKey = activeDateKey
    ? monthKeyFromDateKey(activeDateKey)
    : null;

  useEffect(() => {
    const root = scrollRootRef.current;
    const rail = railRef.current;
    if (!root || !rail || groups.length < 2 || collapsed) {
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const nextDate = activeDateFromScroll(root, idToDate);
      setActiveDateKey((prev) => (prev === nextDate ? prev : nextDate));
      // Progress first so end↔end matches; then nudge if the active date clipped.
      syncRailScroll(root, rail);
      if (nextDate) {
        const dateEl = rail.querySelector(
          `[data-timeline-date="${nextDate}"]`,
        ) as HTMLElement | null;
        if (dateEl) {
          const railRect = rail.getBoundingClientRect();
          const dateRect = dateEl.getBoundingClientRect();
          if (dateRect.top < railRect.top + 4) {
            rail.scrollTop += dateRect.top - railRect.top - 4;
          } else if (dateRect.bottom > railRect.bottom - 4) {
            rail.scrollTop += dateRect.bottom - railRect.bottom + 4;
          }
        }
      }
    };
    const onScroll = () => {
      if (frame) {
        return;
      }
      frame =
        root.ownerDocument.defaultView?.requestAnimationFrame(update) ?? 0;
    };

    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    const win = root.ownerDocument.defaultView;
    win?.addEventListener("resize", onScroll);
    return () => {
      root.removeEventListener("scroll", onScroll);
      win?.removeEventListener("resize", onScroll);
      if (frame && win) {
        win.cancelAnimationFrame(frame);
      }
    };
  }, [scrollRootRef, idToDate, groups.length, entries.length, collapsed]);

  if (groups.length < 2) {
    return null;
  }

  return (
    <div
      className={twMerge(
        "syllabus-my-annotations-minimap-shell",
        collapsed && "is-collapsed",
        className,
      )}
      dir={uiDir}
    >
      <button
        type="button"
        className="syllabus-my-annotations-minimap-toggle"
        aria-expanded={!collapsed}
        aria-controls="syllabus-my-annotations-timeline-rail"
        title={getString(
          collapsed
            ? "my-annotations-timeline-expand"
            : "my-annotations-timeline-collapse",
        )}
        aria-label={getString(
          collapsed
            ? "my-annotations-timeline-expand"
            : "my-annotations-timeline-collapse",
        )}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        {collapsed ? expandGlyph : collapseGlyph}
      </button>
      <nav
        id="syllabus-my-annotations-timeline-rail"
        ref={railRef}
        className="syllabus-my-annotations-timeline-rail"
        aria-label={getString("my-annotations-timeline-aria")}
        aria-hidden={collapsed}
        inert={collapsed || undefined}
      >
        <ol className="syllabus-my-annotations-timeline-list">
          {rows.map((row) => {
            if (row.kind === "gap") {
              return (
                <li
                  key={`gap-${row.key}`}
                  className={twMerge(
                    "syllabus-my-annotations-timeline-gap",
                    row.scope === "year" && "is-year-gap",
                  )}
                  aria-label={getString(
                    row.scope === "year"
                      ? "my-annotations-timeline-year-gap"
                      : "my-annotations-timeline-gap",
                  )}
                >
                  ***
                </li>
              );
            }
            if (row.kind === "year") {
              return (
                <li
                  key={`year-${row.key}`}
                  data-timeline-year={row.key}
                  className={twMerge(
                    "syllabus-my-annotations-timeline-year",
                    activeYearKey === row.key && "is-active",
                  )}
                >
                  {row.label}
                </li>
              );
            }
            if (row.kind === "month") {
              return (
                <li
                  key={`month-${row.key}`}
                  data-timeline-month={row.key}
                  className={twMerge(
                    "syllabus-my-annotations-timeline-month",
                    activeMonthKey === row.key && "is-active",
                  )}
                >
                  {row.label}
                </li>
              );
            }
            return (
              <li
                key={`date-${row.key}`}
                data-timeline-date={row.key}
                className={twMerge(
                  "syllabus-my-annotations-timeline-date-block",
                  activeDateKey === row.key && "is-active",
                )}
              >
                <div
                  className={twMerge(
                    "syllabus-my-annotations-timeline-date",
                    activeDateKey === row.key && "is-active",
                  )}
                >
                  {row.label}
                </div>
                <ul className="syllabus-my-annotations-timeline-date-titles">
                  {row.titles.map((title) => (
                    <li
                      key={`${title.dateKey}-${title.parentKey}-${title.id}`}
                      className="syllabus-my-annotations-timeline-item"
                    >
                      <button
                        type="button"
                        className="syllabus-my-annotations-timeline-mark"
                        title={title.title}
                        onClick={() => onSelect(title.id)}
                      >
                        <span className="syllabus-my-annotations-timeline-title">
                          {title.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
