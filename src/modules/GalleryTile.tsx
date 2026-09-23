// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { memo } from "preact/compat";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { PinOff } from "lucide-preact";
import { getItemCreatorLine, getItemTitle } from "../utils/items";
import {
  faviconUrlForHostname,
  getItemHostname,
  getVideoSiteHostname,
  isAudioGalleryItem,
  isVideoGalleryItem,
  isWebGalleryItem,
} from "../utils/itemCover";
import { GalleryCover } from "./GalleryCover";
import {
  galleryNoteFingerprint,
  openGalleryNoteByCollectionId,
} from "./galleryNote";
import { useGalleryNoteText } from "./useGalleryNoteText";
import { useNearViewport } from "./galleryVisibility";
import { ProseText } from "./ProseText";
import { getString } from "../utils/locale";
import {
  getPrimaryAttachmentProgress,
  type AttachmentReadingProgress,
} from "../utils/readingProgress";
import {
  getItemReadStatusName,
  getReadStatusMetadata,
} from "../zotero-reading-list/compat";
import {
  ReadingDoneCheckbox,
  ReadingPriorityBadge,
  readingChromeEqual,
  type ReadingTileChrome,
} from "./readingAssignmentChrome";

type GalleryTileProps = {
  item: Zotero.Item;
  collectionId?: number;
  /** Gallery Page and Magazine Cover+Blurb. Other surfaces default off. */
  showGalleryNote?: boolean;
  selected: boolean;
  interactive?: boolean;
  chrome?: ReadingTileChrome | null;
  onClick: (item: Zotero.Item, e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: (
    item: Zotero.Item,
    e: JSX.TargetedMouseEvent<HTMLElement>,
  ) => void;
};

export const GalleryTile = memo(function GalleryTile({
  item,
  collectionId: collectionIdProp,
  showGalleryNote = false,
  selected,
  interactive = true,
  chrome,
  onClick,
  onDoubleClick,
  onContextMenu,
}: GalleryTileProps) {
  const collectionId = collectionIdProp ?? chrome?.collectionId ?? 0;
  const galleryNote = useGalleryNoteText(
    item,
    showGalleryNote ? collectionId : 0,
  );
  const tileRef = useRef<HTMLDivElement>(null);
  const visible = useNearViewport(tileRef);
  const title = useMemo(
    () => getItemTitle(item) || getString("untitled"),
    [item],
  );
  const creator = useMemo(() => getItemCreatorLine(item), [item]);
  const hostname = useMemo(() => {
    if (isVideoGalleryItem(item)) {
      return getVideoSiteHostname(item);
    }
    if (isWebGalleryItem(item) || isAudioGalleryItem(item)) {
      return getItemHostname(item);
    }
    return "";
  }, [item]);
  const faviconSrc = useMemo(
    () => (hostname ? faviconUrlForHostname(hostname) : null),
    [hostname],
  );
  const readStatusName = useMemo(() => getItemReadStatusName(item), [item]);
  const readStatus = useMemo(
    () => (readStatusName ? getReadStatusMetadata(readStatusName) : undefined),
    [readStatusName],
  );
  const [progress, setProgress] = useState<AttachmentReadingProgress | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void getPrimaryAttachmentProgress(item).then((resolved) => {
      if (!cancelled) {
        setProgress(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, item]);

  const instruction = chrome?.assignment?.classInstruction?.trim() || "";
  const priorityId =
    chrome?.showPriority === false ? "" : chrome?.assignment?.priority || "";
  const done = chrome?.readerMode && chrome.assignment?.status === "done";

  const printUrl = (() => {
    const raw = String(item.getField("url") || "").trim();
    return /^https?:\/\//i.test(raw) ? raw : undefined;
  })();

  const handleGalleryNoteClick = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (collectionId) {
      void openGalleryNoteByCollectionId(item, collectionId);
    }
  };

  const meta = (
    <div className="syllabus-gallery-meta min-w-0 px-0.5 flex flex-col gap-0.5">
      {chrome?.contextLabel ? (
        <div className="text-xs text-secondary truncate">
          {chrome.contextLabel}
        </div>
      ) : null}
      {priorityId ? (
        <div className="min-w-0">
          <ReadingPriorityBadge
            collectionId={chrome?.collectionId ?? 0}
            priorityId={priorityId}
            className="min-w-0 truncate"
          />
        </div>
      ) : null}
      <div
        className={twMerge(
          "min-w-0",
          chrome?.onUnpin && "flex flex-row items-start gap-0.5",
          !chrome?.onUnpin &&
            chrome?.readerMode &&
            "flex flex-row items-start gap-1.5",
        )}
      >
        {chrome?.onUnpin ? (
          <>
            <div className="syllabus-gallery-title text-sm font-medium text-primary leading-snug line-clamp-2 min-w-0 flex-1">
              {title}
            </div>
            <button
              type="button"
              className="syllabus-pinned-collection-unpin shrink-0 text-secondary hover:text-primary hover:bg-quinary rounded p-1 cursor-pointer border-0 bg-transparent opacity-0 group-hover:opacity-100 focus-visible:opacity-100 in-[.print]:hidden"
              title={getString("pinned-unpin-item")}
              aria-label={getString("pinned-unpin-item")}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                void chrome.onUnpin?.();
              }}
            >
              <PinOff size={16} />
            </button>
          </>
        ) : (
          <>
            {chrome?.readerMode ? (
              <ReadingDoneCheckbox
                item={item}
                collectionId={chrome.collectionId}
                assignment={chrome.assignment}
                onReaderCheck={chrome.onReaderCheck}
                className="mt-0.5 in-[.print]:hidden"
              />
            ) : null}
            <div className="syllabus-gallery-title text-sm font-medium text-primary leading-snug line-clamp-2 min-w-0">
              {title}
            </div>
          </>
        )}
      </div>
      {hostname ? (
        <div className="syllabus-gallery-hostrow">
          {faviconSrc ? (
            <img
              src={faviconSrc}
              alt=""
              className="syllabus-gallery-favicon"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <span className="truncate">{hostname}</span>
        </div>
      ) : creator ? (
        <div className="syllabus-gallery-creator text-xs text-secondary truncate">
          {creator}
        </div>
      ) : null}
      {instruction ? (
        <div className="syllabus-gallery-instruction text-xs text-secondary line-clamp-2 whitespace-pre-wrap">
          {instruction}
        </div>
      ) : null}
      {progress ? (
        <div
          className="syllabus-gallery-progress"
          title={getString("gallery-page-of", {
            args: { page: progress.page, total: progress.total },
          })}
        >
          <div className="syllabus-gallery-progress-track">
            <div
              className="syllabus-gallery-progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="syllabus-gallery-progress-pct">
            {progress.percent}%
          </span>
        </div>
      ) : null}
      {readStatus ? (
        <div className="text-[11px] text-secondary truncate uppercase tracking-wide">
          {readStatus.icon} {readStatus.name}
        </div>
      ) : null}
    </div>
  );

  const notePane =
    galleryNote && collectionId ? (
      <div
        className="syllabus-gallery-note"
        role="button"
        tabIndex={0}
        title={getString("gallery-note-edit")}
        aria-label={getString("gallery-note-label")}
        onClick={handleGalleryNoteClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleGalleryNoteClick(
              e as unknown as JSX.TargetedMouseEvent<HTMLElement>,
            );
          }
        }}
      >
        <ProseText text={galleryNote} />
      </div>
    ) : null;

  return (
    <div
      ref={tileRef}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? -1 : undefined}
      data-item-id={item.id}
      data-print-url={printUrl}
      className={twMerge(
        "syllabus-gallery-tile group min-w-0 select-none relative",
        interactive && "cursor-pointer outline-none",
        done && "opacity-40",
        notePane && "has-gallery-note",
      )}
      title={title}
      onClick={interactive ? (e) => onClick(item, e) : undefined}
      onDblClick={interactive ? () => onDoubleClick(item) : undefined}
      onContextMenu={interactive ? (e) => onContextMenu(item, e) : undefined}
    >
      {notePane ? (
        <>
          <div className="syllabus-gallery-tile-main">
            <GalleryCover item={item} selected={selected} visible={visible} />
            {meta}
          </div>
          {notePane}
        </>
      ) : (
        <>
          <GalleryCover item={item} selected={selected} visible={visible} />
          {meta}
        </>
      )}
    </div>
  );
}, areGalleryTilePropsEqual);

function areGalleryTilePropsEqual(
  prev: GalleryTileProps,
  next: GalleryTileProps,
): boolean {
  const prevCollectionId = prev.collectionId ?? prev.chrome?.collectionId ?? 0;
  const nextCollectionId = next.collectionId ?? next.chrome?.collectionId ?? 0;
  return (
    prev.item.id === next.item.id &&
    prev.item.dateModified === next.item.dateModified &&
    prev.selected === next.selected &&
    prev.interactive === next.interactive &&
    !!prev.showGalleryNote === !!next.showGalleryNote &&
    prevCollectionId === nextCollectionId &&
    (!prev.showGalleryNote ||
      galleryNoteFingerprint(prev.item, prevCollectionId) ===
        galleryNoteFingerprint(next.item, nextCollectionId)) &&
    readingChromeEqual(prev.chrome, next.chrome) &&
    prev.onClick === next.onClick &&
    prev.onDoubleClick === next.onDoubleClick &&
    prev.onContextMenu === next.onContextMenu
  );
}
