// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { JSX } from "preact";
import type { ItemSortMode } from "../utils/items";
import { MagazineVerticalList } from "./MagazineCoverBlurb";
import type { MagazineTileClick } from "./MagazineTile";
import type { MagazineSectionTemplate } from "./magazineDesks";
import type { MagazinePacking } from "./magazinePacking";
import type { ReadingTileChrome } from "./readingAssignmentChrome";

/** Preview body: Annotations cover+sidecar layout with excerpt blurbs. */
export function MagazineItems({
  items,
  keyPrefix,
  sortBy,
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
  sortBy: ItemSortMode;
  template?: MagazineSectionTemplate;
  packing?: MagazinePacking;
  collectionId?: number;
  showGalleryNote?: boolean;
  selectedItemIds: number[] | null | undefined;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  chromeByItemId?: ReadonlyMap<number, ReadingTileChrome> | null;
  className?: string;
  style?: JSX.CSSProperties;
}) {
  return (
    <MagazineVerticalList
      items={items}
      keyPrefix={keyPrefix}
      sortBy={sortBy}
      collectionId={collectionId}
      selectedItemIds={selectedItemIds}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      chromeByItemId={chromeByItemId}
      className={className}
    />
  );
}
