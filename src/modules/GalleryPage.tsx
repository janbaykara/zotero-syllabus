// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { renderComponent } from "../utils/react";
import { isZotero8OrLater } from "../utils/zotero";
import { openItemBestAttachment } from "../utils/items";
import {
  getPlaceholderCover,
  resolveItemCover,
  type ResolvedCover,
} from "../utils/itemCover";
import { useZoteroCollectionItems } from "./react-zotero-sync/collectionItems";
import { useItemIdentifierSelection } from "./browsePage";
import {
  getItemReadStatusName,
  getReadStatusMetadata,
} from "../zotero-reading-list/compat";

interface GalleryPageProps {
  collectionId: number;
}

export function GalleryPage({ collectionId }: GalleryPageProps) {
  const syllabusItems = useZoteroCollectionItems(collectionId);
  const { selectedItemIds, handleIdentifierClick } =
    useItemIdentifierSelection();

  const handleClick = useCallback(
    (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => {
      if (e.shiftKey) {
        handleIdentifierClick(item, undefined, e);
        return;
      }
      try {
        const pane = ztoolkit.getGlobal("ZoteroPane");
        pane.selectItem(item.id);
      } catch (err) {
        ztoolkit.log("Error selecting gallery item:", err);
      }
    },
    [handleIdentifierClick],
  );

  const handleDoubleClick = useCallback((item: Zotero.Item) => {
    openItemBestAttachment(item);
  }, []);

  return (
    <div className="syllabus-page overflow-y-auto overflow-x-hidden h-full bg-background">
      <div
        className={twMerge(
          "px-6 pb-10",
          isZotero8OrLater() ? "md:pt-6 pt-4" : "pt-6",
        )}
      >
        {syllabusItems.length === 0 ? (
          <p className="text-secondary text-lg">No items in this collection.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-5 gap-y-7">
            {syllabusItems.map(({ zoteroItem }) => (
              <GalleryTile
                key={zoteroItem.id}
                item={zoteroItem}
                selected={selectedItemIds?.includes(zoteroItem.id) || false}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryTile({
  item,
  selected,
  onClick,
  onDoubleClick,
}: {
  item: Zotero.Item;
  selected: boolean;
  onClick: (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  onDoubleClick: (item: Zotero.Item) => void;
}) {
  const title = useMemo(() => {
    try {
      return item.getField("title") || "Untitled";
    } catch {
      return "Untitled";
    }
  }, [item]);
  const creator = useMemo(() => {
    try {
      return (item.firstCreator || item.getField("firstCreator") || "").trim();
    } catch {
      return "";
    }
  }, [item]);
  const readStatusName = useMemo(() => getItemReadStatusName(item), [item]);
  const readStatus = useMemo(
    () => (readStatusName ? getReadStatusMetadata(readStatusName) : undefined),
    [readStatusName],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex flex-col gap-2 min-w-0 cursor-pointer outline-none select-none"
      title={title}
      onClick={(e) => onClick(item, e)}
      onDblClick={() => onDoubleClick(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onDoubleClick(item);
        }
      }}
    >
      <GalleryCover item={item} selected={selected} />
      <div className="min-w-0 px-0.5">
        <div className="text-sm font-medium text-primary leading-snug line-clamp-2">
          {title}
        </div>
        {creator ? (
          <div className="text-xs text-secondary truncate mt-0.5">
            {creator}
          </div>
        ) : null}
        {readStatus ? (
          <div className="text-[11px] text-secondary truncate mt-0.5 uppercase tracking-wide">
            {readStatus.icon} {readStatus.name}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GalleryCover({
  item,
  selected,
}: {
  item: Zotero.Item;
  selected: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const placeholder = useMemo(() => getPlaceholderCover(item), [item]);
  const [visible, setVisible] = useState(false);
  const [cover, setCover] = useState<ResolvedCover>(placeholder);

  useEffect(() => {
    setCover(placeholder);
  }, [placeholder]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const win = Zotero.getMainWindow();
    const Observer = win.IntersectionObserver;
    if (typeof Observer !== "function") {
      setVisible(true);
      return;
    }
    const observer = new Observer(
      (entries: IntersectionObserverEntry[]) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
        }
      },
      {
        root: el.closest(".syllabus-page") as Element | null,
        rootMargin: "240px",
      },
    );
    observer.observe(el);
    const timeout = win.setTimeout(() => setVisible(true), 500);
    return () => {
      observer.disconnect();
      win.clearTimeout(timeout);
    };
  }, []);

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

  const showSpine = item.itemType === "book" || item.itemType === "bookSection";

  return (
    <div
      ref={rootRef}
      className={twMerge(
        "relative aspect-[2/3] w-full overflow-hidden rounded-[3px] bg-quinary shadow-card transition-shadow group-hover:shadow-card-hover",
        selected &&
          "ring-2 ring-[#7b4ddb] ring-offset-2 ring-offset-background",
      )}
      style={{ aspectRatio: "2 / 3" }}
    >
      {cover.kind === "image" ? (
        <img
          src={cover.src}
          alt=""
          className={twMerge(
            "absolute inset-0 h-full w-full",
            cover.fit === "contain"
              ? "object-contain bg-white"
              : "object-cover",
          )}
          draggable={false}
        />
      ) : (
        <PlaceholderFace cover={cover} />
      )}
      {showSpine ? <div className="syllabus-gallery-book-spine" /> : null}
    </div>
  );
}

function PlaceholderFace({
  cover,
}: {
  cover: Extract<ResolvedCover, { kind: "placeholder" }>;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between p-3 text-white"
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${cover.color} 88%, white) 0%, ${cover.color} 55%, color-mix(in srgb, ${cover.color} 72%, black) 100%)`,
      }}
    >
      <div className="text-[13px] font-semibold leading-snug line-clamp-4 drop-shadow-sm">
        {cover.title}
      </div>
      {cover.creator ? (
        <div className="text-[11px] opacity-85 line-clamp-2">
          {cover.creator}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}

export function renderGalleryPage(
  win: _ZoteroTypes.MainWindow,
  rootElement: HTMLElement,
  collectionId: number,
) {
  renderComponent(
    win,
    rootElement,
    <GalleryPage collectionId={collectionId} />,
    "syllabus-custom-view",
  );
}
