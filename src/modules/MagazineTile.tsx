// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { memo } from "preact/compat";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  getItemCreatorByline,
  getItemField,
  getItemTitle,
  sortItems,
  type ItemSortMode,
} from "../utils/items";
import { getItemBlurb, usableAbstractSnippet } from "../utils/itemBlurb";
import {
  getItemHighlightSample,
  type ItemHighlight,
} from "../utils/itemHighlights";
import { formatReadingTime, getReadingTimeSync } from "../utils/readingTime";
import {
  getPlaceholderCover,
  isPlayableGalleryItem,
  isTextHeavyGalleryItem,
  isWebGalleryItem,
  resolveItemCover,
  type ResolvedCover,
} from "../utils/itemCover";
import { getString } from "../utils/locale";
import { useNearViewport } from "./galleryVisibility";
import { GalleryCover } from "./GalleryCover";
import type { MagazineSectionTemplate } from "./magazineDesks";
import { assignMagazineRoles, type MagazineTileRole } from "./magazineLayout";
import {
  ReadingDoneCheckbox,
  ReadingPriorityBadge,
  readingChromeEqual,
  type ReadingTileChrome,
} from "./readingAssignmentChrome";

export type MagazineTileClick = (
  item: Zotero.Item,
  e: JSX.TargetedMouseEvent<HTMLElement>,
) => void;

const HIGHLIGHT_LAYOUT: Record<
  MagazineTileRole,
  { count: number; maxChars: number }
> = {
  hero: { count: 4, maxChars: 240 },
  tall: { count: 3, maxChars: 180 },
  wide: { count: 3, maxChars: 180 },
  compact: { count: 2, maxChars: 120 },
};

export type MagazineTileProps = {
  item: Zotero.Item;
  role: MagazineTileRole;
  selected: boolean;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  /** Shelf tiles are height-capped; skip highlights there. */
  showHighlights?: boolean;
  chrome?: ReadingTileChrome | null;
};

export const MagazineTile = memo(function MagazineTile({
  item,
  role,
  selected,
  onClick,
  onDoubleClick,
  onContextMenu,
  showHighlights = true,
  chrome,
}: MagazineTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const visible = useNearViewport(tileRef);
  const title = useMemo(
    () => getItemTitle(item) || getString("untitled"),
    [item],
  );
  const creator = useMemo(() => getItemCreatorByline(item), [item]);
  const durationMinutes = useMemo(
    () => getReadingTimeSync(item, { roundUp: true }),
    [item],
  );
  const abstractNote = useMemo(() => usableAbstractSnippet(item), [item]);
  const [blurb, setBlurb] = useState(abstractNote);
  const [highlights, setHighlights] = useState<ItemHighlight[]>([]);
  const publication = useMemo(
    () => getItemField(item, "publicationTitle"),
    [item],
  );
  const date = useMemo(() => getItemField(item, "date"), [item]);
  const placeholder = useMemo(() => getPlaceholderCover(item), [item]);
  const [cover, setCover] = useState<ResolvedCover>(placeholder);
  const playable = isPlayableGalleryItem(item);
  const hideGraphic = isTextHeavyGalleryItem(item);
  const usePhotoBanner = !hideGraphic && (isWebGalleryItem(item) || playable);
  const useGalleryCover = !hideGraphic && !usePhotoBanner;

  useEffect(() => {
    setBlurb(abstractNote);
  }, [abstractNote]);

  useEffect(() => {
    setCover(placeholder);
  }, [placeholder]);

  useEffect(() => {
    if (!visible || !usePhotoBanner) {
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
  }, [visible, item, usePhotoBanner]);

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

  useEffect(() => {
    if (!showHighlights) {
      setHighlights([]);
      return;
    }
    if (!visible) {
      return;
    }
    let cancelled = false;
    const layout = HIGHLIGHT_LAYOUT[role];
    void getItemHighlightSample(item, layout).then((sample) => {
      if (!cancelled) {
        setHighlights(sample);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, item, role, showHighlights]);

  const hasImage = cover.kind === "image";
  const fallbackMeta = [publication, date].filter(Boolean).join(" · ");
  const instruction = chrome?.assignment?.classInstruction?.trim() || "";
  const priorityId =
    chrome?.showPriority === false ? "" : chrome?.assignment?.priority || "";
  const done = chrome?.readerMode && chrome.assignment?.status === "done";

  let coverNode = null;
  if (useGalleryCover) {
    coverNode = (
      <div className="syllabus-magazine-cover is-gallery">
        <GalleryCover item={item} selected={false} visible={visible} />
      </div>
    );
  } else if (usePhotoBanner && (hasImage || playable)) {
    const placeholderFill =
      cover.kind === "placeholder"
        ? {
            background: `linear-gradient(165deg, color-mix(in srgb, ${cover.color} 88%, white) 0%, ${cover.color} 55%, color-mix(in srgb, ${cover.color} 72%, black) 100%)`,
          }
        : undefined;
    coverNode = (
      <div
        className="syllabus-magazine-cover is-photo is-bleed"
        style={placeholderFill}
      >
        {visible && hasImage ? (
          <img
            src={cover.src}
            alt=""
            className="syllabus-magazine-cover-img is-photo"
          />
        ) : null}
        {playable ? (
          <div className="syllabus-gallery-play" aria-hidden="true">
            <div className="syllabus-gallery-play-btn" />
          </div>
        ) : null}
      </div>
    );
  }

  const printUrl = (() => {
    const raw = String(item.getField("url") || "").trim();
    return /^https?:\/\//i.test(raw) ? raw : undefined;
  })();

  return (
    <div
      ref={tileRef}
      role="button"
      tabIndex={-1}
      data-item-id={item.id}
      data-role={role}
      data-print-url={printUrl}
      className={twMerge(
        "syllabus-magazine-tile group min-w-0 cursor-pointer outline-none select-none relative",
        selected && "is-selected",
        playable && "is-playable",
        done && "opacity-40",
      )}
      title={title}
      onClick={(e) => onClick(item, e)}
      onDblClick={() => onDoubleClick(item)}
      onContextMenu={(e) => onContextMenu(item, e)}
    >
      {coverNode}
      <div className="syllabus-magazine-body">
        {chrome?.contextLabel ? (
          <div className="syllabus-magazine-context">{chrome.contextLabel}</div>
        ) : null}
        {priorityId ? (
          <div className="syllabus-magazine-assignment-row">
            <ReadingPriorityBadge
              collectionId={chrome?.collectionId ?? 0}
              priorityId={priorityId}
            />
          </div>
        ) : null}
        {publication ? (
          <div className="syllabus-magazine-kicker">{publication}</div>
        ) : null}
        <div
          className={twMerge(
            "syllabus-magazine-title-row",
            chrome?.readerMode && "has-checkbox",
          )}
        >
          {chrome?.readerMode ? (
            <ReadingDoneCheckbox
              item={item}
              collectionId={chrome.collectionId}
              assignment={chrome.assignment}
              onReaderCheck={chrome.onReaderCheck}
              className="syllabus-magazine-title-checkbox in-[.print]:hidden"
            />
          ) : null}
          <div className="syllabus-magazine-title">{title}</div>
        </div>
        {creator ? (
          <div className="syllabus-magazine-byline">{creator}</div>
        ) : null}
        {instruction ? (
          <div className="syllabus-magazine-instruction">{instruction}</div>
        ) : null}
        {blurb ? (
          <div className="syllabus-magazine-abstract">{blurb}</div>
        ) : !instruction && fallbackMeta ? (
          <div className="syllabus-magazine-meta">{fallbackMeta}</div>
        ) : null}
        {highlights.length > 0 ? (
          <ul
            className="syllabus-magazine-highlights"
            aria-label={getString("magazine-highlights")}
          >
            {highlights.map((highlight) => (
              <li key={highlight.id} className="syllabus-magazine-highlight">
                <mark
                  className="syllabus-magazine-highlight-mark"
                  style={
                    {
                      "--highlight-color": highlight.color,
                    } as JSX.CSSProperties
                  }
                >
                  {highlight.text}
                </mark>
              </li>
            ))}
          </ul>
        ) : null}
        {durationMinutes && !playable ? (
          <div className="syllabus-magazine-duration">
            {formatReadingTime(durationMinutes)}
          </div>
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
    prev.onContextMenu === next.onContextMenu &&
    prev.showHighlights === next.showHighlights &&
    readingChromeEqual(prev.chrome, next.chrome)
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
  chromeByItemId,
  className,
  style,
}: {
  items: Zotero.Item[];
  keyPrefix: string;
  sortBy: ItemSortMode;
  template?: MagazineSectionTemplate;
  selectedItemIds: number[] | null | undefined;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
  chromeByItemId?: ReadonlyMap<number, ReadingTileChrome> | null;
  className?: string;
  style?: JSX.CSSProperties;
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
    <div
      className={twMerge("syllabus-magazine-grid", className)}
      style={style}
      data-magazine-template={template}
    >
      {sorted.map((item, index) => (
        <MagazineTile
          key={`${keyPrefix}-${item.id}`}
          item={item}
          role={roles[index]}
          selected={selectedItemIds?.includes(item.id) || false}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          chrome={chromeByItemId?.get(item.id)}
        />
      ))}
    </div>
  );
}
