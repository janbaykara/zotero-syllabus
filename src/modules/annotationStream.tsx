// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import type { JSX } from "preact";
import { twMerge } from "tailwind-merge";
import { Check, Copy } from "lucide-preact";
import {
  openAnnotationIdInReader,
  openItemBestAttachment,
} from "../utils/items";
import {
  annotationCommentToDisplayHtml,
  annotationCommentToPlainText,
} from "../utils/annotationComment";
import { copyStringToClipboard } from "../utils/clipboard";
import { getItemCitationKey } from "../utils/citeKey";
import { getString } from "../utils/locale";
import { formatRelativeTimestamp } from "../utils/dates";
import { getPref } from "../utils/prefs";
import { GalleryTile } from "./GalleryPage";
import type { MagazineTileClick } from "./MagazineTile";
import type { MyAnnotationStreamEntry } from "./explorerQueries";
import { sortAnnotationsByQuoteOrder } from "./explorerQueries";
import {
  getAnnotationsQuoteOrder,
  useAnnotationsQuoteOrder,
} from "./myAnnotationsPrefs";

/** Prefix each line for a Markdown blockquote (blank lines become `>`). */
function toMarkdownBlockquote(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.length ? `> ${line}` : ">"))
    .join("\n");
}

/** Plain text for clipboard: quote and/or comment, optional blockquote + cite key. */
export function formatAnnotationCopyText(
  entry: MyAnnotationStreamEntry,
): string {
  const blockquote = getPref("myAnnotationsCopyBlockquote");
  const citeKey = getPref("myAnnotationsCopyCiteKey");
  const parts: string[] = [];
  if (entry.quote) {
    let quote = entry.quote;
    if (citeKey) {
      const key = getItemCitationKey(entry.parent);
      if (key) {
        quote = `${quote} [@${key}]`;
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

export function AnnotationStreamBody({
  entry,
}: {
  entry: MyAnnotationStreamEntry;
}) {
  const stamp = formatRelativeTimestamp(entry.dateAdded || entry.dateModified);
  const pageText = entry.pageLabel
    ? formatAnnotationPageLabel(entry.pageLabel)
    : "";
  const copyText = formatAnnotationCopyText(entry);
  const [copied, flashCopied] = useCopyFlash();
  const openInReader = () => {
    openAnnotationIdInReader(entry.id);
  };
  const onOpenKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      openInReader();
    }
  };
  const showMeta = !!(pageText || stamp || copyText);
  const copyLabel = copied
    ? getString("my-annotations-copied")
    : getString("my-annotations-copy");

  return (
    <div
      className="syllabus-my-annotations-stream-body-wrap min-w-0"
      data-annotation-id={entry.id}
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
            <mark
              className="syllabus-magazine-highlight-mark"
              style={{ "--highlight-color": entry.color } as JSX.CSSProperties}
            >
              {entry.quote}
            </mark>
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
            {copyText ? (
              <>
                {pageText || stamp ? (
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
                    if (copyStringToClipboard(copyText)) {
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
        {entry.comment ? (
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
            // Zotero comments are plain text + a few inline HTML tags.
            dangerouslySetInnerHTML={{
              __html: annotationCommentToDisplayHtml(entry.comment),
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function AnnotationStreamGroup({
  group,
  selected,
  collectionId,
  emptyLabel,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  group: AnnotationStreamParentGroup;
  selected: boolean;
  collectionId?: number;
  /** Shown in the quote stack when the group has no entries. */
  emptyLabel?: string;
  onClick: MagazineTileClick;
  onDoubleClick: (item: Zotero.Item) => void;
  onContextMenu: MagazineTileClick;
}) {
  const parent = group.parent;
  const [quoteOrder] = useAnnotationsQuoteOrder();
  const entries = useMemo(
    () => sortAnnotationsByQuoteOrder(group.entries, quoteOrder),
    [group.entries, quoteOrder],
  );
  const groupCopyText = formatGroupCopyText(entries);
  const showCopyAll = !!groupCopyText;
  const [copiedAll, flashCopiedAll] = useCopyFlash();
  const copyAllLabel = copiedAll
    ? getString("my-annotations-copied")
    : getString("my-annotations-copy-all");

  return (
    <article
      className={twMerge(
        "syllabus-my-annotations-stream-entry",
        selected && "is-selected",
      )}
      data-parent-id={parent?.id ?? ""}
      data-item-id={parent?.id ?? ""}
      data-annotation-count={entries.length}
    >
      <div className="syllabus-my-annotations-stream-avatar">
        {parent ? (
          <GalleryTile
            item={parent}
            collectionId={collectionId}
            selected={selected}
            interactive
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
          />
        ) : (
          <div className="syllabus-my-annotations-stream-avatar-empty" />
        )}
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
                if (copyStringToClipboard(groupCopyText)) {
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
      <div className="syllabus-my-annotations-stream-stack min-w-0">
        {entries.length === 0 && emptyLabel ? (
          <p className="syllabus-gallery-annotations-empty text-secondary">
            {emptyLabel}
          </p>
        ) : (
          entries.map((entry) => (
            <AnnotationStreamBody key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </article>
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
    openAnnotationIdInReader(first.id);
    return;
  }
  if (group.parent) {
    openItemBestAttachment(group.parent);
  }
}

/** Horizontal rail of annotation stream groups (Explorer recent-annotations). */
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
  const groups = useMemo(
    () => groupAdjacentStreamEntries(annotations),
    [annotations],
  );
  if (annotations.length === 0) {
    return (
      <p className="text-secondary text-base">
        {getString("explorer-shelf-empty")}
      </p>
    );
  }
  return (
    <div className="syllabus-explorer-annotation-stream-rail syllabus-my-annotations-stream">
      {groups.map((group) => (
        <AnnotationStreamGroup
          key={group.key}
          group={group}
          selected={
            !!group.parent &&
            (selectedItemIds?.includes(group.parent.id) || false)
          }
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
