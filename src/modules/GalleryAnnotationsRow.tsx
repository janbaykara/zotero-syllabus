// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getString } from "../utils/locale";
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

export function GalleryAnnotationsSection({
  items,
  keyPrefix,
  sortBy,
  collectionId,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  items: Zotero.Item[];
  keyPrefix: string;
  sortBy: GallerySortBy;
  collectionId: number;
  selectedItemIds: number[] | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  /** Stable across selection re-renders that only change the items array identity. */
  const sortedIdsKey = useMemo(
    () =>
      sortItems(uniqueItems(items), sortBy)
        .map((item) => item.id)
        .join(","),
    [items, sortBy],
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const sortByRef = useRef(sortBy);
  sortByRef.current = sortBy;

  const [partition, setPartition] = useState<AnnotationPartition | null>(null);

  useEffect(() => {
    let cancelled = false;
    const itemsToLoad = sortItems(
      uniqueItems(itemsRef.current),
      sortByRef.current,
    );
    void partitionByAnnotations(itemsToLoad).then((next) => {
      if (!cancelled) {
        setPartition(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sortedIdsKey]);

  if (!partition) {
    return null;
  }

  const { withAnnotations, withoutAnnotations } = partition;

  return (
    <div className="syllabus-gallery-annotations-section flex flex-col min-w-0">
      {withAnnotations.length > 0 ? (
        <div className="syllabus-gallery-annotations-list syllabus-my-annotations-stream">
          {withAnnotations.map(({ item, entries }) => {
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
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
              />
            );
          })}
        </div>
      ) : null}
      {withoutAnnotations.length > 0 ? (
        <section
          className="syllabus-gallery-annotations-empty-section min-w-0"
          data-gallery-group={`${keyPrefix}-no-annotations`}
        >
          <h2 className="syllabus-gallery-annotations-empty-heading">
            {getString("gallery-annotations-none-heading")}
          </h2>
          <div className="syllabus-gallery-grid">
            {withoutAnnotations.map((item) => (
              <GalleryTile
                key={`${keyPrefix}-empty-${item.id}`}
                item={item}
                collectionId={collectionId}
                selected={selectedItemIds?.includes(item.id) || false}
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
