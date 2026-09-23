// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import type { JSX } from "preact";
import type { ItemSortMode } from "../utils/items";
import { MagazineVerticalList } from "./MagazineCoverBlurb";
import { MagazineGrid, type MagazineTileClick } from "./MagazineTile";
import type { MagazineSectionTemplate } from "./magazineDesks";
import type { MagazinePacking } from "./magazinePacking";
import type { ReadingTileChrome } from "./readingAssignmentChrome";

/** Shared Magazine body for Gallery + Reading Schedule packing modes. */
export function MagazineItems({
  items,
  keyPrefix,
  sortBy,
  template = "lead",
  packing = "packed",
  collectionId = 0,
  showGalleryNote = false,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
  chromeByItemId,
  className,
  style,
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
  if (packing === "vertical") {
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

  return (
    <MagazineGrid
      items={items}
      keyPrefix={keyPrefix}
      sortBy={sortBy}
      template={template}
      packing={packing}
      collectionId={collectionId}
      showGalleryNote={showGalleryNote}
      selectedItemIds={selectedItemIds}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      chromeByItemId={chromeByItemId}
      className={className}
      style={style}
    />
  );
}
