// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { memo } from "preact/compat";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  getItemCreatorLine,
  getItemField,
  getItemTitle,
  sortItems,
  type ItemSortMode,
} from "../utils/items";
import { getItemBlurb, usableAbstractSnippet } from "../utils/itemBlurb";
import {
  getPlaceholderCover,
  isPlayableGalleryItem,
  isVideoGalleryItem,
  resolveItemCover,
  type ResolvedCover,
} from "../utils/itemCover";
import { getString } from "../utils/locale";
import { useNearViewport } from "./galleryVisibility";
import type { MagazineSectionTemplate } from "./magazineDesks";
import { assignMagazineRoles, type MagazineTileRole } from "./magazineLayout";

export type MagazineTileClick = (
  item: Zotero.Item,
  e: JSX.TargetedMouseEvent<HTMLElement>,
) => void;

export type MagazineTileProps = {
  item: Zotero.Item;
  role: MagazineTileRole;
  selected: boolean;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
};

export const MagazineTile = memo(function MagazineTile({
  item,
  role,
  selected,
  onClick,
  onDoubleClick,
  onContextMenu,
}: MagazineTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const visible = useNearViewport(tileRef);
  const title = useMemo(
    () => getItemTitle(item) || getString("untitled"),
    [item],
  );
  const creator = useMemo(() => getItemCreatorLine(item), [item]);
  const abstractNote = useMemo(() => usableAbstractSnippet(item), [item]);
  const [blurb, setBlurb] = useState(abstractNote);
  const publication = useMemo(
    () => getItemField(item, "publicationTitle"),
    [item],
  );
  const date = useMemo(() => getItemField(item, "date"), [item]);
  const placeholder = useMemo(() => getPlaceholderCover(item), [item]);
  const [cover, setCover] = useState<ResolvedCover>(placeholder);
  const playable = isPlayableGalleryItem(item);
  const isVideo = isVideoGalleryItem(item);

  useEffect(() => {
    setBlurb(abstractNote);
  }, [abstractNote]);

  useEffect(() => {
    setCover(placeholder);
  }, [placeholder]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void resolveItemCover(item).then((resolved) => {
      if (!cancelled) {
        setCover(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, item]);

  useEffect(() => {
    if (!visible || abstractNote) {
      return;
    }
    let cancelled = false;
    void getItemBlurb(item).then((text) => {
      if (!cancelled && text) {
        setBlurb(text);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, item, abstractNote]);

  const hasImage = cover.kind === "image";
  const fallbackMeta = [publication, date].filter(Boolean).join(" · ");

  return (
    <div
      ref={tileRef}
      role="button"
      tabIndex={-1}
      data-item-id={item.id}
      data-role={role}
      className={twMerge(
        "syllabus-magazine-tile group min-w-0 cursor-pointer outline-none select-none",
        selected && "is-selected",
        playable && "is-playable",
      )}
      title={title}
      onClick={(e) => onClick(item, e)}
      onDblClick={() => onDoubleClick(item)}
      onContextMenu={(e) => onContextMenu(item, e)}
    >
      <div
        className="syllabus-magazine-cover"
        style={
          hasImage
            ? undefined
            : {
                background: placeholder.color,
              }
        }
      >
        {visible && cover.kind === "image" ? (
          <img src={cover.src} alt="" className="syllabus-magazine-cover-img" />
        ) : null}
        {playable ? (
          <div className="syllabus-gallery-play" aria-hidden="true">
            <div
              className={twMerge(
                "syllabus-gallery-play-btn",
                !isVideo && "is-audio",
              )}
            />
          </div>
        ) : null}
      </div>
      <div className="syllabus-magazine-body">
        {publication ? (
          <div className="syllabus-magazine-kicker">{publication}</div>
        ) : null}
        <div className="syllabus-magazine-title">{title}</div>
        {creator ? (
          <div className="syllabus-magazine-byline">{creator}</div>
        ) : null}
        {blurb ? (
          <div className="syllabus-magazine-abstract">{blurb}</div>
        ) : fallbackMeta ? (
          <div className="syllabus-magazine-meta">{fallbackMeta}</div>
        ) : null}
      </div>
    </div>
  );
}, areMagazineTilePropsEqual);

function areMagazineTilePropsEqual(
  prev: MagazineTileProps,
  next: MagazineTileProps,
): boolean {
  return (
    prev.item.id === next.item.id &&
    prev.item.dateModified === next.item.dateModified &&
    prev.role === next.role &&
    prev.selected === next.selected &&
    prev.onClick === next.onClick &&
    prev.onDoubleClick === next.onDoubleClick &&
    prev.onContextMenu === next.onContextMenu
  );
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

export function MagazineGrid({
  items,
  keyPrefix,
  sortBy,
  template = "lead",
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  items: Zotero.Item[];
  keyPrefix: string;
  sortBy: ItemSortMode;
  template?: MagazineSectionTemplate;
  selectedItemIds: number[] | null | undefined;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  const sorted = sortItems(uniqueItems(items), sortBy);
  const roles = assignMagazineRoles(
    sorted.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      abstractLength: usableAbstractSnippet(item).length,
    })),
    { template },
  );
  return (
    <div className="syllabus-magazine-grid" data-magazine-template={template}>
      {sorted.map((item, index) => (
        <MagazineTile
          key={`${keyPrefix}-${item.id}`}
          item={item}
          role={roles[index]}
          selected={selectedItemIds?.includes(item.id) || false}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
