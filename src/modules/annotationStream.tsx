// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { Check, Copy, Link2 } from "lucide-preact";
import {
  isClassNoteItem,
  openAnnotationIdInReader,
  openItemAtReaderLocation,
  openItemBestAttachment,
  openNoteItem,
  readItemNote,
} from "../utils/items";
import { getCachedItem } from "../utils/cache";
import {
  annotationCommentToDisplayHtml,
  annotationCommentToPlainText,
} from "../utils/annotationComment";
import { annotationMatchesColorFilter } from "../utils/annotationColors";
import { DEFAULT_HIGHLIGHT_COLOR } from "../utils/itemHighlights";
import { copyStringToClipboard } from "../utils/clipboard";
import { getItemCitationKey } from "../utils/citeKey";
import { getString } from "../utils/locale";
import { annotationActivityGap, formatRelativeTimestamp } from "../utils/dates";
import { getPrefValue } from "../utils/prefs";
import {
  segmentSearchHighlights,
  highlightSearchInHtml,
  type SearchHighlightSegment,
} from "../utils/searchHighlight";
import { CoverStreamRow } from "./coverStream";
import { ExplorerCoverItem } from "./ExplorerMagazineRail";
import { MagazineBlurb } from "./MagazineCoverBlurb";
import { NoteHtml } from "./NoteHtml";
import { selectItemInCollection } from "./ClassReadingBlock";
import type { MagazineTileClick } from "./MagazineTile";
import type { ReadingTileChrome } from "./readingAssignmentChrome";
import {
  isFulltextStreamEntry,
  type MyAnnotationStreamEntry,
} from "./explorerQueries";
import {
  sortAnnotationsByQuoteOrder,
  type AnnotationsQuoteOrder,
} from "./explorerQueries";
import {
  ANNOTATION_COLOR_FILTER_EXPLORER,
  getAnnotationsQuoteOrder,
  useAnnotationColorFilter,
  useAnnotationsQuoteOrder,
} from "./myAnnotationsPrefs";

/** Prefix each line for a Markdown blockquote (blank lines become `>`). */
function toMarkdownBlockquote(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.length ? `> ${line}` : ">"))
    .join("\n");
}

function isCopyPrefOn(value: unknown): boolean {
  return value === true || value === "true";
}

export function annotationHasCopyText(entry: MyAnnotationStreamEntry): boolean {
  return !!(entry.quote || entry.comment);
}

/** Pandoc parenthetical cite, with page locator when the annotation has one. */
export function formatPandocCiteRef(
  key: string,
  pageLabel?: string | null,
): string {
  const page = String(pageLabel || "").trim();
  if (!page) {
    return `[@${key}]`;
  }
  // Pandoc expects English locator labels; ranges use pp.
  const locator = /[-–,…]/.test(page) ? "pp." : "p.";
  return `[@${key}, ${locator} ${page}]`;
}

/** Plain text for clipboard: quote and/or comment, optional blockquote + cite key. */
export function formatAnnotationCopyText(
  entry: MyAnnotationStreamEntry,
): string {
  const blockquote = isCopyPrefOn(getPrefValue("myAnnotationsCopyBlockquote"));
  const citeKey = isCopyPrefOn(getPrefValue("myAnnotationsCopyCiteKey"));
  const parts: string[] = [];
  if (entry.quote) {
    let quote = entry.quote;
    if (citeKey) {
      const key = getItemCitationKey(entry.parent);
      if (key) {
        quote = `${quote} ${formatPandocCiteRef(key, entry.pageLabel)}`;
      }
    }
    parts.push(blockquote ? toMarkdownBlockquote(quote) : quote);
  }
  if (entry.comment) {
    parts.push(annotationCommentToPlainText(entry.comment));
  }
  return parts.join("\n\n");
}

export function formatGroupCopyText(
  entries: MyAnnotationStreamEntry[],
): string {
  return entries
    .map((entry) => formatAnnotationCopyText(entry))
    .filter(Boolean)
    .join("\n\n");
}

const COPY_FLASH_MS = 900;

/** Brief “Copied” flash after a successful clipboard write. */
export function useCopyFlash() {
  const [flashed, setFlashed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const flash = useCallback(() => {
    setFlashed(true);
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setFlashed(false);
      timerRef.current = null;
    }, COPY_FLASH_MS);
  }, []);

  return [flashed, flash] as const;
}

export type AnnotationStreamParentGroup = {
  key: string;
  parent: Zotero.Item | null;
  entries: MyAnnotationStreamEntry[];
};

/** Collapse consecutive same-parent rows so one cover serves the run. */
export function groupAdjacentStreamEntries(
  rows: MyAnnotationStreamEntry[],
): AnnotationStreamParentGroup[] {
  const groups: AnnotationStreamParentGroup[] = [];
  for (const entry of rows) {
    const parentId = entry.parent?.id ?? null;
    const last = groups[groups.length - 1];
    const lastId = last?.parent?.id ?? null;
    if (last && parentId != null && parentId === lastId) {
      last.entries.push(entry);
      continue;
    }
    groups.push({
      key:
        parentId != null
          ? `parent-${parentId}-${entry.id}`
          : `orphan-${entry.id}`,
      parent: entry.parent,
      entries: [entry],
    });
  }
  return groups;
}

function streamEntryAdded(entry: MyAnnotationStreamEntry): string | undefined {
  return entry.dateAdded || entry.dateModified;
}

export function AnnotationActivityGap({
  from,
  to,
}: {
  from: string | undefined;
  to: string | undefined;
}) {
  const gap = annotationActivityGap(from, to);
  if (!gap) {
    return null;
  }
  const label = getString(
    gap.later
      ? "annotations-activity-gap-later"
      : "annotations-activity-gap-earlier",
    { args: { unit: gap.unit, count: gap.count } },
  );
  return (
    <div
      className="syllabus-annotations-activity-gap"
      role="separator"
      data-activity-gap={gap.unit}
      data-activity-gap-count={gap.count}
    >
      <span
        className="syllabus-annotations-activity-gap-rule"
        aria-hidden="true"
      />
      <span className="syllabus-annotations-activity-gap-label">{label}</span>
      <span
        className="syllabus-annotations-activity-gap-rule"
        aria-hidden="true"
      />
    </div>
  );
}

function TextWithBreaks({ text }: { text: string }) {
  const parts = String(text ?? "").split("\n");
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? <br /> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
}

function AnnotationSearchText({
  text,
  query,
  richText = false,
}: {
  text: string;
  query?: string;
  richText?: boolean;
}) {
  const segments = segmentSearchHighlights(text, query || "");
  return (
    <>
      {segments.map((segment, index) => (
        <SearchHighlightMark
          key={`${index}:${segment.kind || "t"}`}
          segment={segment}
          richText={richText}
        />
      ))}
    </>
  );
}

function SearchHighlightMark({
  segment,
  richText = false,
}: {
  segment: SearchHighlightSegment;
  richText?: boolean;
}) {
  const content = richText ? (
    <TextWithBreaks text={segment.text} />
  ) : (
    segment.text
  );
  if (!segment.kind) {
    return <>{content}</>;
  }
  return (
    <mark
      className={
        segment.kind === "full"
          ? "syllabus-search-hit syllabus-search-hit-full"
          : "syllabus-search-hit syllabus-search-hit-word"
      }
    >
      {content}
    </mark>
  );
}

function AnnotationStreamEntries({
  entries,
  quoteOrder,
  searchQuery,
  richText,
}: {
  entries: MyAnnotationStreamEntry[];
  quoteOrder: AnnotationsQuoteOrder;
  searchQuery?: string;
  richText?: boolean;
}) {
  const showGaps = quoteOrder === "dateAdded";
  return (
    <>
      {entries.map((entry, i) => (
        <Fragment key={entry.id}>
          {showGaps && i > 0 ? (
            <AnnotationActivityGap
              from={streamEntryAdded(entries[i - 1])}
              to={streamEntryAdded(entry)}
            />
          ) : null}
          <AnnotationStreamBody
            entry={entry}
            searchQuery={searchQuery}
            richText={richText}
          />
        </Fragment>
      ))}
    </>
  );
}

function formatAnnotationPageLabel(page: string): string {
  try {
    const cite = (
      Zotero as typeof Zotero & {
        Cite?: { getLocatorString?: (locator: string) => string };
      }
    ).Cite;
    const locator = cite?.getLocatorString?.("page");
    if (locator) {
      return `${locator} ${page}`;
    }
  } catch {
    // Fall through to Fluent.
  }
  return getString("my-annotations-page", { args: { page } });
}

/** Open a stream row in the reader (annotation target or full-text page). */
export function openStreamEntryInReader(entry: MyAnnotationStreamEntry): void {
  if (isFulltextStreamEntry(entry)) {
    if (entry.parent) {
      openItemAtReaderLocation(entry.parent, {
        attachmentID: entry.attachmentID,
        pageIndex: entry.pageIndex,
        pageLabel: entry.pageLabel || undefined,
      });
      return;
    }
    if (entry.attachmentID) {
      const attachment = getCachedItem(entry.attachmentID);
      if (attachment) {
        openItemAtReaderLocation(attachment, {
          attachmentID: entry.attachmentID,
          pageIndex: entry.pageIndex,
          pageLabel: entry.pageLabel || undefined,
        });
      }
    }
    return;
  }
  openAnnotationIdInReader(entry.id);
}

export function AnnotationStreamBody({
  entry,
  searchQuery,
  richText = false,
}: {
  entry: MyAnnotationStreamEntry;
  searchQuery?: string;
  /** Annotation Feed only: keep line breaks and comment HTML. */
  richText?: boolean;
}) {
  const isFulltext = isFulltextStreamEntry(entry);
  const stamp = isFulltext
    ? null
    : formatRelativeTimestamp(entry.dateAdded || entry.dateModified);
  const pageText = entry.pageLabel
    ? formatAnnotationPageLabel(entry.pageLabel)
    : "";
  const tags = isFulltext ? [] : entry.tags || [];
  const hasCopy = annotationHasCopyText(entry);
  const [copied, flashCopied] = useCopyFlash();
  const openInReader = () => {
    openStreamEntryInReader(entry);
  };
  const onOpenKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      openInReader();
    }
  };
  const showMeta = !!(pageText || stamp || tags.length > 0 || hasCopy);
  const copyLabel = copied
    ? getString("my-annotations-copied")
    : getString("my-annotations-copy");
  const query = String(searchQuery || "").trim();
  const commentHtml = entry.comment
    ? annotationCommentToDisplayHtml(entry.comment)
    : "";
  const commentDisplayHtml =
    richText && query && commentHtml
      ? highlightSearchInHtml(commentHtml, query)
      : commentHtml;

  return (
    <div
      className={twMerge(
        "syllabus-my-annotations-stream-body-wrap min-w-0",
        richText && "is-rich-text",
      )}
      data-annotation-id={entry.id}
      data-stream-kind={isFulltext ? "fulltext" : "annotation"}
    >
      <div className="syllabus-my-annotations-stream-body min-w-0">
        {entry.quote ? (
          <div
            className="syllabus-my-annotations-stream-quote"
            role="button"
            tabIndex={0}
            title={getString("my-annotations-open-in-reader")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openInReader();
            }}
            onKeyDown={onOpenKeyDown}
          >
            {isFulltext ? (
              <AnnotationSearchText
                text={entry.quote}
                query={query}
                richText={richText}
              />
            ) : (
              <mark
                className="syllabus-magazine-highlight-mark"
                style={
                  { "--highlight-color": entry.color } as JSX.CSSProperties
                }
              >
                <AnnotationSearchText
                  text={entry.quote}
                  query={query}
                  richText={richText}
                />
              </mark>
            )}
          </div>
        ) : null}
        {showMeta ? (
          <div className="syllabus-my-annotations-stream-meta">
            {pageText ? (
              <span className="syllabus-my-annotations-stream-location">
                {pageText}
              </span>
            ) : null}
            {pageText && stamp ? (
              <span
                className="syllabus-my-annotations-stream-meta-sep"
                aria-hidden="true"
              >
                ·
              </span>
            ) : null}
            {stamp ? (
              <time
                className="syllabus-my-annotations-stream-time"
                dateTime={stamp.iso}
                title={stamp.absolute}
              >
                {stamp.relative}
              </time>
            ) : null}
            {tags.length > 0 ? (
              <>
                {pageText || stamp ? (
                  <span
                    className="syllabus-my-annotations-stream-meta-sep"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                ) : null}
                <span
                  className="syllabus-my-annotations-stream-tags"
                  role="list"
                  aria-label={getString("my-annotations-stream-tags-aria")}
                >
                  {tags.map((tag) => (
                    <span
                      key={tag.toLowerCase()}
                      role="listitem"
                      className="syllabus-my-annotations-stream-tag"
                      title={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              </>
            ) : null}
            {hasCopy ? (
              <>
                {pageText || stamp || tags.length > 0 ? (
                  <span
                    className="syllabus-my-annotations-stream-meta-sep syllabus-my-annotations-stream-copy-sep"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                ) : null}
                <button
                  type="button"
                  className={twMerge(
                    "syllabus-my-annotations-stream-copy",
                    copied && "is-copied",
                  )}
                  title={copyLabel}
                  aria-label={copyLabel}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (
                      copyStringToClipboard(formatAnnotationCopyText(entry))
                    ) {
                      flashCopied();
                    }
                  }}
                >
                  {copied ? (
                    <Check size={11} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <Copy size={11} strokeWidth={2} aria-hidden="true" />
                  )}
                  {copyLabel}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {entry.comment && commentDisplayHtml ? (
          <div
            className="syllabus-my-annotations-stream-comment"
            role="button"
            tabIndex={0}
            title={getString("my-annotations-open-in-reader")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openInReader();
            }}
            onKeyDown={onOpenKeyDown}
            // Sanitized annotation comment HTML (+ optional search marks).
            dangerouslySetInnerHTML={{ __html: commentDisplayHtml }}
          />
        ) : null}
        {!isFulltext && entry.related.length > 0 ? (
          <AnnotationRelatedItems related={entry.related} />
        ) : null}
      </div>
    </div>
  );
}

function openAnnotationRelatedItem(relatedId: number): void {
  const item = getCachedItem(relatedId) || Zotero.Items.get(relatedId);
  if (!item) {
    return;
  }
  try {
    if (item.deleted) {
      return;
    }
  } catch {
    return;
  }
  try {
    if (item.isAnnotation?.()) {
      openAnnotationIdInReader(item.id);
      return;
    }
    if (item.isNote?.()) {
      openNoteItem(item);
      return;
    }
  } catch {
    // Fall through to library selection / attachment open.
  }
  try {
    if (item.isRegularItem?.()) {
      openItemBestAttachment(item);
      return;
    }
  } catch {
    // Fall through to selectItem.
  }
  try {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    if (pane && typeof pane.selectItem === "function") {
      void pane.selectItem(item.id);
    }
  } catch {
    // Best-effort open.
  }
}

function AnnotationRelatedItems({
  related,
}: {
  related: MyAnnotationStreamEntry["related"];
}) {
  const heading = getString("my-annotations-related", {
    args: { count: related.length },
  });
  return (
    <div className="syllabus-my-annotations-stream-related">
      <div className="syllabus-my-annotations-stream-related-heading">
        <Link2 size={12} strokeWidth={2} aria-hidden="true" />
        <span>{heading}</span>
      </div>
      <ul className="syllabus-my-annotations-stream-related-list">
        {related.map((item) => {
          const isAnnotation = item.itemType === "annotation";
          return (
            <li key={item.id}>
              <button
                type="button"
                className="syllabus-my-annotations-stream-related-item"
                title={item.title}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openAnnotationRelatedItem(item.id);
                }}
              >
                {isAnnotation ? (
                  <span
                    className="syllabus-my-annotations-stream-related-ann-icon"
                    style={
                      {
                        "--highlight-color":
                          item.color || DEFAULT_HIGHLIGHT_COLOR,
                      } as JSX.CSSProperties
                    }
                    aria-hidden="true"
                  >
                    A
                  </span>
                ) : (
                  <span
                    className="icon icon-css icon-item-type syllabus-my-annotations-stream-related-type-icon"
                    data-item-type={item.itemType}
                    aria-hidden="true"
                  />
                )}
                <span className="syllabus-my-annotations-stream-related-label">
                  {item.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Firefox (Zotero) does not grow a `flex-direction: column; flex-wrap: wrap`
 * container to fit wrapped columns, so overflowing quotes paint over the next
 * shelf entry. Measure the real right edge of children and set an explicit
 * width on the stack and sidecar. Do not write height — that sizes the
 * cover row and collapses the art.
 */
function useExplorerRailStackWidth(
  stackRef: { current: HTMLDivElement | null },
  layoutKey: string,
): void {
  useLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack?.closest(".syllabus-explorer-cover-rail")) {
      return;
    }

    const syncWidth = () => {
      const sidecar = stack.parentElement;
      const stackLeft = stack.getBoundingClientRect().left;
      let maxRight = 0;
      for (const child of Array.from(stack.children)) {
        maxRight = Math.max(
          maxRight,
          (child as HTMLElement).getBoundingClientRect().right - stackLeft,
        );
      }
      const next = Math.ceil(maxRight);
      const apply = (el: HTMLElement | null) => {
        if (!el) {
          return;
        }
        const prev = el.style.width ? Number.parseFloat(el.style.width) : 0;
        if (next > 0 && Math.abs(next - prev) > 1) {
          el.style.width = `${next}px`;
        } else if (next <= 0 && el.style.width) {
          el.style.width = "";
        }
      };
      apply(stack);
      apply(sidecar);
    };

    syncWidth();

    const win = stack.ownerDocument.defaultView;
    if (!win || typeof win.ResizeObserver !== "function") {
      return () => {
        stack.style.width = "";
        if (stack.parentElement) {
          stack.parentElement.style.width = "";
        }
      };
    }

    const ro = new win.ResizeObserver(syncWidth);
    for (const child of Array.from(stack.children)) {
      ro.observe(child);
    }
    return () => {
      ro.disconnect();
      stack.style.width = "";
      if (stack.parentElement) {
        stack.parentElement.style.width = "";
      }
    };
  }, [stackRef, layoutKey]);
}

export function AnnotationStreamGroup({
  group,
  selected,
  collectionId,
  chrome,
  emptyLabel,
  showGalleryNote = false,
  quoteOrder: quoteOrderProp,
  searchQuery,
  richText = false,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  group: AnnotationStreamParentGroup;
  selected: boolean;
  collectionId?: number;
  chrome?: ReadingTileChrome | null;
  /** Shown in the quote stack when the group has no entries. */
  emptyLabel?: string;
  showGalleryNote?: boolean;
  quoteOrder?: AnnotationsQuoteOrder;
  /** Active Annotation Feed search query for in-quote emphasis. */
  searchQuery?: string;
  /** Annotation Feed only: line breaks in quotes + HTML comments. */
  richText?: boolean;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  const parent = group.parent;
  const [defaultQuoteOrder] = useAnnotationsQuoteOrder();
  const quoteOrder = quoteOrderProp ?? defaultQuoteOrder;
  const entries = useMemo(
    () => sortAnnotationsByQuoteOrder(group.entries, quoteOrder),
    [group.entries, quoteOrder],
  );
  const stackRef = useRef<HTMLDivElement>(null);
  const stackLayoutKey = useMemo(
    () =>
      entries
        .map(
          (entry) =>
            `${entry.id}:${entry.quote?.length ?? 0}:${entry.comment?.length ?? 0}:${searchQuery || ""}`,
        )
        .join(","),
    [entries, searchQuery],
  );
  useExplorerRailStackWidth(stackRef, stackLayoutKey);
  const showCopyAll =
    !isClassNoteItem(parent) && entries.some(annotationHasCopyText);
  const [copiedAll, flashCopiedAll] = useCopyFlash();
  const copyAllLabel = copiedAll
    ? getString("my-annotations-copied")
    : getString("my-annotations-copy-all");
  const noteHtml = useMemo(
    () => (parent && isClassNoteItem(parent) ? readItemNote(parent) : ""),
    [parent],
  );

  const sidecar =
    parent && isClassNoteItem(parent) && noteHtml ? (
      <MagazineBlurb
        variant="note"
        className="is-class-note"
        title={getString("class-note-open")}
        aria-label={getString("class-note-open")}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (collectionId) {
            selectItemInCollection(parent, collectionId);
          }
        }}
        onDblClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          openNoteItem(parent);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            if (collectionId) {
              selectItemInCollection(parent, collectionId);
            }
          }
        }}
      >
        <NoteHtml html={noteHtml} />
      </MagazineBlurb>
    ) : entries.length === 0 && emptyLabel ? (
      <p className="syllabus-gallery-annotations-empty text-secondary">
        {emptyLabel}
      </p>
    ) : (
      <AnnotationStreamEntries
        entries={entries}
        quoteOrder={quoteOrder}
        searchQuery={searchQuery}
        richText={richText}
      />
    );

  return (
    <CoverStreamRow
      item={parent}
      selected={selected}
      collectionId={collectionId}
      showGalleryNote={showGalleryNote}
      chrome={chrome}
      annotationCount={entries.length}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      stackRef={stackRef}
      extraAvatar={
        showCopyAll ? (
          <div className="syllabus-my-annotations-stream-copy-all-wrap">
            <button
              type="button"
              className={twMerge(
                "syllabus-my-annotations-stream-copy-all",
                copiedAll && "is-copied",
              )}
              title={copyAllLabel}
              aria-label={copyAllLabel}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (copyStringToClipboard(formatGroupCopyText(entries))) {
                  flashCopiedAll();
                }
              }}
            >
              {copiedAll ? (
                <Check size={12} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <Copy size={12} strokeWidth={2} aria-hidden="true" />
              )}
              {copyAllLabel}
            </button>
          </div>
        ) : null
      }
    >
      {sidecar}
    </CoverStreamRow>
  );
}

/** Feed default: cover click opens the first annotation (or best attachment). */
export function openAnnotationGroupInReader(
  group: AnnotationStreamParentGroup,
): void {
  const ordered = sortAnnotationsByQuoteOrder(
    group.entries,
    getAnnotationsQuoteOrder(),
  );
  const first = ordered[0];
  if (first) {
    openStreamEntryInReader(first);
    return;
  }
  if (group.parent) {
    openItemBestAttachment(group.parent);
  }
}

function AnnotationCoverSidecar({
  group,
  emptyLabel,
  quoteOrder: quoteOrderProp,
}: {
  group: AnnotationStreamParentGroup;
  emptyLabel?: string;
  quoteOrder?: AnnotationsQuoteOrder;
}) {
  const [defaultQuoteOrder] = useAnnotationsQuoteOrder();
  const quoteOrder = quoteOrderProp ?? defaultQuoteOrder;
  const entries = useMemo(
    () => sortAnnotationsByQuoteOrder(group.entries, quoteOrder),
    [group.entries, quoteOrder],
  );
  const stackRef = useRef<HTMLDivElement>(null);
  const stackLayoutKey = useMemo(
    () =>
      entries
        .map(
          (entry) =>
            `${entry.id}:${entry.quote?.length ?? 0}:${entry.comment?.length ?? 0}`,
        )
        .join(","),
    [entries],
  );
  useExplorerRailStackWidth(stackRef, stackLayoutKey);
  const showCopyAll = entries.some(annotationHasCopyText);
  const [copiedAll, flashCopiedAll] = useCopyFlash();
  const copyAllLabel = copiedAll
    ? getString("my-annotations-copied")
    : getString("my-annotations-copy-all");

  return (
    <div className="syllabus-explorer-annotation-sidecar">
      <div
        ref={stackRef}
        className="syllabus-my-annotations-stream-stack min-w-0"
      >
        {entries.length === 0 && emptyLabel ? (
          <p className="syllabus-gallery-annotations-empty text-secondary">
            {emptyLabel}
          </p>
        ) : (
          <AnnotationStreamEntries entries={entries} quoteOrder={quoteOrder} />
        )}
      </div>
      {showCopyAll ? (
        <div className="syllabus-my-annotations-stream-copy-all-wrap">
          <button
            type="button"
            className={twMerge(
              "syllabus-my-annotations-stream-copy-all",
              copiedAll && "is-copied",
            )}
            title={copyAllLabel}
            aria-label={copyAllLabel}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (copyStringToClipboard(formatGroupCopyText(entries))) {
                flashCopiedAll();
              }
            }}
          >
            {copiedAll ? (
              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Copy size={12} strokeWidth={2} aria-hidden="true" />
            )}
            {copyAllLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Horizontal Cover rail of annotation groups (same item as Magazine). */
export function ExplorerAnnotationShelf({
  annotations,
  selectedItemIds,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  annotations: MyAnnotationStreamEntry[];
  selectedItemIds: number[] | null;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  const [colorFilter] = useAnnotationColorFilter(
    ANNOTATION_COLOR_FILTER_EXPLORER,
  );
  const visible = useMemo(
    () =>
      annotations.filter(
        (entry) =>
          isFulltextStreamEntry(entry) ||
          annotationMatchesColorFilter(entry.color, colorFilter),
      ),
    [annotations, colorFilter],
  );
  const groups = useMemo(() => groupAdjacentStreamEntries(visible), [visible]);
  if (annotations.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("explorer-shelf-empty")}
      </p>
    );
  }
  if (visible.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("my-annotations-empty-color-filter")}
      </p>
    );
  }
  return (
    <div className="syllabus-explorer-cover-rail">
      {groups.map((group) => (
        <ExplorerCoverItem
          key={group.key}
          item={group.parent}
          selected={
            !!group.parent &&
            (selectedItemIds?.includes(group.parent.id) || false)
          }
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        >
          <AnnotationCoverSidecar group={group} />
        </ExplorerCoverItem>
      ))}
    </div>
  );
}
