// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { getItemBlurbLocation } from "../utils/itemBlurb";
import {
  isClassNoteItem,
  openNoteItem,
  readItemNote,
  sortItems,
  type ItemSortMode,
} from "../utils/items";
import { getString } from "../utils/locale";
import { useMagazineBlurb } from "./useMagazineBlurb";
import { GalleryTile } from "./GalleryTile";
import {
  openGalleryNoteByCollectionId,
  readGalleryNoteHtml,
  galleryNoteFingerprint,
} from "./galleryNote";
import { useNearViewport } from "./galleryVisibility";
import { useGalleryNoteText } from "./useGalleryNoteText";
import { NoteHtml } from "./NoteHtml";
import { NoteNotebookCover } from "./NoteNotebookCover";
import { selectItemInCollection } from "./ClassReadingBlock";
import { CoverStreamRow, CoverStreamSection } from "./coverStream";
import type { MagazineTileClick } from "./MagazineTile";
import type { ReadingTileChrome } from "./readingAssignmentChrome";

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

type MagazineSidecarPartition = {
  withSidecar: Zotero.Item[];
  withoutSidecar: Zotero.Item[];
};

/** True when Preview would show a blurb / gallery-note / class-note column. */
async function itemHasMagazineSidecar(
  item: Zotero.Item,
  collectionId: number,
): Promise<boolean> {
  if (isClassNoteItem(item)) {
    return true;
  }
  if (collectionId && readGalleryNoteHtml(item, collectionId)) {
    return true;
  }
  try {
    const location = await getItemBlurbLocation(item);
    return Boolean(location.text?.trim());
  } catch {
    return false;
  }
}

async function partitionByMagazineSidecar(
  items: Zotero.Item[],
  collectionId: number,
): Promise<MagazineSidecarPartition> {
  const results = await Promise.all(
    items.map(async (item) => ({
      item,
      hasSidecar: await itemHasMagazineSidecar(item, collectionId),
    })),
  );
  const withSidecar: Zotero.Item[] = [];
  const withoutSidecar: Zotero.Item[] = [];
  for (const row of results) {
    if (row.hasSidecar) {
      withSidecar.push(row.item);
    } else {
      withoutSidecar.push(row.item);
    }
  }
  return { withSidecar, withoutSidecar };
}

function MagazineNoteSidecar({
  item,
  collectionId,
  text,
}: {
  item: Zotero.Item;
  collectionId: number;
  text: string;
}) {
  const handleClick = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (collectionId) {
      void openGalleryNoteByCollectionId(item, collectionId);
    }
  };

  return (
    <MagazineBlurb
      variant="note"
      title={getString("gallery-note-edit")}
      aria-label={getString("gallery-note-label")}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as JSX.TargetedMouseEvent<HTMLElement>);
        }
      }}
    >
      <NoteHtml html={text} />
    </MagazineBlurb>
  );
}

export type MagazineBlurbVariant = "quote" | "note";

/**
 * Magazine standfirst / sidecar text. `quote` (default) is serif with a
 * faint opening mark; `note` is sans-serif with no quote (class notes and
 * gallery notes when there is no excerpt blurb).
 */
export function MagazineBlurb({
  variant = "quote",
  children,
  className,
  title,
  "aria-label": ariaLabel,
  onClick,
  onDblClick,
  onKeyDown,
}: {
  variant?: MagazineBlurbVariant;
  children: ComponentChildren;
  className?: string;
  title?: string;
  "aria-label"?: string;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  onDblClick?: (e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: JSX.TargetedKeyboardEvent<HTMLElement>) => void;
}) {
  return (
    <div
      className={twMerge(
        "syllabus-explorer-magazine-text is-blurb",
        variant === "note" && "is-note",
        className,
      )}
      role="button"
      tabIndex={0}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      onDblClick={onDblClick}
      onKeyDown={onKeyDown}
    >
      <div className="syllabus-explorer-magazine-blurb-body">{children}</div>
    </div>
  );
}

/** Class note body in the Magazine blurb column; click opens the note editor. */
function ClassNoteMagazineSidecar({
  item,
  collectionId,
}: {
  item: Zotero.Item;
  collectionId: number;
}) {
  const html = useMemo(() => readItemNote(item), [item]);
  if (!html) {
    return null;
  }

  const open = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (collectionId) {
      selectItemInCollection(item, collectionId);
    }
  };

  const openTab = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    openNoteItem(item);
  };

  return (
    <MagazineBlurb
      variant="note"
      className="is-class-note"
      title={getString("class-note-open")}
      aria-label={getString("class-note-open")}
      onClick={open}
      onDblClick={openTab}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(e as unknown as JSX.TargetedMouseEvent<HTMLElement>);
        }
      }}
    >
      <NoteHtml html={html} />
    </MagazineBlurb>
  );
}

function MagazineAutoSidecar({
  item,
  collectionId,
  visible,
}: {
  item: Zotero.Item;
  collectionId: number;
  visible: boolean;
}) {
  const galleryNote = useGalleryNoteText(item, collectionId);
  const {
    blurb,
    resolved: blurbResolved,
    open,
    onKeyDown,
  } = useMagazineBlurb(item, visible);

  if (isClassNoteItem(item)) {
    return <ClassNoteMagazineSidecar item={item} collectionId={collectionId} />;
  }

  if (blurb) {
    return (
      <MagazineBlurb
        variant="quote"
        title={getString("magazine-blurb-open")}
        aria-label={getString("magazine-blurb-open")}
        onClick={open}
        onKeyDown={onKeyDown}
      >
        {blurb}
      </MagazineBlurb>
    );
  }
  if (blurbResolved && galleryNote && collectionId) {
    return (
      <MagazineNoteSidecar
        item={item}
        collectionId={collectionId}
        text={galleryNote}
      />
    );
  }
  return null;
}

/** Preview sidecar: excerpt blurb, else gallery note, else class-note body. */
function MagazinePreviewSidecar({
  item,
  collectionId,
}: {
  item: Zotero.Item;
  collectionId: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useNearViewport(ref);
  return (
    <div ref={ref} className="min-w-0 w-full">
      <MagazineAutoSidecar
        item={item}
        collectionId={collectionId}
        visible={visible}
      />
    </div>
  );
}

/**
 * Cover-mode GalleryTile plus an optional sidecar column. Pass `children`
 * to supply the sidecar (annotations). With no children, Magazine fills
 * it with a blurb, else a gallery note. Class notes use the notepad cover
 * and put the note HTML in the blurb column.
 */
export function ExplorerCoverItem({
  item,
  collectionId = 0,
  chrome,
  selected,
  onClick,
  onDoubleClick,
  onContextMenu,
  children,
}: {
  item?: Zotero.Item | null;
  collectionId?: number;
  chrome?: ReadingTileChrome | null;
  selected: boolean;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  children?: ComponentChildren;
}) {
  const noteCollectionId = chrome?.collectionId ?? collectionId;
  const entryRef = useRef<HTMLElement>(null);
  const visible = useNearViewport(entryRef);
  const isClassNote = Boolean(item && isClassNoteItem(item));

  return (
    <article
      ref={entryRef}
      className={twMerge(
        "syllabus-explorer-cover-item",
        selected && "is-selected",
        isClassNote && "is-class-note",
      )}
      data-item-id={item?.id ?? ""}
    >
      {item && isClassNote ? (
        <div
          role="button"
          tabIndex={-1}
          data-item-id={item.id}
          className={twMerge(
            "syllabus-gallery-tile group min-w-0 select-none relative cursor-pointer outline-none",
            selected && "is-selected",
          )}
          title={getString("class-note-open")}
          onClick={(e) => onClick(item, e)}
          onDblClick={() => onDoubleClick(item)}
          onContextMenu={(e) => onContextMenu(item, e)}
        >
          <NoteNotebookCover item={item} selected={selected} />
        </div>
      ) : item ? (
        <GalleryTile
          item={item}
          collectionId={noteCollectionId || undefined}
          selected={selected}
          interactive
          chrome={chrome}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      ) : (
        <div
          className="syllabus-my-annotations-stream-avatar-empty"
          aria-hidden="true"
        />
      )}
      {children !== undefined ? (
        children
      ) : item && isClassNote ? (
        <ClassNoteMagazineSidecar item={item} collectionId={noteCollectionId} />
      ) : item ? (
        <MagazineAutoSidecar
          item={item}
          collectionId={noteCollectionId}
          visible={visible}
        />
      ) : null}
    </article>
  );
}

/** @deprecated Use ExplorerCoverItem */
export const ExplorerMagazineEntry = ExplorerCoverItem;

function MagazineCoverBlurbEntries({
  items,
  keyPrefix,
  sortBy = "auto",
  collectionId = 0,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
  chromeByItemId,
  emptyLabel,
}: {
  items: Zotero.Item[];
  keyPrefix: string;
  sortBy?: ItemSortMode;
  collectionId?: number;
  selectedItemIds: number[] | null | undefined;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  chromeByItemId?: ReadonlyMap<number, ReadingTileChrome> | null;
  emptyLabel?: string;
}) {
  const ordered = useMemo(
    () => sortItems(uniqueItems(items), sortBy),
    [items, sortBy],
  );

  if (ordered.length === 0) {
    return emptyLabel ? (
      <p className="text-secondary text-base">{emptyLabel}</p>
    ) : null;
  }

  return (
    <>
      {ordered.map((item) => (
        <ExplorerCoverItem
          key={`${keyPrefix}-${item.id}`}
          item={item}
          collectionId={collectionId}
          chrome={chromeByItemId?.get(item.id)}
          selected={selectedItemIds?.includes(item.id) || false}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </>
  );
}

/** Magazine Home rail: Cover rail + sidecar columns. */
export function ExplorerMagazineRail({
  items,
  keyPrefix,
  sortBy = "auto",
  collectionId = 0,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
  chromeByItemId,
  className,
}: {
  items: Zotero.Item[];
  keyPrefix: string;
  sortBy?: ItemSortMode;
  collectionId?: number;
  selectedItemIds: number[] | null | undefined;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  chromeByItemId?: ReadonlyMap<number, ReadingTileChrome> | null;
  className?: string;
}) {
  return (
    <div className={twMerge("syllabus-explorer-cover-rail", className)}>
      <MagazineCoverBlurbEntries
        items={items}
        keyPrefix={keyPrefix}
        sortBy={sortBy}
        collectionId={collectionId}
        selectedItemIds={selectedItemIds}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        chromeByItemId={chromeByItemId}
        emptyLabel={getString("explorer-shelf-empty")}
      />
    </div>
  );
}

/**
 * Preview layout: same cover+sidecar stream as Annotations, with excerpt
 * blurbs in the sidecar. Items without a blurb sit in a cover-only row.
 */
export function MagazineVerticalList({
  items,
  keyPrefix,
  sortBy = "auto",
  collectionId = 0,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
  chromeByItemId,
  className,
}: {
  items: Zotero.Item[];
  keyPrefix: string;
  sortBy?: ItemSortMode;
  collectionId?: number;
  selectedItemIds: number[] | null | undefined;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  chromeByItemId?: ReadonlyMap<number, ReadingTileChrome> | null;
  className?: string;
}) {
  const itemsKey = useMemo(
    () =>
      uniqueItems(items)
        .map((item) => {
          const gallery = collectionId
            ? galleryNoteFingerprint(item, collectionId)
            : "";
          const noteLen = isClassNoteItem(item)
            ? String(readItemNote(item)?.length || 0)
            : "";
          return `${item.id}:${gallery}:${noteLen}`;
        })
        .sort()
        .join(","),
    [items, collectionId],
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const sortByRef = useRef(sortBy);
  sortByRef.current = sortBy;
  const collectionIdRef = useRef(collectionId);
  collectionIdRef.current = collectionId;

  const [partition, setPartition] = useState<MagazineSidecarPartition | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setPartition(null);
    const itemsToLoad = sortItems(
      uniqueItems(itemsRef.current),
      sortByRef.current,
    );
    void partitionByMagazineSidecar(itemsToLoad, collectionIdRef.current)
      .then((next) => {
        if (!cancelled) {
          setPartition(next);
        }
      })
      .catch((err) => {
        ztoolkit.log("MagazineVerticalList partition failed", err);
        if (!cancelled) {
          setPartition({
            withSidecar: [],
            withoutSidecar: itemsToLoad,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [itemsKey, sortBy, collectionId]);

  if (!partition) {
    return null;
  }

  const withSidecar = sortItems(partition.withSidecar, sortBy);
  const withoutSidecar = sortItems(partition.withoutSidecar, sortBy);

  return (
    <div className={className}>
      <CoverStreamSection
        emptyItems={withoutSidecar}
        emptyHeading={getString("gallery-preview-none-heading")}
        emptyGroupKey={`${keyPrefix}-no-preview`}
        collectionId={collectionId}
        selectedItemIds={selectedItemIds}
        chromeByItemId={chromeByItemId}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        {withSidecar.map((item) => (
          <CoverStreamRow
            key={`${keyPrefix}-${item.id}`}
            item={item}
            collectionId={collectionId}
            chrome={chromeByItemId?.get(item.id)}
            selected={selectedItemIds?.includes(item.id) || false}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
          >
            <MagazinePreviewSidecar item={item} collectionId={collectionId} />
          </CoverStreamRow>
        ))}
      </CoverStreamSection>
    </div>
  );
}
