// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getString } from "../utils/locale";
import {
  annotationMatchesColorFilter,
  collectAnnotationColors,
} from "../utils/annotationColors";
import { isClassNoteItem, sortItems } from "../utils/items";
import {
  AnnotationStreamGroup,
  type AnnotationStreamParentGroup,
} from "./annotationStream";
import {
  annotationsStreamForParent,
  type MyAnnotationStreamEntry,
} from "./explorerQueries";
import type { GallerySortBy } from "./gallerySort";
import type { MagazineTileClick } from "./MagazineTile";
import { CoverStreamSection } from "./coverStream";
import {
  useAnnotationColorFilter,
  useViewQuoteOrder,
} from "./myAnnotationsPrefs";
import type { ReadingTileChrome } from "./readingAssignmentChrome";

type AnnotationPartition = {
  withAnnotations: Array<{
    item: Zotero.Item;
    entries: MyAnnotationStreamEntry[];
  }>;
  withoutAnnotations: Zotero.Item[];
};

async function partitionByAnnotations(
  items: Zotero.Item[],
): Promise<AnnotationPartition> {
  const results = await Promise.all(
    items.map(async (item) => {
      const entries = await annotationsStreamForParent(item);
      return { item, entries };
    }),
  );
  const withAnnotations: AnnotationPartition["withAnnotations"] = [];
  const withoutAnnotations: Zotero.Item[] = [];
  for (const row of results) {
    if (row.entries.length > 0) {
      withAnnotations.push(row);
    } else {
      withoutAnnotations.push(row.item);
    }
  }
  return { withAnnotations, withoutAnnotations };
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

/** Item ids that currently have at least one annotation in the stream. */
export async function collectItemIdsWithAnnotations(
  items: Zotero.Item[],
): Promise<Set<number>> {
  const unique = uniqueItems(items);
  const flags = await Promise.all(
    unique.map(async (item) => {
      const entries = await annotationsStreamForParent(item);
      return entries.length > 0 ? item.id : null;
    }),
  );
  return new Set(flags.filter((id): id is number => id != null));
}

/**
 * When `enabled`, resolves to the set of item ids that have annotations
 * (`null` while loading). When disabled, returns `null` (no filtering).
 */
export function useItemIdsWithAnnotations(
  items: Zotero.Item[],
  enabled: boolean,
): Set<number> | null {
  const idsKey = useMemo(
    () =>
      uniqueItems(items)
        .map((item) => item.id)
        .sort((a, b) => a - b)
        .join(","),
    [items],
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [annotatedIds, setAnnotatedIds] = useState<Set<number> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setAnnotatedIds(null);
      return;
    }
    let cancelled = false;
    setAnnotatedIds(null);
    void collectItemIdsWithAnnotations(itemsRef.current)
      .then((next) => {
        if (!cancelled) {
          setAnnotatedIds(next);
        }
      })
      .catch((err) => {
        ztoolkit.log("useItemIdsWithAnnotations failed", err);
        if (!cancelled) {
          setAnnotatedIds(new Set());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, idsKey]);

  return enabled ? annotatedIds : null;
}

/** Distinct highlight colours present on the given items' annotations. */
export function useExistingAnnotationColors(items: Zotero.Item[]): string[] {
  const idsKey = useMemo(
    () =>
      uniqueItems(items)
        .map((item) => item.id)
        .sort((a, b) => a - b)
        .join(","),
    [items],
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    if (!idsKey) {
      setColors([]);
      return;
    }
    let cancelled = false;
    void Promise.all(
      uniqueItems(itemsRef.current).map((item) =>
        annotationsStreamForParent(item),
      ),
    )
      .then((streams) => {
        if (cancelled) {
          return;
        }
        setColors(
          collectAnnotationColors(streams.flat().map((entry) => entry.color)),
        );
      })
      .catch((err) => {
        ztoolkit.log("useExistingAnnotationColors failed", err);
        if (!cancelled) {
          setColors([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return colors;
}

export function GalleryAnnotationsSection({
  items,
  keyPrefix,
  sortBy,
  collectionId,
  selectedItemIds,
  showItemsWithoutAnnotations = true,
  showGalleryNote = false,
  chromeByItemId,
  colorFilterScope,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  items: Zotero.Item[];
  keyPrefix: string;
  sortBy: GallerySortBy;
  collectionId: number;
  selectedItemIds: number[] | null;
  showItemsWithoutAnnotations?: boolean;
  showGalleryNote?: boolean;
  chromeByItemId?: ReadonlyMap<number, ReadingTileChrome> | null;
  colorFilterScope: string;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  /**
   * Stable across parent re-renders: do not bake sort order into the key —
   * `sortItems(..., "auto")` preserves caller order, which can churn and
   * cancel the partition effect forever (blank annotations gallery).
   */
  const itemsKey = useMemo(
    () =>
      uniqueItems(items)
        .map((item) => item.id)
        .sort((a, b) => a - b)
        .join(","),
    [items],
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const sortByRef = useRef(sortBy);
  sortByRef.current = sortBy;

  const [partition, setPartition] = useState<AnnotationPartition | null>(null);
  const [colorFilter] = useAnnotationColorFilter(colorFilterScope);
  const [quoteOrder] = useViewQuoteOrder(colorFilterScope);

  useEffect(() => {
    let cancelled = false;
    setPartition(null);
    const itemsToLoad = sortItems(
      uniqueItems(itemsRef.current),
      sortByRef.current,
    );
    void partitionByAnnotations(itemsToLoad)
      .then((next) => {
        if (!cancelled) {
          setPartition(next);
        }
      })
      .catch((err) => {
        ztoolkit.log("GalleryAnnotationsSection partition failed", err);
        if (!cancelled) {
          setPartition({
            withAnnotations: [],
            withoutAnnotations: itemsToLoad,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [itemsKey, sortBy]);

  if (!partition) {
    return null;
  }

  const { withAnnotations, withoutAnnotations } = partition;
  // Class notes always stay in the main stream (notepad + blurb), never the
  // “no annotations” cover grid — same idea as Magazine.
  const classNoteStream = withoutAnnotations
    .filter((item) => isClassNoteItem(item))
    .map((item) => ({
      item,
      entries: [] as MyAnnotationStreamEntry[],
    }));
  const emptyItems = (
    showItemsWithoutAnnotations ? withoutAnnotations : []
  ).filter((item) => !isClassNoteItem(item));
  const streamById = new Map(
    [...withAnnotations, ...classNoteStream].map((row) => [row.item.id, row]),
  );
  const orderedStream = sortItems(uniqueItems(items), sortBy)
    .map((item) => streamById.get(item.id))
    .filter((row): row is NonNullable<typeof row> => row != null);
  const sortedWith = orderedStream
    .map(({ item, entries }) => ({
      item,
      entries: isClassNoteItem(item)
        ? entries
        : entries.filter((entry) =>
            annotationMatchesColorFilter(entry.color, colorFilter),
          ),
    }))
    .filter((row) => isClassNoteItem(row.item) || row.entries.length > 0);
  const sortedEmpty = sortItems(emptyItems, sortBy);
  const colorFilterEmpty =
    sortedWith.length === 0 &&
    withAnnotations.length > 0 &&
    colorFilter.length > 0;

  if (sortedWith.length === 0 && sortedEmpty.length === 0) {
    return (
      <p className="syllabus-gallery-annotations-empty text-secondary">
        {getString(
          colorFilterEmpty
            ? "my-annotations-empty-color-filter"
            : "gallery-annotations-empty",
        )}
      </p>
    );
  }

  return (
    <CoverStreamSection
      emptyItems={sortedEmpty}
      emptyHeading={getString("gallery-annotations-none-heading")}
      emptyGroupKey={`${keyPrefix}-no-annotations`}
      collectionId={collectionId}
      selectedItemIds={selectedItemIds}
      showGalleryNote={showGalleryNote}
      chromeByItemId={chromeByItemId}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {sortedWith.map(({ item, entries }) => {
        const group: AnnotationStreamParentGroup = {
          key: `${keyPrefix}-${item.id}`,
          parent: item,
          entries,
        };
        return (
          <AnnotationStreamGroup
            key={group.key}
            group={group}
            selected={selectedItemIds?.includes(item.id) || false}
            collectionId={collectionId}
            showGalleryNote={showGalleryNote}
            chrome={chromeByItemId?.get(item.id)}
            quoteOrder={quoteOrder}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
          />
        );
      })}
    </CoverStreamSection>
  );
}
