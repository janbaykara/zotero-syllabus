// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { memo } from "preact/compat";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import {
  getItemAbstractSnippet,
  getItemCreatorLine,
  getItemField,
} from "../utils/items";
import {
  faviconUrlForHostname,
  getPlaceholderCover,
  getVideoSiteHostname,
  isAudioGalleryItem,
  isPlayableGalleryItem,
  isVideoGalleryItem,
  isWebGalleryItem,
  resolveItemCover,
  type ResolvedCover,
} from "../utils/itemCover";
import { getString } from "../utils/locale";
import { formatReadingTime, getReadingTimeSync } from "../utils/readingTime";

const PAGE_LIKE_ITEM_TYPES = new Set([
  "book",
  "bookSection",
  "conferencePaper",
  "document",
  "journalArticle",
  "manuscript",
  "preprint",
  "report",
  "thesis",
]);

export type GalleryCoverProps = {
  item: Zotero.Item;
  selected: boolean;
  visible: boolean;
};

export const GalleryCover = memo(function GalleryCover({
  item,
  selected,
  visible,
}: GalleryCoverProps) {
  const placeholder = useMemo(() => getPlaceholderCover(item), [item]);
  const [cover, setCover] = useState<ResolvedCover>(placeholder);

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

  const isJournalLike =
    item.itemType === "journalArticle" || item.itemType === "conferencePaper";
  const isBookLike =
    item.itemType === "book" || item.itemType === "bookSection";
  const isPageLike = PAGE_LIKE_ITEM_TYPES.has(item.itemType);
  const isArtwork = item.itemType === "artwork";
  const showSpine = isBookLike;
  const useJournalFace = isJournalLike && cover.kind !== "image";
  const showBinder =
    item.itemType === "report" ||
    item.itemType === "document" ||
    item.itemType === "thesis";
  const isVideo = isVideoGalleryItem(item);
  const isWeb = isWebGalleryItem(item);
  const isAudio = isAudioGalleryItem(item);
  const showPlay = isPlayableGalleryItem(item);
  const durationMinutes = showPlay ? getReadingTimeSync(item) : null;
  const showWebOverlay = isWeb && cover.kind === "image" && !isVideo;
  const showAudioCaption =
    isAudio && cover.kind === "image" && !cover.fromAttachment;
  const videoSite = isVideo ? getVideoSiteHostname(item) : "";
  const videoFavicon = videoSite ? faviconUrlForHostname(videoSite) : null;
  const useNaturalAspect =
    visible &&
    cover.kind === "image" &&
    !isVideo &&
    !isWeb &&
    (isPageLike || isArtwork);
  const coverShapeClass = isVideo
    ? "syllabus-gallery-cover-video"
    : isWeb
      ? "syllabus-gallery-cover-web"
      : useNaturalAspect
        ? "syllabus-gallery-cover-natural"
        : isPageLike
          ? "syllabus-gallery-cover-portrait"
          : "syllabus-gallery-cover-square";

  if (!visible) {
    return (
      <div
        className={twMerge(
          "relative w-full overflow-hidden rounded-[3px] bg-quinary",
          coverShapeClass,
          selected &&
            "ring-2 ring-[#7b4ddb] ring-offset-2 ring-offset-background",
        )}
      />
    );
  }

  return (
    <div
      className={twMerge(
        "relative w-full",
        showBinder
          ? "syllabus-gallery-cover-with-binder"
          : twMerge(
              "overflow-hidden rounded-[3px] bg-quinary shadow-card transition-shadow group-hover:shadow-card-hover",
              coverShapeClass,
              isJournalLike &&
                cover.kind === "image" &&
                "syllabus-gallery-journal-sheet",
            ),
        selected &&
          "ring-2 ring-[#7b4ddb] ring-offset-2 ring-offset-background",
      )}
    >
      {showBinder ? (
        <div className="syllabus-gallery-binder" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="syllabus-gallery-binder-ring" />
          ))}
        </div>
      ) : null}
      <div
        className={twMerge(
          showBinder
            ? twMerge(
                "syllabus-gallery-cover-face relative min-w-0 flex-1 overflow-hidden rounded-[3px] bg-quinary shadow-card transition-shadow group-hover:shadow-card-hover",
                coverShapeClass,
                isJournalLike &&
                  cover.kind === "image" &&
                  "syllabus-gallery-journal-sheet",
              )
            : "relative h-full w-full",
        )}
      >
        {cover.kind === "image" ? (
          <img
            src={cover.src}
            alt=""
            className={twMerge(
              useNaturalAspect
                ? "relative z-0 block h-auto w-full"
                : twMerge(
                    "absolute inset-0 h-full w-full",
                    cover.fit === "contain"
                      ? "object-contain bg-white"
                      : "object-cover",
                  ),
            )}
            draggable={false}
          />
        ) : useJournalFace ? (
          <JournalFace item={item} />
        ) : (
          <PlaceholderFace
            cover={cover}
            insetForSpine={showSpine}
            compact={isWeb}
          />
        )}
        {showWebOverlay || showAudioCaption ? (
          <div className="syllabus-gallery-web-caption">
            <div className="syllabus-gallery-web-caption-title">
              {placeholder.title}
            </div>
          </div>
        ) : null}
        {isVideo && videoFavicon ? (
          <img
            src={videoFavicon}
            alt=""
            className="syllabus-gallery-video-site"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        {showPlay ? (
          <div className="syllabus-gallery-play" aria-hidden="true">
            <span className="syllabus-gallery-play-btn" />
          </div>
        ) : null}
        {durationMinutes ? (
          <div className="syllabus-gallery-duration">
            {formatReadingTime(durationMinutes)}
          </div>
        ) : null}
        {showSpine ? <div className="syllabus-gallery-book-spine" /> : null}
        {isJournalLike ? <div className="syllabus-gallery-page-fold" /> : null}
      </div>
    </div>
  );
}, areGalleryCoverPropsEqual);

function areGalleryCoverPropsEqual(
  prev: GalleryCoverProps,
  next: GalleryCoverProps,
): boolean {
  return (
    prev.item.id === next.item.id &&
    prev.item.dateModified === next.item.dateModified &&
    prev.selected === next.selected &&
    prev.visible === next.visible
  );
}

function itemField(item: Zotero.Item, field: string): string {
  return getItemField(item, field);
}

/** First-page mockups switch from a classic masthead to a SAGE-like layout. */
const JOURNAL_CONTEMPORARY_YEAR = 2000;

const JOURNAL_INK = [
  "#1e3a5f",
  "#6b2d3c",
  "#2d4a3e",
  "#3d4554",
  "#1a5a56",
  "#5c4a1f",
  "#3c2f5c",
  "#4a3728",
];

const JOURNAL_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "&",
]);

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function journalYear(item: Zotero.Item): number | null {
  const match = itemField(item, "date").match(/\d{4}/);
  if (!match || match[0] === "0000") {
    return null;
  }
  const year = Number(match[0]);
  return year >= 1000 && year <= 2100 ? year : null;
}

function journalInk(journal: string): string {
  return JOURNAL_INK[hashString(journal || "journal") % JOURNAL_INK.length];
}

function initialsFromPhrase(value: string): string {
  return value
    .split(/[\s,./&+:–—-]+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ""))
    .filter(
      (word) => word.length > 0 && !JOURNAL_STOP_WORDS.has(word.toLowerCase()),
    )
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 5);
}

function journalMark(journal: string, abbreviation: string): string {
  const letters = abbreviation.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (letters.length >= 2 && letters.length <= 5) {
    return letters;
  }
  const fromAbbr = initialsFromPhrase(abbreviation);
  if (fromAbbr.length >= 2) {
    return fromAbbr;
  }
  const head = (journal.split(/[:–—]/)[0] || journal).trim();
  const fromTitle = initialsFromPhrase(head);
  if (fromTitle.length >= 2) {
    return fromTitle;
  }
  return (head.replace(/[^A-Za-z]/g, "").slice(0, 3) || "J").toUpperCase();
}

function journalEditionLine(item: Zotero.Item): string {
  const volume = itemField(item, "volume");
  const issue = itemField(item, "issue");
  const pages = itemField(item, "pages");
  const year = journalYear(item);
  const yearText = year ? String(year) : "";

  const volIssue = [volume ? `Vol. ${volume}` : "", issue ? `No. ${issue}` : ""]
    .filter(Boolean)
    .join(", ");
  const head = yearText
    ? volIssue
      ? `${volIssue} (${yearText})`
      : yearText
    : volIssue;
  if (pages && head) {
    return `${head} · pp. ${pages}`;
  }
  if (pages) {
    return `pp. ${pages}`;
  }
  return head;
}

function cleanIssue(issue: string): string {
  return issue.replace(/^(issues?|no\.?|number)\s+/i, "").trim();
}

function journalEditionCompact(item: Zotero.Item): string {
  const volume = itemField(item, "volume");
  const issue = cleanIssue(itemField(item, "issue"));
  const year = journalYear(item);
  const shortIssue = issue.length > 0 && issue.length <= 12;
  const volIssue =
    volume && shortIssue
      ? `${volume}(${issue})`
      : volume
        ? `Vol. ${volume}`
        : shortIssue
          ? `No. ${issue}`
          : "";
  if (volIssue && year) {
    return `${volIssue} · ${year}`;
  }
  if (year) {
    return String(year);
  }
  return volIssue;
}

function JournalFace({ item }: { item: Zotero.Item }) {
  const journal = useMemo(() => {
    return (
      itemField(item, "publicationTitle") ||
      itemField(item, "journalAbbreviation") ||
      itemField(item, "proceedingsTitle") ||
      itemField(item, "conferenceName") ||
      ""
    );
  }, [item]);
  const abbreviation = useMemo(
    () => itemField(item, "journalAbbreviation"),
    [item],
  );
  const year = useMemo(() => journalYear(item), [item]);
  const contemporary = year === null || year >= JOURNAL_CONTEMPORARY_YEAR;
  const edition = useMemo(
    () =>
      contemporary ? journalEditionCompact(item) : journalEditionLine(item),
    [item, contemporary],
  );
  const title = useMemo(
    () => itemField(item, "title") || getString("untitled"),
    [item],
  );
  const creator = useMemo(() => getItemCreatorLine(item), [item]);
  const abstractNote = useMemo(
    () => (contemporary ? getItemAbstractSnippet(item) : ""),
    [item, contemporary],
  );
  const mark = useMemo(
    () => (journal ? journalMark(journal, abbreviation) : ""),
    [journal, abbreviation],
  );
  const ink = useMemo(() => journalInk(journal), [journal]);

  if (contemporary) {
    return (
      <div
        className={twMerge(
          "syllabus-gallery-journal is-contemporary",
          abstractNote && "has-abstract",
        )}
        style={{ "--journal-ink": ink } as JSX.CSSProperties}
      >
        {journal || edition ? (
          <div className="syllabus-gallery-journal-head">
            {mark ? (
              <div
                className="syllabus-gallery-journal-mark"
                data-len={String(mark.length)}
              >
                {mark}
              </div>
            ) : null}
            <div className="syllabus-gallery-journal-head-text">
              {journal ? (
                <div className="syllabus-gallery-journal-name">{journal}</div>
              ) : null}
              {edition ? (
                <div className="syllabus-gallery-journal-edition">
                  {edition}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="syllabus-gallery-journal-title">{title}</div>
        {creator ? (
          <div className="syllabus-gallery-journal-author">{creator}</div>
        ) : null}
        {abstractNote ? (
          <div className="syllabus-gallery-journal-abstract">
            {abstractNote}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="syllabus-gallery-journal">
      {journal ? (
        <div className="syllabus-gallery-journal-masthead">{journal}</div>
      ) : null}
      {edition ? (
        <div className="syllabus-gallery-journal-edition">{edition}</div>
      ) : null}
      {journal || edition ? (
        <div className="syllabus-gallery-journal-rule" />
      ) : null}
      <div className="syllabus-gallery-journal-title">{title}</div>
      {creator ? (
        <div className="syllabus-gallery-journal-author">{creator}</div>
      ) : null}
    </div>
  );
}

function PlaceholderFace({
  cover,
  insetForSpine = false,
  hideText = false,
  compact = false,
}: {
  cover: Extract<ResolvedCover, { kind: "placeholder" }>;
  insetForSpine?: boolean;
  hideText?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={twMerge(
        "absolute inset-0 flex flex-col justify-between text-white",
        insetForSpine ? "syllabus-gallery-placeholder-spine" : "p-3",
      )}
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${cover.color} 88%, white) 0%, ${cover.color} 55%, color-mix(in srgb, ${cover.color} 72%, black) 100%)`,
      }}
    >
      {hideText ? null : (
        <>
          <div
            className={twMerge(
              "font-semibold leading-snug drop-shadow-sm",
              compact ? "text-[12px] line-clamp-2" : "text-[13px] line-clamp-4",
            )}
          >
            {cover.title}
          </div>
          {cover.creator ? (
            <div className="text-[11px] opacity-85 line-clamp-2">
              {cover.creator}
            </div>
          ) : (
            <div />
          )}
        </>
      )}
    </div>
  );
}
