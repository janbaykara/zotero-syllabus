// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { useMemo, useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { sortItems, type ItemSortMode } from "../utils/items";
import { getString } from "../utils/locale";
import { useMagazineBlurb } from "./useMagazineBlurb";
import { GalleryTile } from "./GalleryTile";
import { openGalleryNoteByCollectionId } from "./galleryNote";
import { useNearViewport } from "./galleryVisibility";
import { useGalleryNoteText } from "./useGalleryNoteText";
import { ProseText } from "./ProseText";
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
    <div
      className="syllabus-gallery-note"
      role="button"
      tabIndex={0}
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
      <ProseText text={text} />
    </div>
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

  if (blurb) {
    return (
      <div
        className="syllabus-explorer-magazine-text is-blurb"
        role="button"
        tabIndex={0}
        title={getString("magazine-blurb-open")}
        aria-label={getString("magazine-blurb-open")}
        onClick={open}
        onKeyDown={onKeyDown}
      >
        <span className="syllabus-explorer-magazine-blurb-body">{blurb}</span>
      </div>
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

/**
 * Cover-mode GalleryTile plus an optional sidecar column. Pass `children`
 * to supply the sidecar (annotations). With no children, Magazine fills
 * it with a blurb, else a gallery note.
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

  return (
    <article
      ref={entryRef}
      className={twMerge(
        "syllabus-explorer-cover-item",
        selected && "is-selected",
      )}
      data-item-id={item?.id ?? ""}
    >
      {item ? (
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

  return ordered.map((item) => (
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
  ));
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
 * Vertical Cover + sidecar stack for Gallery / Reading Schedule Magazine
 * packing.
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
  return (
    <div className={twMerge("syllabus-magazine-vertical", className)}>
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
      />
    </div>
  );
}
