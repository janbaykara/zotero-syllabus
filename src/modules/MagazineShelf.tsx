// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { Headphones, Play } from "lucide-preact";
import { getString } from "../utils/locale";
import { MagazineTile, type MagazineTileClick } from "./MagazineTile";

export function MagazineShelf({
  kind,
  items,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  kind: "video" | "audio";
  items: Zotero.Item[];
  selectedItemIds: number[] | null | undefined;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  if (items.length === 0) {
    return null;
  }
  const heading =
    kind === "video"
      ? getString("magazine-shelf-watch")
      : getString("magazine-shelf-listen");
  const title =
    kind === "video"
      ? getString("magazine-shelf-watch-title")
      : getString("magazine-shelf-listen-title");
  const Icon = kind === "video" ? Play : Headphones;

  return (
    <section
      className="syllabus-magazine-shelf"
      data-gallery-group={`shelf-${kind}`}
      aria-label={title}
    >
      <h2 className="syllabus-magazine-desk-title" title={title}>
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
        <span>{heading}</span>
      </h2>
      <div className="syllabus-magazine-shelf-scroller">
        {items.map((item) => (
          <MagazineTile
            key={`shelf-${kind}-${item.id}`}
            item={item}
            role="compact"
            selected={selectedItemIds?.includes(item.id) || false}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </section>
  );
}
