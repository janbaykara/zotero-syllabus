import { useCallback, useMemo } from "preact/hooks";
import { useAtomValue } from "jotai";
import { getCachedItem } from "../utils/cache";
import { isSyllabusMemberItem } from "../utils/items";
import { collectAnnotationColors } from "../utils/annotationColors";
import { readItemAnnotationTags } from "../utils/annotationTags";
import { getItemTitle } from "../utils/items";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  normalizeHighlightColor,
} from "../utils/itemHighlights";
import {
  attachmentForFulltextHit,
  findMatchingParagraphsInFulltext,
  paragraphOverlapsAnnotationQuote,
  readAttachmentFulltext,
  syntheticFulltextStreamId,
} from "../utils/fulltextParagraphs";
import { savedSearchShelfKey, type ExplorerShelf } from "./explorerConfig";
import { createDebouncedReload } from "../utils/debounceReload";
import { atomFamilyFromExternal } from "./react-zotero-sync/jotaiExternal";

export const EXPLORER_MEDIA_LIMIT = 10;
export const EXPLORER_RECENTLY_ADDED_LIMIT = 20;
export const EXPLORER_ARTICLE_DESK_LIMIT = 12;
export const EXPLORER_FEATURED_LOOKBACK_DAYS = 365;

export type RecentlyReadRecord = {
  itemId: number;
  /** Unix timestamp in seconds from `attachmentLastRead`. */
  lastRead: number;
};

export type ExplorerAnnotation = {
  id: number;
  text: string;
  color: string;
  dateModified: string;
  parent: Zotero.Item | null;
};

export type MyAnnotationStreamKind = "annotation" | "fulltext";

/** Related item shown under an annotation comment (`dc:relation`). */
export type MyAnnotationRelatedItem = {
  id: number;
  title: string;
  /** Regular item type, or `"annotation"` for linked annotations. */
  itemType: string;
  /** Highlight colour when `itemType === "annotation"`. */
  color?: string;
};

/** Flat stream row for My Annotations timeline (quote + comment kept separate). */
export type MyAnnotationStreamEntry = {
  id: number;
  /** Real annotation vs full-text paragraph hit. Defaults to annotation. */
  kind?: MyAnnotationStreamKind;
  quote: string;
  comment: string;
  color: string;
  /** Annotation item tags (not parent-item tags). */
  tags: string[];
  /** Zotero related items (`dc:relation`) on this annotation. */
  related: MyAnnotationRelatedItem[];
  /** When the annotation was created. */
  dateAdded: string;
  dateModified: string;
  /** Printed page label from the reader (may be empty for some EPUBs). */
  pageLabel: string;
  /**
   * Zotero reader document order (`annotationSortIndex`), e.g. `00008|000412|00574`.
   * Empty when the reader did not store one.
   */
  sortIndex: string;
  parent: Zotero.Item | null;
  /** Attachment opened for full-text hits. */
  attachmentID?: number;
  /** 0-based PDF page for full-text hits when form-feeds allow placement. */
  pageIndex?: number;
};

/** Resolve `item.relatedItems` keys to display rows (skips missing / trashed). */
export function readAnnotationRelatedItems(item: {
  libraryID?: number;
  relatedItems?: string[];
}): MyAnnotationRelatedItem[] {
  let keys: string[] = [];
  try {
    keys = Array.isArray(item.relatedItems) ? item.relatedItems : [];
  } catch {
    return [];
  }
  if (!keys.length) {
    return [];
  }
  const libraryID =
    typeof item.libraryID === "number"
      ? item.libraryID
      : Zotero.Libraries.userLibraryID;
  const out: MyAnnotationRelatedItem[] = [];
  const seen = new Set<number>();
  for (const key of keys) {
    const related = Zotero.Items.getByLibraryAndKey(libraryID, String(key));
    if (!related) {
      continue;
    }
    try {
      if (related.deleted) {
        continue;
      }
    } catch {
      continue;
    }
    if (seen.has(related.id)) {
      continue;
    }
    seen.add(related.id);
    let isAnnotation = false;
    try {
      isAnnotation = !!related.isAnnotation?.();
    } catch {
      isAnnotation = false;
    }
    if (isAnnotation) {
      let quote = "";
      let comment = "";
      let color = DEFAULT_HIGHLIGHT_COLOR;
      try {
        quote = String(related.annotationText || "").trim();
      } catch {
        // Keep empty.
      }
      try {
        comment = String(related.annotationComment || "").trim();
      } catch {
        // Keep empty.
      }
      try {
        color = normalizeHighlightColor(String(related.annotationColor || ""));
      } catch {
        // Keep default.
      }
      const title = getItemTitle(related) || quote || comment || related.key;
      out.push({
        id: related.id,
        title,
        itemType: "annotation",
        color,
      });
      continue;
    }
    const title = getItemTitle(related) || related.key;
    let itemType = "document";
    try {
      itemType = String(related.itemType || "document");
    } catch {
      itemType = "document";
    }
    out.push({ id: related.id, title, itemType });
  }
  return out;
}

export function isFulltextStreamEntry(entry: MyAnnotationStreamEntry): boolean {
  return entry.kind === "fulltext";
}

export const MY_ANNOTATIONS_SEARCH_SCOPES = [
  "both",
  "annotations",
  "fulltext",
] as const;
export type MyAnnotationsSearchScope =
  (typeof MY_ANNOTATIONS_SEARCH_SCOPES)[number];

export function coerceMyAnnotationsSearchScope(
  value: unknown,
): MyAnnotationsSearchScope {
  if (value === "annotations" || value === "fulltext") {
    return value;
  }
  return "both";
}

export const ANNOTATIONS_QUOTE_ORDERS = ["location", "dateAdded"] as const;
export type AnnotationsQuoteOrder = (typeof ANNOTATIONS_QUOTE_ORDERS)[number];

export function coerceAnnotationsQuoteOrder(
  value: unknown,
): AnnotationsQuoteOrder {
  return value === "dateAdded" ? "dateAdded" : "location";
}

function pageLabelSortKey(pageLabel: string): number {
  const match = String(pageLabel || "").match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/** Sort quotes within one parent: document location or date added (oldest first). */
export function compareAnnotationsQuoteOrder(
  a: MyAnnotationStreamEntry,
  b: MyAnnotationStreamEntry,
  order: AnnotationsQuoteOrder,
): number {
  if (order === "location") {
    const sa = a.sortIndex || "";
    const sb = b.sortIndex || "";
    if (sa && sb && sa !== sb) {
      return sa < sb ? -1 : 1;
    }
    if (sa && !sb) {
      return -1;
    }
    if (!sa && sb) {
      return 1;
    }
    const page = pageLabelSortKey(a.pageLabel) - pageLabelSortKey(b.pageLabel);
    if (page) {
      return page;
    }
  }
  return (
    dateMs(a.dateAdded) - dateMs(b.dateAdded) ||
    dateMs(a.dateModified) - dateMs(b.dateModified) ||
    a.id - b.id
  );
}

export function sortAnnotationsByQuoteOrder(
  entries: MyAnnotationStreamEntry[],
  order: AnnotationsQuoteOrder,
): MyAnnotationStreamEntry[] {
  return [...entries].sort((a, b) => compareAnnotationsQuoteOrder(a, b, order));
}

export type ExplorerAnnotationGroup = {
  parent: Zotero.Item | null;
  annotations: ExplorerAnnotation[];
  /** Unix timestamp in seconds; set for My Annotations last-read ordering. */
  lastRead?: number;
};

export function groupAdjacentAnnotations(
  rows: ExplorerAnnotation[],
): ExplorerAnnotationGroup[] {
  const groups: ExplorerAnnotationGroup[] = [];
  for (const row of rows) {
    const parentId = row.parent?.id ?? null;
    const last = groups[groups.length - 1];
    const lastId = last?.parent?.id ?? null;
    if (last && parentId != null && parentId === lastId) {
      last.annotations.push(row);
      continue;
    }
    groups.push({ parent: row.parent, annotations: [row] });
  }
  return groups;
}

/** Group all annotations by parent item, preserving first-seen parent order. */
export function groupAnnotationsByParent(
  rows: ExplorerAnnotation[],
): ExplorerAnnotationGroup[] {
  const byParent = new Map<number | "none", ExplorerAnnotationGroup>();
  const order: Array<number | "none"> = [];
  for (const row of rows) {
    const key = row.parent?.id ?? "none";
    let group = byParent.get(key);
    if (!group) {
      group = { parent: row.parent, annotations: [] };
      byParent.set(key, group);
      order.push(key);
    }
    group.annotations.push(row);
  }
  return order.map((key) => byParent.get(key)!);
}

function dateMs(value: string | undefined): number {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function withinDays(
  iso: string | undefined,
  days: number,
  now: number,
): boolean {
  const ms = dateMs(iso);
  if (!ms) {
    return false;
  }
  return now - ms <= days * 24 * 60 * 60 * 1000;
}

export function pickNewestItems(
  items: Zotero.Item[],
  limit: number,
): Zotero.Item[] {
  return [...items]
    .sort((a, b) => dateMs(b.dateAdded) - dateMs(a.dateAdded) || a.id - b.id)
    .slice(0, limit);
}

export function pickRecentItemsByDate(
  items: Zotero.Item[],
  days: number,
  now = Date.now(),
): Zotero.Item[] {
  return [...items]
    .filter((item) => withinDays(item.dateAdded, days, now))
    .sort((a, b) => dateMs(b.dateAdded) - dateMs(a.dateAdded) || a.id - b.id);
}

function attachmentLastReadSeconds(item: Zotero.Item): number {
  try {
    const value = (item as Zotero.Item & { attachmentLastRead?: unknown })
      .attachmentLastRead;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }
  } catch {
    // Missing on older clients or non-attachments.
  }
  return 0;
}

function lastReadWithinDays(
  lastRead: number,
  days: number,
  now = Date.now(),
): boolean {
  return now - lastRead * 1000 <= days * 24 * 60 * 60 * 1000;
}

export function pickRecentlyReadIds(
  records: RecentlyReadRecord[],
  limit: number,
): number[] {
  const seen = new Set<number>();
  const ids: number[] = [];
  const sorted = [...records]
    .filter((record) => record.lastRead > 0)
    .sort((a, b) => b.lastRead - a.lastRead || a.itemId - b.itemId);
  for (const record of sorted) {
    if (seen.has(record.itemId)) {
      continue;
    }
    seen.add(record.itemId);
    ids.push(record.itemId);
    if (ids.length >= limit) {
      break;
    }
  }
  return ids;
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

function resolveItem(id: number): Zotero.Item | undefined {
  const cached = getCachedItem(id);
  if (cached) {
    return cached;
  }
  try {
    const item = Zotero.Items.get(id);
    return item || undefined;
  } catch {
    return undefined;
  }
}

async function searchItemIds(
  libraryID: number,
  extra: Array<[string, _ZoteroTypes.Search.Operator, string]>,
): Promise<number[]> {
  try {
    const search = new Zotero.Search({ libraryID });
    for (const [condition, operator, value] of extra) {
      search.addCondition(condition, operator, value);
    }
    const ids = await search.search();
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "number") : [];
  } catch (error) {
    ztoolkit.log("Explorer search failed:", error);
    return [];
  }
}

export async function searchRecentLibraryItems(
  libraryID: number,
  days: number,
): Promise<Zotero.Item[]> {
  const ids = await searchItemIds(libraryID, [
    ["dateAdded", "isInTheLast", `${days} days`],
    ["itemType", "isNot", "attachment"],
    ["itemType", "isNot", "note"],
    ["itemType", "isNot", "annotation"],
  ]);
  return uniqueItems(
    ids
      .map(resolveItem)
      .filter((item): item is Zotero.Item => isSyllabusMemberItem(item)),
  );
}

function parentOfAttachment(att: Zotero.Item): Zotero.Item | undefined {
  let parent: Zotero.Item | false | undefined;
  try {
    parent = att.parentItem;
  } catch {
    parent = false;
  }
  if (!parent && att.parentItemID) {
    parent = resolveItem(att.parentItemID) || false;
  }
  return parent || undefined;
}

function recentlyReadRecordFromAttachment(
  att: Zotero.Item,
  days: number,
  now: number,
): RecentlyReadRecord | undefined {
  if (typeof att.isAttachment !== "function" || !att.isAttachment()) {
    return undefined;
  }
  const lastRead = attachmentLastReadSeconds(att);
  if (!lastRead || !lastReadWithinDays(lastRead, days, now)) {
    return undefined;
  }
  const parent = parentOfAttachment(att);
  if (!parent || !isSyllabusMemberItem(parent)) {
    return undefined;
  }
  return { itemId: parent.id, lastRead };
}

export async function searchRecentlyReadItems(
  libraryID: number,
  days: number,
  limit: number,
): Promise<Zotero.Item[]> {
  const now = Date.now();
  const ids = await searchItemIds(libraryID, [
    ["itemType", "is", "attachment"],
    ["lastRead", "isInTheLast", `${days} days`],
  ]);
  const records: RecentlyReadRecord[] = [];
  for (const id of ids) {
    const item = resolveItem(id);
    if (!item) {
      continue;
    }
    if (typeof item.isAttachment === "function" && item.isAttachment()) {
      const record = recentlyReadRecordFromAttachment(item, days, now);
      if (record) {
        records.push(record);
      }
      continue;
    }
    if (!isSyllabusMemberItem(item)) {
      continue;
    }
    let attachmentIds: number[] = [];
    try {
      attachmentIds = item.getAttachments();
    } catch {
      // Keep empty when attachments cannot be read.
    }
    for (const attId of attachmentIds) {
      const att = resolveItem(attId);
      if (!att) {
        continue;
      }
      const record = recentlyReadRecordFromAttachment(att, days, now);
      if (record) {
        records.push(record);
      }
    }
  }
  return pickRecentlyReadIds(records, limit)
    .map(resolveItem)
    .filter((item): item is Zotero.Item => !!item);
}

export async function searchRecentFeedItems(
  days: number,
): Promise<Zotero.Item[]> {
  let feeds: Array<{ libraryID?: number }> = [];
  try {
    feeds = Zotero.Feeds?.getAll?.() || [];
  } catch {
    // Keep empty when feeds cannot be read.
  }
  if (!feeds.length) {
    try {
      feeds = Zotero.Libraries.getAll().filter(
        (library) => library.libraryType === "feed",
      );
    } catch {
      // Keep empty when libraries cannot be read.
    }
  }
  const items: Zotero.Item[] = [];
  const seen = new Set<number>();
  for (const feed of feeds) {
    const libraryID = feed.libraryID;
    if (typeof libraryID !== "number" || libraryID < 1) {
      continue;
    }
    const ids = await searchItemIds(libraryID, [
      ["dateAdded", "isInTheLast", `${days} days`],
    ]);
    for (const id of ids) {
      const item = resolveItem(id);
      if (!item || seen.has(item.id)) {
        continue;
      }
      if (
        !isSyllabusMemberItem(item, {
          includeFeedItems: true,
        })
      ) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
  }
  return pickRecentItemsByDate(items, days).slice(0, EXPLORER_MEDIA_LIMIT * 2);
}

export async function searchRecentAnnotations(
  libraryID: number,
  limit: number,
): Promise<MyAnnotationStreamEntry[]> {
  const ids = await searchItemIds(libraryID, [
    ["itemType", "is", "annotation"],
    ["dateModified", "isInTheLast", "90 days"],
  ]);
  const rows: MyAnnotationStreamEntry[] = [];
  for (const id of ids) {
    const item = resolveItem(id);
    if (!item) {
      continue;
    }
    try {
      if (item.deleted) {
        continue;
      }
    } catch {
      continue;
    }
    const row = mapAnnotationStreamEntry(item);
    if (row) {
      rows.push(row);
    }
  }
  return rows.sort(compareAnnotationNewestFirst).slice(0, limit);
}

export const MY_ANNOTATIONS_STREAM_PAGE_SIZE = 50;
export const MY_ANNOTATIONS_STREAM_LOOKBACK_DAYS = 365;

/** Trim; empty/whitespace means “no search” (live 365-day timeline). */
export function normalizeMyAnnotationsSearchQuery(query: unknown): string {
  return String(query ?? "").trim();
}

export function isMyAnnotationsSearchActive(query: unknown): boolean {
  return normalizeMyAnnotationsSearchQuery(query).length > 0;
}

function annotationParentItem(item: Zotero.Item): Zotero.Item | null {
  try {
    const attachment = item.parentItem;
    const work = attachment?.parentItem || attachment || null;
    let parent = work && isSyllabusMemberItem(work) ? work : work || null;
    if (parent && !parent.isRegularItem?.()) {
      const grand = parent.parentItem;
      parent = grand && isSyllabusMemberItem(grand) ? grand : parent;
    }
    return parent;
  } catch {
    return null;
  }
}

/**
 * Map a title / full-text / annotation search hit to the regular parent work
 * whose annotations should appear in the feed.
 */
export function resolveMyAnnotationsSearchHitParent(
  item: Zotero.Item,
): Zotero.Item | null {
  try {
    if (item.deleted) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    if (typeof item.isAnnotation === "function" && item.isAnnotation()) {
      return annotationParentItem(item);
    }
  } catch {
    // Fall through to attachment / regular checks.
  }
  try {
    if (typeof item.isAttachment === "function" && item.isAttachment()) {
      const parent = parentOfAttachment(item);
      return parent && isSyllabusMemberItem(parent) ? parent : null;
    }
  } catch {
    // Fall through to regular-item check.
  }
  return isSyllabusMemberItem(item) ? item : null;
}

/** Unique bibliographic parents from mixed search hits, first-seen order. */
export function uniqueParentsFromSearchHits(
  items: Zotero.Item[],
): Zotero.Item[] {
  const seen = new Set<number>();
  const parents: Zotero.Item[] = [];
  for (const item of items) {
    const parent = resolveMyAnnotationsSearchHitParent(item);
    if (!parent || seen.has(parent.id)) {
      continue;
    }
    seen.add(parent.id);
    parents.push(parent);
  }
  return parents;
}

/** Keep first occurrence of each annotation id. */
export function dedupeMyAnnotationStreamRows(
  rows: MyAnnotationStreamEntry[],
): MyAnnotationStreamEntry[] {
  const seen = new Set<number>();
  const out: MyAnnotationStreamEntry[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

/** Prefer reader page label; fall back to 1-based pageIndex from position JSON. */
export function annotationLocationPageLabel(item: Zotero.Item): string {
  try {
    const label = String(item.annotationPageLabel || "").trim();
    if (label) {
      return label;
    }
  } catch {
    // Fall through to position.
  }
  try {
    const raw = String(item.annotationPosition || "").trim();
    if (!raw) {
      return "";
    }
    const parsed = JSON.parse(raw) as { pageIndex?: unknown };
    if (typeof parsed.pageIndex === "number" && parsed.pageIndex >= 0) {
      return String(parsed.pageIndex + 1);
    }
  } catch {
    // Keep empty when position is unavailable or not a PDF rect position.
  }
  return "";
}

function mapAnnotationStreamEntry(
  item: Zotero.Item,
): MyAnnotationStreamEntry | null {
  let quote = "";
  let comment = "";
  try {
    quote = String(item.annotationText || "").trim();
  } catch {
    // Keep empty when annotation text is unavailable.
  }
  try {
    comment = String(item.annotationComment || "").trim();
  } catch {
    // Keep empty when annotation comment is unavailable.
  }
  if (!quote && !comment) {
    return null;
  }
  let color = DEFAULT_HIGHLIGHT_COLOR;
  try {
    color = normalizeHighlightColor(String(item.annotationColor || ""));
  } catch {
    // Keep the default color when annotation color is unavailable.
  }
  return {
    id: item.id,
    kind: "annotation",
    quote,
    comment,
    color,
    tags: readItemAnnotationTags(item),
    related: readAnnotationRelatedItems(item),
    dateAdded: String(item.dateAdded || item.dateModified || ""),
    dateModified: String(item.dateModified || ""),
    pageLabel: annotationLocationPageLabel(item),
    sortIndex: (() => {
      try {
        return String(item.annotationSortIndex || "").trim();
      } catch {
        return "";
      }
    })(),
    parent: annotationParentItem(item),
  };
}

function compareAnnotationNewestFirst(
  a: { dateAdded: string; dateModified: string; id: number },
  b: { dateAdded: string; dateModified: string; id: number },
): number {
  return (
    dateMs(b.dateAdded) - dateMs(a.dateAdded) ||
    dateMs(b.dateModified) - dateMs(a.dateModified) ||
    a.id - b.id
  );
}

async function collectAnnotationStreamHits(
  hitIds: number[],
): Promise<MyAnnotationStreamEntry[]> {
  const collected: MyAnnotationStreamEntry[] = [];
  for (const id of hitIds) {
    const item = resolveItem(id);
    if (!item) {
      continue;
    }
    try {
      if (item.deleted) {
        continue;
      }
    } catch {
      continue;
    }
    const row = mapAnnotationStreamEntry(item);
    if (row) {
      collected.push(row);
    }
  }
  return collected;
}

async function collectFulltextStreamHits(
  hitIds: number[],
  query: string,
): Promise<MyAnnotationStreamEntry[]> {
  const collected: MyAnnotationStreamEntry[] = [];
  const seenAttachments = new Set<number>();
  for (const id of hitIds) {
    const item = resolveItem(id);
    if (!item) {
      continue;
    }
    const attachment = attachmentForFulltextHit(item);
    if (!attachment || seenAttachments.has(attachment.id)) {
      continue;
    }
    seenAttachments.add(attachment.id);
    const parent = resolveMyAnnotationsSearchHitParent(item);
    if (!parent) {
      continue;
    }
    const raw = await readAttachmentFulltext(attachment).catch(() => "");
    if (!raw) {
      continue;
    }
    for (const hit of findMatchingParagraphsInFulltext(raw, query)) {
      collected.push({
        id: syntheticFulltextStreamId(
          attachment.id,
          hit.pageIndex,
          hit.paragraphIndex,
        ),
        kind: "fulltext",
        quote: hit.text,
        comment: "",
        color: "",
        tags: [],
        related: [],
        dateAdded: "",
        dateModified: "",
        pageLabel: hit.pageLabel || "",
        sortIndex: "",
        parent,
        attachmentID: attachment.id,
        pageIndex: hit.pageIndex,
      });
    }
  }
  return collected;
}

/** Drop full-text paragraphs that overlap a returned annotation quote. */
export function dedupeFulltextAgainstAnnotations(
  annotations: MyAnnotationStreamEntry[],
  fulltext: MyAnnotationStreamEntry[],
): MyAnnotationStreamEntry[] {
  if (!fulltext.length || !annotations.length) {
    return fulltext;
  }
  return fulltext.filter((para) => {
    const parentId = para.parent?.id;
    return !annotations.some(
      (ann) =>
        ann.parent?.id === parentId &&
        paragraphOverlapsAnnotationQuote(para.quote, ann.quote),
    );
  });
}

function compareSearchStreamRows(
  a: MyAnnotationStreamEntry,
  b: MyAnnotationStreamEntry,
): number {
  const aFull = isFulltextStreamEntry(a);
  const bFull = isFulltextStreamEntry(b);
  if (!aFull && !bFull) {
    return compareAnnotationNewestFirst(a, b);
  }
  const aParent = a.parent?.id ?? 0;
  const bParent = b.parent?.id ?? 0;
  if (aParent !== bParent) {
    // Keep parents roughly newest-annotation-first when mixed.
    const aDate = dateMs(a.dateAdded) || dateMs(a.dateModified);
    const bDate = dateMs(b.dateAdded) || dateMs(b.dateModified);
    if (aDate || bDate) {
      return bDate - aDate || aParent - bParent;
    }
    return aParent - bParent;
  }
  if (aFull !== bFull) {
    // Annotations before full-text under the same parent.
    return aFull ? 1 : -1;
  }
  if (aFull && bFull) {
    const page =
      (a.pageIndex ?? Number.POSITIVE_INFINITY) -
      (b.pageIndex ?? Number.POSITIVE_INFINITY);
    if (page) {
      return page;
    }
    return a.id - b.id;
  }
  return compareAnnotationNewestFirst(a, b);
}

async function searchMyAnnotationsStreamByQuery(
  libraryID: number,
  query: string,
  limit: number,
  scope: MyAnnotationsSearchScope,
): Promise<{
  rows: MyAnnotationStreamEntry[];
  hasMore: boolean;
  colors: string[];
}> {
  const wantAnnotations = scope === "both" || scope === "annotations";
  const wantFulltext = scope === "both" || scope === "fulltext";
  const [quoteIds, commentIds, fulltextIds] = await Promise.all([
    wantAnnotations
      ? searchItemIds(libraryID, [["annotationText", "contains", query]])
      : Promise.resolve([] as number[]),
    wantAnnotations
      ? searchItemIds(libraryID, [["annotationComment", "contains", query]])
      : Promise.resolve([] as number[]),
    wantFulltext
      ? searchItemIds(libraryID, [["fulltextContent", "contains", query]])
      : Promise.resolve([] as number[]),
  ]);
  const annotationRows = wantAnnotations
    ? await collectAnnotationStreamHits([
        ...new Set([...quoteIds, ...commentIds]),
      ])
    : [];
  const fulltextRows = wantFulltext
    ? await collectFulltextStreamHits([...new Set(fulltextIds)], query)
    : [];
  const dedupedFulltext =
    scope === "both"
      ? dedupeFulltextAgainstAnnotations(annotationRows, fulltextRows)
      : fulltextRows;
  const rows = dedupeMyAnnotationStreamRows([
    ...annotationRows,
    ...dedupedFulltext,
  ]).sort(compareSearchStreamRows);
  const hasMore = rows.length > limit;
  const sliced = rows.slice(0, limit);
  return {
    rows: sliced,
    hasMore,
    colors: collectAnnotationColors(
      sliced
        .filter((row) => !isFulltextStreamEntry(row))
        .map((row) => row.color),
    ),
  };
}

/**
 * Newest `limit` annotations (descending).
 * Empty `query` → live lookback window. Non-empty → matching annotation
 * quotes/comments and/or full-text paragraphs per `scope`.
 * Increase `limit` to "load previous".
 */
export async function searchMyAnnotationsStream(
  libraryID: number,
  options: {
    limit?: number;
    query?: string;
    scope?: MyAnnotationsSearchScope;
  } = {},
): Promise<{
  rows: MyAnnotationStreamEntry[];
  hasMore: boolean;
  colors: string[];
}> {
  const limit = Math.max(1, options.limit ?? MY_ANNOTATIONS_STREAM_PAGE_SIZE);
  const query = normalizeMyAnnotationsSearchQuery(options.query);
  const scope = coerceMyAnnotationsSearchScope(options.scope);
  if (query) {
    return searchMyAnnotationsStreamByQuery(libraryID, query, limit, scope);
  }
  const ids = await searchItemIds(libraryID, [
    ["itemType", "is", "annotation"],
    [
      "dateModified",
      "isInTheLast",
      `${MY_ANNOTATIONS_STREAM_LOOKBACK_DAYS} days`,
    ],
  ]);
  const rows: MyAnnotationStreamEntry[] = [];
  for (const id of ids) {
    const item = resolveItem(id);
    if (!item) {
      continue;
    }
    try {
      if (item.deleted) {
        continue;
      }
    } catch {
      continue;
    }
    const row = mapAnnotationStreamEntry(item);
    if (row) {
      rows.push(row);
    }
  }
  rows.sort(compareAnnotationNewestFirst);
  const hasMore = rows.length > limit;
  return {
    rows: rows.slice(0, limit),
    hasMore,
    colors: collectAnnotationColors(rows.map((row) => row.color)),
  };
}

export const MY_ANNOTATIONS_ITEM_LIMIT = 20;
export const MY_ANNOTATIONS_LOOKBACK_DAYS = 365;

async function loadChildItems(item: Zotero.Item): Promise<void> {
  try {
    await item.loadDataType("childItems");
  } catch {
    // Already loaded, or this object does not carry child-item data.
  }
}

/** All annotations under a parent item's file attachments (newest first). */
export async function annotationsForParent(
  parent: Zotero.Item,
): Promise<ExplorerAnnotation[]> {
  const stream = await annotationsStreamForParent(parent);
  return stream.map((row) => ({
    id: row.id,
    text: row.quote || row.comment,
    color: row.color,
    dateModified: row.dateModified,
    parent: row.parent,
  }));
}

/** Stream rows (quote/comment/page) for all annotations under a parent. */
export async function annotationsStreamForParent(
  parent: Zotero.Item,
): Promise<MyAnnotationStreamEntry[]> {
  await loadChildItems(parent);
  let attachmentIds: number[];
  try {
    attachmentIds = parent.getAttachments();
  } catch {
    return [];
  }
  const rows: MyAnnotationStreamEntry[] = [];
  for (const attId of attachmentIds) {
    const att = resolveItem(attId);
    if (!att) {
      continue;
    }
    if (
      typeof att.isFileAttachment !== "function" ||
      !att.isFileAttachment() ||
      typeof att.getAnnotations !== "function"
    ) {
      continue;
    }
    await loadChildItems(att);
    let annotations: Zotero.Item[];
    try {
      annotations = att.getAnnotations(false) || [];
    } catch {
      continue;
    }
    for (const ann of annotations) {
      try {
        if (ann.deleted) {
          continue;
        }
      } catch {
        continue;
      }
      const row = mapAnnotationStreamEntry(ann);
      if (!row) {
        continue;
      }
      // Attachments' getAnnotations() rows may not resolve parent via parentItem
      // the same way library annotation search does — pin the known parent.
      rows.push({ ...row, parent });
    }
  }
  return rows.sort(compareAnnotationNewestFirst);
}

function maxLastReadForParent(parent: Zotero.Item): number {
  let best = 0;
  let attachmentIds: number[];
  try {
    attachmentIds = parent.getAttachments();
  } catch {
    return 0;
  }
  for (const attId of attachmentIds) {
    const att = resolveItem(attId);
    if (!att) {
      continue;
    }
    best = Math.max(best, attachmentLastReadSeconds(att));
  }
  return best;
}

export async function searchMyAnnotatedRecentlyRead(
  libraryID: number,
  limit = MY_ANNOTATIONS_ITEM_LIMIT,
): Promise<ExplorerAnnotationGroup[]> {
  const candidates = await searchRecentlyReadItems(
    libraryID,
    MY_ANNOTATIONS_LOOKBACK_DAYS,
    Math.max(limit * 5, limit),
  );
  const groups: ExplorerAnnotationGroup[] = [];
  for (const parent of candidates) {
    const annotations = await annotationsForParent(parent);
    if (annotations.length === 0) {
      continue;
    }
    groups.push({
      parent,
      annotations,
      lastRead: maxLastReadForParent(parent),
    });
    if (groups.length >= limit) {
      break;
    }
  }
  return groups;
}

export async function searchSavedSearchItems(
  libraryID: number,
  searchKey: string,
  limit: number,
): Promise<Zotero.Item[]> {
  try {
    const saved = Zotero.Searches.getByLibraryAndKey(libraryID, searchKey);
    if (!saved || saved.deleted) {
      return [];
    }
    const ids = await saved.search();
    if (!Array.isArray(ids)) {
      return [];
    }
    const items: Zotero.Item[] = [];
    const seen = new Set<number>();
    for (const id of ids) {
      if (typeof id !== "number" || seen.has(id)) {
        continue;
      }
      const item = resolveItem(id);
      if (!item || !isSyllabusMemberItem(item)) {
        continue;
      }
      seen.add(id);
      items.push(item);
      if (items.length >= limit) {
        break;
      }
    }
    return items;
  } catch (error) {
    ztoolkit.log("Explorer saved search failed:", error);
    return [];
  }
}

export type ExplorerQuerySnapshot = {
  recentItems: Zotero.Item[];
  recentlyRead: Zotero.Item[];
  feedItems: Zotero.Item[];
  annotations: MyAnnotationStreamEntry[];
  savedSearchItems: Record<string, Zotero.Item[]>;
};

function emptySnapshot(): ExplorerQuerySnapshot {
  return {
    recentItems: [],
    recentlyRead: [],
    feedItems: [],
    annotations: [],
    savedSearchItems: {},
  };
}

function shelvesNeedFeeds(shelves: ExplorerShelf[]): boolean {
  return shelves.some((shelf) => shelf.type === "recent-in-feed");
}

function shelvesNeedAnnotations(shelves: ExplorerShelf[]): boolean {
  return shelves.some((shelf) => shelf.type === "recent-annotations");
}

function maxRecentlyRead(shelves: ExplorerShelf[]): {
  days: number;
  limit: number;
} {
  let days = 30;
  let limit = 10;
  for (const shelf of shelves) {
    if (shelf.type === "recently-read") {
      days = Math.max(days, shelf.days);
      limit = Math.max(limit, shelf.limit);
    }
  }
  return { days, limit };
}

async function loadExplorerSnapshot(
  libraryID: number,
  shelves: ExplorerShelf[],
): Promise<ExplorerQuerySnapshot> {
  const recentlyRead = maxRecentlyRead(shelves);
  const savedSearchShelves = shelves.filter(
    (shelf): shelf is Extract<ExplorerShelf, { type: "saved-search" }> =>
      shelf.type === "saved-search",
  );
  const [
    recentItems,
    recentlyReadItems,
    feedItems,
    annotations,
    savedSearchRows,
  ] = await Promise.all([
    searchRecentLibraryItems(libraryID, EXPLORER_FEATURED_LOOKBACK_DAYS),
    searchRecentlyReadItems(libraryID, recentlyRead.days, recentlyRead.limit),
    shelvesNeedFeeds(shelves)
      ? searchRecentFeedItems(
          Math.max(
            ...shelves
              .filter(
                (
                  shelf,
                ): shelf is Extract<
                  ExplorerShelf,
                  { type: "recent-in-feed" }
                > => shelf.type === "recent-in-feed",
              )
              .map((shelf) => shelf.days),
            7,
          ),
        )
      : Promise.resolve([]),
    shelvesNeedAnnotations(shelves)
      ? searchRecentAnnotations(
          libraryID,
          Math.max(
            ...shelves
              .filter(
                (
                  shelf,
                ): shelf is Extract<
                  ExplorerShelf,
                  { type: "recent-annotations" }
                > => shelf.type === "recent-annotations",
              )
              .map((shelf) => shelf.limit),
            20,
          ),
        )
      : Promise.resolve([]),
    Promise.all(
      savedSearchShelves.map(async (shelf) => {
        const items = await searchSavedSearchItems(
          shelf.libraryID,
          shelf.searchKey,
          EXPLORER_ARTICLE_DESK_LIMIT * 2,
        );
        return [
          savedSearchShelfKey(shelf.libraryID, shelf.searchKey),
          items,
        ] as const;
      }),
    ),
  ]);
  return {
    recentItems,
    recentlyRead: recentlyReadItems,
    feedItems,
    annotations,
    savedSearchItems: Object.fromEntries(savedSearchRows),
  };
}

type ExplorerQueryKey = { libraryID: number; shelvesKey: string };

type ExplorerQueryCache = {
  data: ExplorerQuerySnapshot;
  generation: number;
};

const explorerQueryCache = new Map<string, ExplorerQueryCache>();

function explorerQueryCacheKey(key: ExplorerQueryKey): string {
  return `${key.libraryID}:${key.shelvesKey}`;
}

const explorerQueryAtomFamily = atomFamilyFromExternal(
  (key: ExplorerQueryKey) => {
    const cacheKey = explorerQueryCacheKey(key);
    if (!explorerQueryCache.has(cacheKey)) {
      explorerQueryCache.set(cacheKey, {
        data: emptySnapshot(),
        generation: 0,
      });
    }
    const shelves: ExplorerShelf[] = JSON.parse(key.shelvesKey);
    let loadToken = 0;

    return {
      getSnapshot: () => explorerQueryCache.get(cacheKey)!.generation,
      initial: 0,
      subscribe: (onStoreChange: () => void) => {
        const bump = (data?: ExplorerQuerySnapshot) => {
          const cache = explorerQueryCache.get(cacheKey)!;
          if (data) {
            cache.data = data;
          }
          cache.generation += 1;
          onStoreChange();
        };

        const reload = async () => {
          const token = ++loadToken;
          const next = await loadExplorerSnapshot(key.libraryID, shelves);
          if (token !== loadToken) {
            return;
          }
          bump(next);
        };

        const debounced = createDebouncedReload(reload);
        const notifierID = Zotero.Notifier.registerObserver(
          { notify: () => debounced.schedule() },
          ["item", "collection", "feed", "collection-item", "search"],
        );
        void reload();

        return () => {
          Zotero.Notifier.unregisterObserver(notifierID);
          debounced.cancel();
          loadToken += 1;
        };
      },
    };
  },
  (a, b) => a.libraryID === b.libraryID && a.shelvesKey === b.shelvesKey,
);

export function useExplorerQueryData(
  libraryID: number,
  shelves: ExplorerShelf[],
): ExplorerQuerySnapshot {
  const shelvesKey = useMemo(
    () =>
      JSON.stringify(
        shelves.map((shelf) => ({
          type: shelf.type,
          days: "days" in shelf ? shelf.days : 0,
          limit: "limit" in shelf ? shelf.limit : 0,
          libraryID: "libraryID" in shelf ? shelf.libraryID : 0,
          collectionKey: "collectionKey" in shelf ? shelf.collectionKey : "",
          searchKey: "searchKey" in shelf ? shelf.searchKey : "",
        })),
      ),
    [shelves],
  );
  const key = useMemo(
    () => ({ libraryID, shelvesKey }),
    [libraryID, shelvesKey],
  );
  useAtomValue(explorerQueryAtomFamily(key));
  return (
    explorerQueryCache.get(explorerQueryCacheKey(key))?.data ?? emptySnapshot()
  );
}

const myAnnotatedRecentlyReadCache = new Map<
  number,
  { data: ExplorerAnnotationGroup[]; generation: number }
>();

const myAnnotatedRecentlyReadAtomFamily = atomFamilyFromExternal(
  (libraryID: number) => {
    if (!myAnnotatedRecentlyReadCache.has(libraryID)) {
      myAnnotatedRecentlyReadCache.set(libraryID, {
        data: [],
        generation: 0,
      });
    }
    let loadToken = 0;

    return {
      getSnapshot: () =>
        myAnnotatedRecentlyReadCache.get(libraryID)!.generation,
      initial: 0,
      subscribe: (onStoreChange: () => void) => {
        const bump = (data?: ExplorerAnnotationGroup[]) => {
          const cache = myAnnotatedRecentlyReadCache.get(libraryID)!;
          if (data) {
            cache.data = data;
          }
          cache.generation += 1;
          onStoreChange();
        };

        const reload = async () => {
          const token = ++loadToken;
          const next = await searchMyAnnotatedRecentlyRead(libraryID);
          if (token !== loadToken) {
            return;
          }
          bump(next);
        };

        const debounced = createDebouncedReload(reload);
        const notifierID = Zotero.Notifier.registerObserver(
          { notify: () => debounced.schedule() },
          ["item"],
        );
        void reload();

        return () => {
          Zotero.Notifier.unregisterObserver(notifierID);
          debounced.cancel();
          loadToken += 1;
        };
      },
    };
  },
);

export function useMyAnnotatedRecentlyRead(
  libraryID: number,
): ExplorerAnnotationGroup[] {
  useAtomValue(myAnnotatedRecentlyReadAtomFamily(libraryID));
  return myAnnotatedRecentlyReadCache.get(libraryID)?.data ?? [];
}

export type MyAnnotationsStreamState = {
  rows: MyAnnotationStreamEntry[];
  colors: string[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  loadPrevious: () => Promise<void>;
};

type MyAnnotationsStreamKey = {
  libraryID: number;
  query: string;
  scope: MyAnnotationsSearchScope;
};

type MyAnnotationsStreamCache = {
  rows: MyAnnotationStreamEntry[];
  colors: string[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  loadedLimit: number;
  generation: number;
  loadPrevious: () => Promise<void>;
};

const myAnnotationsStreamCache = new Map<string, MyAnnotationsStreamCache>();

function myAnnotationsStreamCacheKey(key: MyAnnotationsStreamKey): string {
  return `${key.libraryID}:${key.scope}:${key.query}`;
}

function emptyStreamCache(): Omit<MyAnnotationsStreamCache, "loadPrevious"> {
  return {
    rows: [],
    colors: [],
    hasMore: false,
    loading: true,
    loadingMore: false,
    loadedLimit: MY_ANNOTATIONS_STREAM_PAGE_SIZE,
    generation: 0,
  };
}

const myAnnotationsStreamAtomFamily = atomFamilyFromExternal(
  (key: MyAnnotationsStreamKey) => {
    const cacheKey = myAnnotationsStreamCacheKey(key);
    let loadToken = 0;
    let notify: (() => void) | null = null;

    const ensureCache = (): MyAnnotationsStreamCache => {
      let cache = myAnnotationsStreamCache.get(cacheKey);
      if (!cache) {
        const base = emptyStreamCache();
        cache = {
          ...base,
          loadPrevious: async () => {
            /* replaced below */
          },
        };
        myAnnotationsStreamCache.set(cacheKey, cache);
      }
      return cache;
    };

    const bump = (patch?: Partial<MyAnnotationsStreamCache>) => {
      const cache = ensureCache();
      if (patch) {
        Object.assign(cache, patch);
      }
      cache.generation += 1;
      notify?.();
    };

    const reload = async (mode: "initial" | "refresh" | "more") => {
      const cache = ensureCache();
      const token = ++loadToken;
      if (mode === "more") {
        bump({ loadingMore: true });
      } else if (mode === "initial") {
        bump({
          loading: true,
          rows: [],
          colors: [],
          hasMore: false,
          loadedLimit: MY_ANNOTATIONS_STREAM_PAGE_SIZE,
        });
      }
      try {
        const limit =
          mode === "more"
            ? cache.loadedLimit + MY_ANNOTATIONS_STREAM_PAGE_SIZE
            : Math.max(MY_ANNOTATIONS_STREAM_PAGE_SIZE, cache.loadedLimit);
        const next = await searchMyAnnotationsStream(key.libraryID, {
          limit,
          query: key.query,
          scope: key.scope,
        });
        if (token !== loadToken) {
          return;
        }
        bump({
          rows: next.rows,
          colors: next.colors,
          hasMore: next.hasMore,
          loadedLimit: limit,
          loading: false,
          loadingMore: false,
        });
      } catch {
        if (token === loadToken) {
          bump({ loading: false, loadingMore: false });
        }
      }
    };

    ensureCache().loadPrevious = async () => {
      const cache = ensureCache();
      if (!cache.hasMore || cache.loadingMore || cache.loading) {
        return;
      }
      await reload("more");
    };

    return {
      getSnapshot: () => ensureCache().generation,
      initial: 0,
      subscribe: (onStoreChange: () => void) => {
        notify = onStoreChange;
        const debounced = createDebouncedReload(() => reload("refresh"));
        const notifierID = Zotero.Notifier.registerObserver(
          { notify: () => debounced.schedule() },
          ["item"],
        );
        void reload("initial");
        return () => {
          notify = null;
          Zotero.Notifier.unregisterObserver(notifierID);
          debounced.cancel();
          loadToken += 1;
        };
      },
    };
  },
  (a, b) =>
    a.libraryID === b.libraryID && a.query === b.query && a.scope === b.scope,
);

export function useMyAnnotationsStream(
  libraryID: number,
  query = "",
  scope: MyAnnotationsSearchScope = "both",
): MyAnnotationsStreamState {
  const key = useMemo(
    (): MyAnnotationsStreamKey => ({
      libraryID,
      query: normalizeMyAnnotationsSearchQuery(query),
      scope: coerceMyAnnotationsSearchScope(scope),
    }),
    [libraryID, query, scope],
  );
  useAtomValue(myAnnotationsStreamAtomFamily(key));
  const cacheKey = myAnnotationsStreamCacheKey(key);
  const cache =
    myAnnotationsStreamCache.get(cacheKey) ??
    ({
      ...emptyStreamCache(),
      loadPrevious: async () => {},
    } satisfies MyAnnotationsStreamCache);

  const loadPrevious = useCallback(async () => {
    await myAnnotationsStreamCache.get(cacheKey)?.loadPrevious();
  }, [cacheKey]);

  return {
    rows: cache.rows,
    colors: cache.colors,
    hasMore: cache.hasMore,
    loading: cache.loading,
    loadingMore: cache.loadingMore,
    loadPrevious,
  };
}
