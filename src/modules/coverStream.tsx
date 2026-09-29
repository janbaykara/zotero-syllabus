// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { ComponentChildren, JSX, Ref } from "preact";
import { twMerge } from "tailwind-merge";
import { isClassNoteItem } from "../utils/items";
import { GalleryTile } from "./GalleryTile";
import type { MagazineTileClick } from "./MagazineTile";
import type { ReadingTileChrome } from "./readingAssignmentChrome";

/** Cover + sidecar row shared by Annotations and Preview. */
export function CoverStreamRow({
  item,
  selected,
  collectionId,
  showGalleryNote = false,
  chrome,
  extraAvatar,
  annotationCount,
  stackRef,
  onClick,
  onDoubleClick,
  onContextMenu,
  children,
}: {
  item?: Zotero.Item | null;
  selected: boolean;
  collectionId?: number;
  showGalleryNote?: boolean;
  chrome?: ReadingTileChrome | null;
  extraAvatar?: ComponentChildren;
  annotationCount?: number;
  stackRef?: Ref<HTMLDivElement>;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  children?: ComponentChildren;
}) {
  const isClassNote = Boolean(item && isClassNoteItem(item));
  return (
    <article
      className={twMerge(
        "syllabus-my-annotations-stream-entry",
        selected && "is-selected",
        isClassNote && "is-class-note in-[.print]:hidden",
      )}
      data-parent-id={item?.id ?? ""}
      data-item-id={item?.id ?? ""}
      data-annotation-count={annotationCount ?? 0}
    >
      <div className="syllabus-my-annotations-stream-avatar">
        {item ? (
          <GalleryTile
            item={item}
            collectionId={collectionId}
            showGalleryNote={showGalleryNote}
            selected={selected}
            interactive
            chrome={chrome}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
          />
        ) : (
          <div className="syllabus-my-annotations-stream-avatar-empty" />
        )}
        {extraAvatar}
      </div>
      <div
        ref={stackRef}
        className="syllabus-my-annotations-stream-stack min-w-0"
      >
        {children}
      </div>
    </article>
  );
}

/**
 * Annotations / Preview page: stream of cover+sidecar rows, then leftover
 * covers in a horizontal grid (same container queries for cover width).
 */
export function CoverStreamSection({
  emptyItems,
  emptyHeading,
  emptyGroupKey,
  collectionId = 0,
  selectedItemIds,
  showGalleryNote = false,
  chromeByItemId,
  onClick,
  onDoubleClick,
  onContextMenu,
  children,
}: {
  emptyItems: Zotero.Item[];
  emptyHeading?: string;
  emptyGroupKey: string;
  collectionId?: number;
  selectedItemIds: number[] | null | undefined;
  showGalleryNote?: boolean;
  chromeByItemId?: ReadonlyMap<number, ReadingTileChrome> | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  children?: ComponentChildren;
}) {
  const hasStream = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  if (!hasStream && emptyItems.length === 0) {
    return null;
  }

  return (
    <div
      className="syllabus-gallery-annotations-section flex flex-col min-w-0"
      style={
        emptyItems.length > 0
          ? ({
              "--syllabus-annotations-cover-cols-cap": String(
                emptyItems.length,
              ),
            } as JSX.CSSProperties)
          : undefined
      }
    >
      {hasStream ? (
        <div className="syllabus-gallery-annotations-list syllabus-my-annotations-stream">
          {children}
        </div>
      ) : null}
      {emptyItems.length > 0 ? (
        <section
          className="syllabus-gallery-annotations-empty-section min-w-0"
          data-gallery-group={emptyGroupKey}
        >
          {emptyHeading ? (
            <h2 className="syllabus-gallery-annotations-empty-heading">
              {emptyHeading}
            </h2>
          ) : null}
          <div className="syllabus-gallery-grid">
            {emptyItems.map((item) => (
              <GalleryTile
                key={`${emptyGroupKey}-${item.id}`}
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
