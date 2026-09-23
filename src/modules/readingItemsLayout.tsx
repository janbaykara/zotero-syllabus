// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { JSX } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { openItemBestAttachment } from "../utils/items";
import { openZoteroItemContextMenu } from "../utils/itemContextMenu";
import type { ItemSyllabusAssignment } from "../utils/schemas";
import {
  readingContentWidthClass,
  readingItemsPackClass,
  readingItemsPackMode,
  readingTilesFitCount,
  READING_TILE_GAP,
  readingTileWidthCss,
  type GalleryLayout,
  type ReadingItemsPackMode,
} from "./galleryLayout";
import type { ItemDensity } from "./react-zotero-sync/itemDensity";
import { GalleryTile } from "./GalleryPage";
import type { MagazineTileClick } from "./MagazineTile";
import { MagazineItems } from "./MagazineItems";
import { ExplorerMagazineRail } from "./ExplorerMagazineRail";
import type { MagazineSectionTemplate } from "./magazineDesks";
import type { MagazinePacking } from "./magazinePacking";
import type { ReadingTileChrome } from "./readingAssignmentChrome";
import { GalleryAnnotationsSection } from "./GalleryAnnotationsRow";
import { useBooleanPref } from "./react-zotero-sync/booleanPref";
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

export function useReadingItemsPack(
  layout: GalleryLayout,
  itemCount: number,
  enabled: boolean,
): {
  wrapRef: preact.RefObject<HTMLDivElement>;
  pack: ReadingItemsPackMode;
} {
  const wrapRef = useRef<HTMLDivElement>(null!);
  const [fitCount, setFitCount] = useState(4);

  useEffect(() => {
    if (!enabled || layout === "card" || itemCount === 0) {
      return;
    }
    const el = wrapRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const page = el.closest(".syllabus-page") as HTMLElement | null;
      const width = page?.clientWidth || el.parentElement?.clientWidth || 0;
      // rem size is effectively 16px in Zotero chrome; avoid fragile DOM null typing.
      setFitCount(readingTilesFitCount(width, 16));
    };
    measure();
    const win = el.ownerDocument.defaultView;
    if (!win) {
      return;
    }
    win.addEventListener("resize", measure);
    let observer: ResizeObserver | null = null;
    if (typeof win.ResizeObserver === "function") {
      observer = new win.ResizeObserver(measure);
      const page = el.closest(".syllabus-page");
      observer.observe(page || el);
    }
    return () => {
      win.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [enabled, layout, itemCount]);

  return {
    wrapRef,
    pack: readingItemsPackMode(itemCount, fitCount),
  };
}

/**
 * Shared Card / Cover / Annotations / Magazine body for Reading Schedule
 * and locked syllabus.
 */
export function ReadingItemsLayout({
  layout,
  density,
  rows,
  readerMode = false,
  isLocked = true,
  template = "strip",
  showPriority = true,
  /** Home shelves: horizontal scroll instead of wrapping pack grid. */
  coverRail = false,
  /** Home Upcoming deadlines Magazine: Cover + Blurb rail. */
  magazineRail = false,
  /** Gallery / Reading Schedule Magazine packing (ignored when magazineRail). */
  magazinePacking = "packed" as MagazinePacking,
  colorFilterScope,
  className,
  onItemClick,
}: {
  layout: GalleryLayout;
  density: ItemDensity;
  rows: ReadingLayoutRow[];
  readerMode?: boolean;
  isLocked?: boolean;
  template?: MagazineSectionTemplate;
  /** Cover/magazine priority badge (off on Pinned; Reading Schedule Cover shows it). */
  showPriority?: boolean;
  coverRail?: boolean;
  magazineRail?: boolean;
  magazinePacking?: MagazinePacking;
  colorFilterScope?: string;
  className?: string;
  onItemClick?: (item: Zotero.Item, collectionId: number) => void;
}) {
  const [showItemsWithoutAnnotations] = useBooleanPref(
    "galleryShowItemsWithoutAnnotations",
  );
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

  const usePack =
    layout !== "card" &&
    layout !== "annotations" &&
    !coverRail &&
    !magazineRail &&
    !(layout === "magazine" && magazinePacking === "vertical");
  const { wrapRef, pack } = useReadingItemsPack(layout, rows.length, usePack);
  const packClass = readingItemsPackClass(pack);
  const tileStyle = {
    "--reading-tile-width": readingTileWidthCss(),
    "--reading-tile-gap": READING_TILE_GAP,
    "--reading-pack-count": rows.length,
  } as JSX.CSSProperties;

  if (rows.length === 0) {
    return null;
  }

  if (layout === "cover" && coverRail) {
    return (
      <div className={twMerge("syllabus-explorer-cover-rail", className)}>
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

  if (layout === "magazine" && magazineRail) {
    const collectionId = rows[0]?.collectionId ?? 0;
    return (
      <ExplorerMagazineRail
        className={className}
        items={rows.map((row) => row.item)}
        keyPrefix={rows[0]?.key || "reading"}
        sortBy="auto"
        collectionId={collectionId}
        selectedItemIds={null}
        chromeByItemId={chromeByItemId}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />
    );
  }

  if (layout === "annotations") {
    return (
      <div className={className}>
        <GalleryAnnotationsSection
          items={rows.map((row) => row.item)}
          keyPrefix={rows[0]?.key || "reading"}
          sortBy="auto"
          collectionId={rows[0]?.collectionId ?? 0}
          selectedItemIds={null}
          showItemsWithoutAnnotations={showItemsWithoutAnnotations}
          chromeByItemId={chromeByItemId}
          colorFilterScope={
            colorFilterScope || String(rows[0]?.collectionId ?? "")
          }
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      </div>
    );
  }

  if (layout === "cover" || layout === "magazine") {
    const grid =
      layout === "cover" ? (
        <div
          className={twMerge("syllabus-gallery-grid", packClass, className)}
          style={tileStyle}
        >
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
      ) : (
        <MagazineItems
          className={twMerge(packClass, className)}
          style={tileStyle}
          items={rows.map((row) => row.item)}
          keyPrefix={rows[0]?.key || "reading"}
          sortBy="auto"
          template={template}
          packing={magazinePacking}
          collectionId={rows[0]?.collectionId ?? 0}
          selectedItemIds={null}
          chromeByItemId={chromeByItemId}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      );

    return (
      <div
        ref={wrapRef}
        className={
          layout === "magazine" && magazinePacking === "vertical"
            ? "container-padded"
            : readingContentWidthClass(layout, pack)
        }
      >
        {grid}
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
        return (
          <SyllabusItemCard
            key={row.key}
            item={row.item}
            collectionId={row.collectionId}
            classNumber={row.classNumber ?? undefined}
            assignment={row.assignment}
            slim={row.slim ?? true}
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
