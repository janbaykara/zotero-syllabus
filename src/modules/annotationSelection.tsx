// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, createContext } from "preact";
import type { ComponentChildren } from "preact";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";

export type AnnotationSelectionApi = {
  /** False when rendered outside an AnnotationSelectionProvider. */
  enabled: boolean;
  selectedIds: ReadonlySet<number>;
  /**
   * Selected annotation ids in stream display order (not click order).
   * Empty when nothing is selected.
   */
  selectedOrderedIds: readonly number[];
  selectionActive: boolean;
  isSelected: (id: number) => boolean;
  /** Toggle one id; with shiftKey, select the contiguous range to the last anchor. */
  select: (id: number, shiftKey?: boolean) => void;
  clear: () => void;
};

type OrderSegment = {
  order: number;
  ids: readonly number[];
};

type OrderRegistryApi = {
  register: (key: string, order: number, ids: readonly number[]) => void;
  unregister: (key: string) => void;
};

const AnnotationSelectionContext = createContext<AnnotationSelectionApi | null>(
  null,
);

const AnnotationOrderRegistryContext = createContext<OrderRegistryApi | null>(
  null,
);

function rangeIds(
  orderedIds: readonly number[],
  fromId: number,
  toId: number,
): number[] {
  const from = orderedIds.indexOf(fromId);
  const to = orderedIds.indexOf(toId);
  if (from < 0 || to < 0) {
    return [toId];
  }
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  return orderedIds.slice(start, end + 1);
}

function mergeSegmentIds(segments: Map<string, OrderSegment>): number[] {
  return [...segments.entries()]
    .sort((a, b) => {
      const orderDiff = a[1].order - b[1].order;
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return a[0].localeCompare(b[0]);
    })
    .flatMap(([, segment]) => segment.ids);
}

/**
 * Provides annotation multi-select. Pass `orderedIds` for a single stream
 * (Annotation Feed), or omit it and let child sections register segments via
 * `useRegisterAnnotationSelectionOrder` (Syllabus / Gallery with many groups).
 */
export function AnnotationSelectionProvider({
  orderedIds: orderedIdsProp,
  children,
}: {
  /** Visible annotation item ids in stream display order (excludes full-text hits). */
  orderedIds?: readonly number[];
  children: ComponentChildren;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [segments, setSegments] = useState<Map<string, OrderSegment>>(
    () => new Map(),
  );
  const lastAnchorRef = useRef<number | null>(null);

  const register = useCallback(
    (key: string, order: number, ids: readonly number[]) => {
      setSegments((prev) => {
        const existing = prev.get(key);
        if (
          existing &&
          existing.order === order &&
          existing.ids.length === ids.length &&
          existing.ids.every((id, index) => id === ids[index])
        ) {
          return prev;
        }
        const next = new Map(prev);
        next.set(key, { order, ids: [...ids] });
        return next;
      });
    },
    [],
  );

  const unregister = useCallback((key: string) => {
    setSegments((prev) => {
      if (!prev.has(key)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const registry = useMemo<OrderRegistryApi>(
    () => ({ register, unregister }),
    [register, unregister],
  );

  const orderedIds = useMemo(() => {
    if (orderedIdsProp) {
      return orderedIdsProp;
    }
    return mergeSegmentIds(segments);
  }, [orderedIdsProp, segments]);

  const orderedIdsRef = useRef(orderedIds);
  orderedIdsRef.current = orderedIds;

  const orderedKey = orderedIds.join(",");
  useEffect(() => {
    const allowed = new Set(
      orderedKey ? orderedKey.split(",").map(Number) : [],
    );
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<number>();
      for (const id of prev) {
        if (allowed.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      if (!changed && next.size === prev.size) {
        return prev;
      }
      if (
        lastAnchorRef.current != null &&
        !allowed.has(lastAnchorRef.current)
      ) {
        lastAnchorRef.current = null;
      }
      return next;
    });
  }, [orderedKey]);

  const clear = useCallback(() => {
    lastAnchorRef.current = null;
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const select = useCallback((id: number, shiftKey = false) => {
    const ordered = orderedIdsRef.current;
    if (!ordered.includes(id)) {
      return;
    }
    if (shiftKey && lastAnchorRef.current != null) {
      const ids = rangeIds(ordered, lastAnchorRef.current, id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const rangeId of ids) {
          next.add(rangeId);
        }
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    lastAnchorRef.current = id;
  }, []);

  useEffect(() => {
    if (selectedIds.size === 0) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      const target = event.target as Element | null;
      if (
        target?.closest?.(
          "input, textarea, select, editable-text, .syllabus-annotation-batch-popover",
        )
      ) {
        return;
      }
      event.preventDefault();
      clear();
    };
    const doc =
      typeof document !== "undefined"
        ? document
        : Zotero.getMainWindow()?.document;
    doc?.addEventListener("keydown", onKeyDown, true);
    return () => doc?.removeEventListener("keydown", onKeyDown, true);
  }, [selectedIds.size, clear]);

  const selectedOrderedIds = useMemo(() => {
    if (selectedIds.size === 0) {
      return EMPTY_ORDERED;
    }
    return orderedIds.filter((id) => selectedIds.has(id));
  }, [orderedIds, selectedIds]);

  const value = useMemo<AnnotationSelectionApi>(() => {
    const selected = selectedIds;
    return {
      enabled: true,
      selectedIds: selected,
      selectedOrderedIds,
      selectionActive: selected.size > 0,
      isSelected: (id: number) => selected.has(id),
      select,
      clear,
    };
  }, [selectedIds, selectedOrderedIds, select, clear]);

  return (
    <AnnotationOrderRegistryContext.Provider value={registry}>
      <AnnotationSelectionContext.Provider value={value}>
        {children}
      </AnnotationSelectionContext.Provider>
    </AnnotationOrderRegistryContext.Provider>
  );
}

/**
 * Register a stream segment’s annotation ids with a parent
 * `AnnotationSelectionProvider` that did not pass a fixed `orderedIds` list.
 */
export function useRegisterAnnotationSelectionOrder(
  key: string,
  order: number,
  ids: readonly number[],
): void {
  const registry = useContext(AnnotationOrderRegistryContext);
  const idsKey = ids.join(",");
  useEffect(() => {
    if (!registry) {
      return;
    }
    registry.register(key, order, ids);
    return () => registry.unregister(key);
  }, [registry, key, order, idsKey]);
}

export function useAnnotationSelection(): AnnotationSelectionApi {
  const ctx = useContext(AnnotationSelectionContext);
  if (!ctx) {
    return {
      enabled: false,
      selectedIds: EMPTY_SET,
      selectedOrderedIds: EMPTY_ORDERED,
      selectionActive: false,
      isSelected: () => false,
      select: () => {},
      clear: () => {},
    };
  }
  return ctx;
}

const EMPTY_SET: ReadonlySet<number> = new Set();
const EMPTY_ORDERED: readonly number[] = [];

/** Annotation (non-fulltext) ids in the order they appear in the stream. */
export function orderedAnnotationIdsFromEntries(
  entries: ReadonlyArray<{ id: number; kind?: string }>,
): number[] {
  const out: number[] = [];
  for (const entry of entries) {
    if (entry.kind === "fulltext") {
      continue;
    }
    out.push(entry.id);
  }
  return out;
}
