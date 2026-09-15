// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useCallback, useMemo } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { openItemBestAttachment } from "../utils/items";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import type { ItemSyllabusAssignment } from "../utils/schemas";
import type { GalleryLayout } from "./galleryLayout";
import type { ItemDensity } from "./react-zotero-sync/itemDensity";
import { GalleryTile } from "./GalleryPage";
import { MagazineGrid, type MagazineTileClick } from "./MagazineTile";
import type { MagazineSectionTemplate } from "./magazineDesks";
import type { ReadingTileChrome } from "./readingAssignmentChrome";
import { SyllabusItemCard } from "./SyllabusItemCard";
import { SyllabusManager } from "./syllabus";
import { getString } from "../utils/locale";

export type ReadingLayoutRow = {
  key: string;
  item: Zotero.Item;
  collectionId: number;
  assignment?: ItemSyllabusAssignment;
  classNumber?: number | null;
  slim?: boolean;
  /** Custom checkbox handler (e.g. confirm + unpin for pinned items). */
  onReaderCheck?: () => void | Promise<void>;
  /** Class / syllabus name for cover & magazine tiles. */
  contextLabel?: string;
};

/** Syllabus and/or class label for cover & magazine tiles. */
export function readingContextLabel(opts: {
  collectionId: number;
  classNumber?: number | null;
  classTitle?: string;
  collectionName?: string;
}): string {
  const parts: string[] = [];
  const collectionName = opts.collectionName?.trim();
  if (collectionName) {
    parts.push(collectionName);
  }
  const classTitle = opts.classTitle?.trim();
  if (classTitle) {
    parts.push(classTitle);
  } else if (opts.classNumber != null) {
    const { singularCapitalized } = SyllabusManager.getNomenclatureFormatted(
      opts.collectionId,
    );
    parts.push(
      getString("menu-class-label", {
        args: {
          nomenclature: singularCapitalized,
          number: opts.classNumber,
        },
      }),
    );
  }
  return parts.join(" · ");
}

/**
 * Shared Card / Cover / Magazine body for Reading Schedule and locked syllabus.
 */
export function ReadingItemsLayout({
  layout,
  density,
  rows,
  readerMode = false,
  isLocked = true,
  template = "strip",
  showPriority = true,
  className,
  onItemClick,
}: {
  layout: GalleryLayout;
  density: ItemDensity;
  rows: ReadingLayoutRow[];
  readerMode?: boolean;
  isLocked?: boolean;
  template?: MagazineSectionTemplate;
  /** Cover/magazine priority badge (off on Reading Schedule / Pinned). */
  showPriority?: boolean;
  className?: string;
  onItemClick?: (item: Zotero.Item, collectionId: number) => void;
}) {
  const handleClick = useCallback<MagazineTileClick>(
    (item, e) => {
      e.stopPropagation();
      const row = rows.find((r) => r.item.id === item.id);
      if (row && onItemClick) {
        onItemClick(item, row.collectionId);
        return;
      }
      try {
        ztoolkit.getGlobal("ZoteroPane").selectItem(item.id);
      } catch (error) {
        ztoolkit.log("Error selecting reading layout item:", error);
      }
    },
    [onItemClick, rows],
  );

  const handleDoubleClick = useCallback((item: Zotero.Item) => {
    openItemBestAttachment(item);
  }, []);

  const handleContextMenu = useCallback<MagazineTileClick>((item, e) => {
    void openZoteroItemContextMenu(item, e);
  }, []);

  const chromeByItemId = useMemo(() => {
    const map = new Map<number, ReadingTileChrome>();
    for (const row of rows) {
      map.set(row.item.id, {
        collectionId: row.collectionId,
        assignment: row.assignment,
        readerMode: readerMode || Boolean(row.onReaderCheck),
        onReaderCheck: row.onReaderCheck,
        contextLabel: row.contextLabel,
        showPriority,
      });
    }
    return map;
  }, [rows, readerMode, showPriority]);

  if (rows.length === 0) {
    return null;
  }

  if (layout === "cover") {
    return (
      <div className={twMerge("syllabus-gallery-grid", className)}>
        {rows.map((row) => (
          <GalleryTile
            key={row.key}
            item={row.item}
            selected={false}
            chrome={chromeByItemId.get(row.item.id)}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>
    );
  }

  if (layout === "magazine") {
    return (
      <div className={className}>
        <MagazineGrid
          items={rows.map((row) => row.item)}
          keyPrefix={rows[0]?.key || "reading"}
          sortBy="auto"
          template={template}
          selectedItemIds={null}
          chromeByItemId={chromeByItemId}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        "flex flex-col",
        density !== "expanded" ? "gap-2" : "gap-4",
        className,
      )}
    >
      {rows.map((row) => {
        if (!row.assignment?.id) {
          return null;
        }
        const priority = row.assignment.priority || "";
        return (
          <SyllabusItemCard
            key={row.key}
            item={row.item}
            collectionId={row.collectionId}
            classNumber={row.classNumber ?? undefined}
            assignment={row.assignment}
            slim={
              row.slim ??
              (density !== "expanded" || !priority || priority === "optional")
            }
            density={density}
            readerMode={readerMode || Boolean(row.onReaderCheck)}
            onReaderCheck={row.onReaderCheck}
            isLocked={isLocked}
            onClick={
              onItemClick
                ? (item) => onItemClick(item, row.collectionId)
                : undefined
            }
            onContextMenu={(item, e) => {
              void openZoteroItemContextMenu(item, e);
            }}
            className={onItemClick ? "cursor-pointer" : undefined}
          />
        );
      })}
    </div>
  );
}
