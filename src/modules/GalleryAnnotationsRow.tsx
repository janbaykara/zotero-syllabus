// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getString } from "../utils/locale";
import {
  annotationMatchesColorFilter,
  collectAnnotationColors,
} from "../utils/annotationColors";
import { sortItems } from "../utils/items";
import {
  AnnotationStreamGroup,
  type AnnotationStreamParentGroup,
} from "./annotationStream";
import {
  annotationsStreamForParent,
  type MyAnnotationStreamEntry,
} from "./explorerQueries";
import type { GallerySortBy } from "./gallerySort";
import { GalleryTile } from "./GalleryPage";
import type { MagazineTileClick } from "./MagazineTile";
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
  const emptyItems = showItemsWithoutAnnotations ? withoutAnnotations : [];
  const sortedWith = withAnnotations
    .map(({ item, entries }) => ({
      item,
      entries: entries.filter((entry) =>
        annotationMatchesColorFilter(entry.color, colorFilter),
      ),
    }))
    .filter((row) => row.entries.length > 0);
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
    <div
      className="syllabus-gallery-annotations-section flex flex-col min-w-0"
      style={
        sortedEmpty.length > 0
          ? ({
              /* Fewer tiles than the pane can fit → fewer columns so the row
                 still fills; cover max keeps a lone tile from going full-bleed. */
              "--syllabus-annotations-cover-cols-cap": String(
                sortedEmpty.length,
              ),
            } as JSX.CSSProperties)
          : undefined
      }
    >
      {sortedWith.length > 0 ? (
        <div className="syllabus-gallery-annotations-list syllabus-my-annotations-stream">
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
        </div>
      ) : null}
      {sortedEmpty.length > 0 ? (
        <section
          className="syllabus-gallery-annotations-empty-section min-w-0"
          data-gallery-group={`${keyPrefix}-no-annotations`}
        >
          <h2 className="syllabus-gallery-annotations-empty-heading">
            {getString("gallery-annotations-none-heading")}
          </h2>
          <div className="syllabus-gallery-grid">
            {sortedEmpty.map((item) => (
              <GalleryTile
                key={`${keyPrefix}-empty-${item.id}`}
                item={item}
                collectionId={collectionId}
                showGalleryNote={showGalleryNote}
                selected={selectedItemIds?.includes(item.id) || false}
                chrome={chromeByItemId?.get(item.id)}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
