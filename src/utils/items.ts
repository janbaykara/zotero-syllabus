import { getCachedItem } from "./cache";
import { compareLocale } from "./locale";
import { pageIndexForPrintedLabel, readPdfPageLabels } from "./pdfPageLabels";

/**
 * Display title for any item type. `getField("title")` is empty for types that
 * map title to another field (case → caseName, statute → nameOfAct, email → subject).
 */
export function getItemTitle(item: Zotero.Item): string {
  try {
    return String(item.getDisplayTitle() || "").trim();
  } catch {
    return "";
  }
}

/**
 * Localized primary-creator line from Zotero (`firstCreator`). Uses the
 * item type’s primary creator (inventor, director, interviewee, …), not
 * a hardcoded author filter or English “and” / “et al.”
 */
export function getItemCreatorLine(item: Zotero.Item): string {
  try {
    const fromProp = String(item.firstCreator || "").trim();
    if (fromProp) {
      return fromProp;
    }
    return String(item.getField("firstCreator") || "").trim();
  } catch {
    return "";
  }
}

function creatorFullName(creator: {
  firstName?: string;
  lastName?: string;
  fieldMode?: number;
}): string {
  const last = String(creator.lastName || "").trim();
  const first = String(creator.firstName || "").trim();
  if (creator.fieldMode === 1 || !first) {
    return last;
  }
  return `${first} ${last}`.trim();
}

function joinCreatorByline(names: string[]): string {
  if (names.length === 0) {
    return "";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    try {
      const and = Zotero.getString("general.and");
      if (and) {
        return `${names[0]} ${and} ${names[1]}`;
      }
    } catch {
      // Fall through to the locale list formatter.
    }
    try {
      return new Intl.ListFormat(Zotero.locale || undefined, {
        style: "long",
        type: "conjunction",
      }).format(names);
    } catch {
      return `${names[0]}, ${names[1]}`;
    }
  }
  try {
    const etAl = Zotero.getString("general.etAl");
    if (etAl) {
      return `${names[0]} ${etAl}`;
    }
  } catch {
    // Fall through.
  }
  return names[0];
}

/**
 * Magazine byline: primary creators with given names, same 1 / 2 / et al.
 * grouping as `firstCreator`.
 */
export function getItemCreatorByline(item: Zotero.Item): string {
  try {
    const creators = item.getCreators() || [];
    if (creators.length === 0) {
      return getItemCreatorLine(item);
    }
    let primaryTypeID: number | false | null = null;
    try {
      primaryTypeID = Zotero.CreatorTypes.getPrimaryIDForType(item.itemTypeID);
    } catch {
      primaryTypeID = null;
    }
    const primary = primaryTypeID
      ? creators.filter((creator) => creator.creatorTypeID === primaryTypeID)
      : [];
    const used = primary.length > 0 ? primary : creators;
    const names = used.map(creatorFullName).filter(Boolean);
    if (names.length > 0) {
      return joinCreatorByline(names);
    }
    return getItemCreatorLine(item);
  } catch {
    return getItemCreatorLine(item);
  }
}

/**
 * Field value with Zotero base-field mapping. `getField("date")` is empty for
 * types that store it under another name (case → dateDecided, statute →
 * dateEnacted, patent → issueDate); same for publicationTitle, publisher, pages.
 * Title still goes through `getDisplayTitle` so untitled letters/interviews
 * keep their synthesized names.
 */
export function getItemField(item: Zotero.Item, field: string): string {
  if (field === "title") {
    return getItemTitle(item);
  }
  try {
    return String(item.getField(field, false, true) || "").trim();
  } catch {
    return "";
  }
}

/** Strip HTML and leading “Abstract” boilerplate from `abstractNote` text. */
export function snippetFromAbstractNote(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^(?:research highlights(?:\s+and)?\s+)?abstracts?\b[\s:,.\-–—]*/i,
      "",
    )
    .replace(/(?:,\s*){2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getItemAbstractSnippet(item: Zotero.Item): string {
  return snippetFromAbstractNote(getItemField(item, "abstractNote"));
}

/**
 * Note HTML, or "" if this is not a note. Zotero 9 throws
 * `getNote() can only be called on notes and attachments` when the item is a
 * book (Better BibTeX #3541, Zotero 9.0.5).
 */
export function readItemNote(
  item: Zotero.Item | false | null | undefined,
): string {
  try {
    if (!item || typeof item.isNote !== "function" || !item.isNote()) {
      return "";
    }
    return String(item.getNote() || "");
  } catch {
    return "";
  }
}

/**
 * Regular library items that belong on a syllabus. Skips notes, attachments,
 * annotations, deleted items, and feed items (BBT: feeds are not user library
 * members even when isRegularItem() is true on some versions).
 *
 * Pass `{ includeDeleted: true }` for trash/bin views so Gallery can list
 * trashed regular items. Pass `{ includeFeedItems: true }` for RSS feed rows.
 */
export function isSyllabusMemberItem(
  item: Zotero.Item | false | null | undefined,
  options?: { includeDeleted?: boolean; includeFeedItems?: boolean },
): item is Zotero.Item {
  if (!item) {
    return false;
  }
  try {
    if (item.deleted && !options?.includeDeleted) {
      return false;
    }
    if (typeof item.isRegularItem !== "function" || !item.isRegularItem()) {
      return false;
    }
    const isFeedItem = item.isFeedItem as boolean | (() => boolean);
    const feedItem =
      typeof isFeedItem === "function" ? isFeedItem.call(item) : isFeedItem;
    if (feedItem && !options?.includeFeedItems) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Top-level file in a collection, before Recognize Document creates a parent. */
export function isStandaloneAttachment(
  item: Zotero.Item | false | null | undefined,
): item is Zotero.Item {
  if (!item) {
    return false;
  }
  try {
    if (item.deleted) {
      return false;
    }
    if (typeof item.isAttachment !== "function" || !item.isAttachment()) {
      return false;
    }
    return !item.parentItemID;
  } catch {
    return false;
  }
}

export function isAssignedStandaloneAttachment(
  item: Zotero.Item | false | null | undefined,
  assignedKeys: ReadonlySet<string>,
): item is Zotero.Item {
  return isStandaloneAttachment(item) && assignedKeys.has(item.key);
}

/** Regular readings plus standalone files assigned on the syllabus. */
export function isSyllabusAssignableItem(
  item: Zotero.Item | false | null | undefined,
): item is Zotero.Item {
  return isSyllabusMemberItem(item) || isStandaloneAttachment(item);
}

/** Bibliographic parent after a standalone attachment is recognized. */
export function regularParentItem(
  item: Zotero.Item | false | null | undefined,
): Zotero.Item | null {
  if (!item) {
    return null;
  }
  try {
    if (item.deleted || item.isNote()) {
      return null;
    }
    if (typeof item.isRegularItem === "function" && item.isRegularItem()) {
      return null;
    }
    let parent: Zotero.Item | false | undefined = item.parentItem;
    if (!parent && item.parentItemID) {
      try {
        parent = Zotero.Items.get(item.parentItemID) || false;
      } catch {
        parent = false;
      }
      if (!parent) {
        parent = getCachedItem(item.parentItemID);
      }
    }
    if (!parent || parent.deleted) {
      return null;
    }
    if (typeof parent.isRegularItem !== "function" || !parent.isRegularItem()) {
      return null;
    }
    if (parent.libraryID !== item.libraryID) {
      return null;
    }
    return parent;
  } catch {
    return null;
  }
}

export function sortItemsByTitle(items: Zotero.Item[]): Zotero.Item[] {
  return [...items].sort((a, b) =>
    compareLocale(getItemTitle(a), getItemTitle(b)),
  );
}

export type ItemPrimaryCreatorName = {
  sortKey: string;
  label: string;
};

function creatorDisplayLabel(last: string, given: string): string {
  if (last && given) {
    return `${last}, ${given}`;
  }
  return last || given;
}

/** First creator last name then given name. Null if the item has no creator. */
export function getItemPrimaryCreatorName(
  item: Zotero.Item,
): ItemPrimaryCreatorName | null {
  try {
    const creators = item.getCreators();
    if (creators && creators.length > 0) {
      const first = creators[0];
      const last = String(first.lastName || "").trim();
      const given = String(first.firstName || "").trim();
      const sortKey = `${last} ${given}`.trim();
      if (sortKey) {
        return { sortKey, label: creatorDisplayLabel(last, given) };
      }
    }
    const fallback = String(item.firstCreator || "").trim();
    if (fallback) {
      return { sortKey: fallback, label: fallback };
    }
  } catch {
    // Ignore unreadable creator fields.
  }
  return null;
}

/** First creator last name then given name. Empty if the item has no creator. */
function itemCreatorSortKey(item: Zotero.Item): string {
  return getItemPrimaryCreatorName(item)?.sortKey ?? "";
}

/** A–Z by first creator; items with no creator last; title as tiebreaker. */
export function sortItemsByCreator(items: Zotero.Item[]): Zotero.Item[] {
  return [...items].sort((a, b) => {
    const creatorA = itemCreatorSortKey(a);
    const creatorB = itemCreatorSortKey(b);
    if (!creatorA && !creatorB) {
      return compareLocale(getItemTitle(a), getItemTitle(b));
    }
    if (!creatorA) return 1;
    if (!creatorB) return -1;
    const byCreator = compareLocale(creatorA, creatorB);
    if (byCreator !== 0) {
      return byCreator;
    }
    return compareLocale(getItemTitle(a), getItemTitle(b));
  });
}

/** Publication date as a timestamp. Missing dates are 0. */
function itemPublicationDate(item: Zotero.Item): number {
  try {
    const date = getItemField(item, "date");
    if (!date) {
      return 0;
    }
    const iso = Zotero.Date.strToISO(date);
    if (iso) {
      const parsed = Date.parse(iso);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    const parsed = Date.parse(date);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    const year = date.match(/\d{4}/);
    if (year) {
      return Date.UTC(Number(year[0]), 0, 1);
    }
  } catch {
    // Ignore unreadable date fields.
  }
  return 0;
}

function itemDateAdded(item: Zotero.Item): number {
  try {
    const added = Date.parse(item.dateAdded);
    if (!Number.isNaN(added)) {
      return added;
    }
  } catch {
    // Ignore unreadable dateAdded.
  }
  return 0;
}

/** Newest publication date first; undated items last; title as tiebreaker. */
export function sortItemsByDate(items: Zotero.Item[]): Zotero.Item[] {
  return [...items].sort((a, b) => {
    const dateA = itemPublicationDate(a);
    const dateB = itemPublicationDate(b);
    if (dateA === 0 && dateB === 0) {
      const added = itemDateAdded(b) - itemDateAdded(a);
      if (added !== 0) {
        return added;
      }
      return compareLocale(getItemTitle(a), getItemTitle(b));
    }
    if (dateA === 0) return 1;
    if (dateB === 0) return -1;
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    return compareLocale(getItemTitle(a), getItemTitle(b));
  });
}

/** Newest date added first; missing dates last; title as tiebreaker. */
export function sortItemsByDateAdded(items: Zotero.Item[]): Zotero.Item[] {
  return [...items].sort((a, b) => {
    const addedA = itemDateAdded(a);
    const addedB = itemDateAdded(b);
    if (addedA === 0 && addedB === 0) {
      return compareLocale(getItemTitle(a), getItemTitle(b));
    }
    if (addedA === 0) return 1;
    if (addedB === 0) return -1;
    if (addedA !== addedB) {
      return addedB - addedA;
    }
    return compareLocale(getItemTitle(a), getItemTitle(b));
  });
}

export type ItemSortMode =
  "auto" | "lastRead" | "title" | "creator" | "date" | "dateAdded";

export function sortItems(
  items: Zotero.Item[],
  mode: ItemSortMode,
): Zotero.Item[] {
  if (mode === "date") {
    return sortItemsByDate(items);
  }
  if (mode === "dateAdded") {
    return sortItemsByDateAdded(items);
  }
  if (mode === "creator") {
    return sortItemsByCreator(items);
  }
  if (mode === "title") {
    return sortItemsByTitle(items);
  }
  // auto / lastRead: keep caller order (last-read order is applied upstream)
  return [...items];
}

export type ReaderOpenLocation = {
  attachmentID?: number;
  pageIndex?: number;
  pageLabel?: string;
};

/** Child attachment IDs, or [] for standalone attachments (Zotero throws). */
export function getChildAttachmentIds(item: Zotero.Item): number[] {
  try {
    if (typeof item.isAttachment === "function" && item.isAttachment()) {
      return [];
    }
    return item.getAttachments() || [];
  } catch {
    return [];
  }
}

/** Files to show/open: children, or the item itself when it is an attachment. */
export function getViewableAttachmentIds(item: Zotero.Item): number[] {
  try {
    if (typeof item.isAttachment === "function" && item.isAttachment()) {
      return item.id ? [item.id] : [];
    }
  } catch {
    // Fall through to child lookup.
  }
  return getChildAttachmentIds(item);
}

function firstViewableAttachmentId(item: Zotero.Item): number {
  return getViewableAttachmentIds(item)[0] || 0;
}

/** Open the first viewable attachment, or the item URL if none. */
export function openItemBestAttachment(item: Zotero.Item): void {
  const viewableAttachment = firstViewableAttachmentId(item);
  if (viewableAttachment) {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    void pane.viewPDF(viewableAttachment);
    return;
  }
  const url = item.getField("url");
  if (url) {
    Zotero.launchURL(url);
  }
}

type ReaderNavigateLocation = {
  pageIndex?: number;
  annotationID?: string;
  annotationKey?: string;
};

async function openAttachmentAtReaderLocation(
  attachmentID: number,
  location?: ReaderNavigateLocation,
): Promise<void> {
  try {
    const attachment = await Zotero.Items.getAsync(attachmentID);
    if (!attachment) {
      ztoolkit.log(
        "openAttachmentAtReaderLocation: attachment not found",
        attachmentID,
      );
      return;
    }
    // Prefer FileHandlers (respects external PDF reader prefs) then Reader.
    const opened = await Zotero.FileHandlers.open(attachment, { location });
    if (opened) {
      return;
    }
  } catch (error) {
    ztoolkit.log(
      "openAttachmentAtReaderLocation: FileHandlers.open failed",
      error,
    );
  }

  try {
    await Zotero.Reader.open(attachmentID, location);
  } catch (error) {
    ztoolkit.log("openAttachmentAtReaderLocation: Reader.open failed", error);
  }
}

async function labelsFromOpenReader(
  attachmentID: number,
): Promise<string[] | null> {
  try {
    const readers = (
      Zotero.Reader as {
        _readers?: Array<{
          itemID?: number;
          _iframeWindow?: {
            PDFViewerApplication?: {
              pdfDocument?: { getPageLabels?: () => Promise<string[]> };
            };
            wrappedJSObject?: {
              PDFViewerApplication?: {
                pdfDocument?: { getPageLabels?: () => Promise<string[]> };
              };
            };
          };
        }>;
      }
    )._readers;
    const reader = readers?.find((entry) => entry.itemID === attachmentID);
    const win = reader?._iframeWindow;
    const app =
      win?.PDFViewerApplication || win?.wrappedJSObject?.PDFViewerApplication;
    const labels = await app?.pdfDocument?.getPageLabels?.();
    return Array.isArray(labels) ? labels : null;
  } catch {
    return null;
  }
}

async function labelsFromPdfFile(
  attachmentID: number,
): Promise<string[] | null> {
  try {
    const attachment = await Zotero.Items.getAsync(attachmentID);
    if (!attachment) {
      return null;
    }
    const path = (await (attachment as Zotero.Item).getFilePathAsync()) || "";
    if (!path || typeof IOUtils === "undefined") {
      return null;
    }
    const bytes = await IOUtils.read(path);
    return readPdfPageLabels(bytes);
  } catch (error) {
    ztoolkit.log("labelsFromPdfFile failed:", error);
    return null;
  }
}

async function resolvePrintedPageIndex(
  attachmentID: number,
  pageLabel?: string,
): Promise<number | undefined> {
  const want = String(pageLabel || "").trim();
  if (!want) {
    return undefined;
  }
  const fromReader = await labelsFromOpenReader(attachmentID);
  if (fromReader) {
    return pageIndexForPrintedLabel(fromReader, want);
  }
  const fromFile = await labelsFromPdfFile(attachmentID);
  if (fromFile) {
    return pageIndexForPrintedLabel(fromFile, want);
  }
  return undefined;
}

/** Open the best attachment, optionally scrolled to a 0-based PDF page. */
export function openItemAtReaderLocation(
  item: Zotero.Item,
  location?: ReaderOpenLocation | null,
): void {
  void (async () => {
    try {
      const attachmentID =
        Number(location?.attachmentID || 0) || firstViewableAttachmentId(item);
      if (!attachmentID) {
        const url = item.getField("url");
        if (url) {
          Zotero.launchURL(url);
        }
        return;
      }
      const fromLabel = await resolvePrintedPageIndex(
        attachmentID,
        location?.pageLabel,
      );
      const pageIndex = fromLabel != null ? fromLabel : location?.pageIndex;
      const readerLocation =
        typeof pageIndex === "number" && pageIndex >= 0
          ? { pageIndex }
          : undefined;
      await openAttachmentAtReaderLocation(attachmentID, readerLocation);
    } catch (error) {
      ztoolkit.log("openItemAtReaderLocation failed:", error);
    }
  })();
}

/**
 * Open the PDF/EPUB reader scrolled to a specific annotation
 * (same path Zotero uses when double-clicking an annotation item).
 */
export async function openAnnotationInReader(
  annotation: Zotero.Item,
): Promise<void> {
  try {
    if (
      typeof annotation.isAnnotation === "function" &&
      !annotation.isAnnotation()
    ) {
      ztoolkit.log(
        "openAnnotationInReader: item is not an annotation",
        annotation.id,
      );
      return;
    }
  } catch (error) {
    ztoolkit.log("openAnnotationInReader: isAnnotation check failed", error);
    return;
  }

  const key = String(annotation.key || "").trim();
  let attachmentID = Number(annotation.parentItemID || 0);
  if (!attachmentID) {
    try {
      const parent = annotation.parentItem;
      attachmentID = Number(parent?.id || 0);
    } catch {
      // Keep 0 when parent lookup fails.
    }
  }
  if (!attachmentID || !key) {
    ztoolkit.log("openAnnotationInReader: missing attachment or key", {
      id: annotation.id,
      attachmentID,
      key,
    });
    return;
  }

  const location = { annotationID: key, annotationKey: key };
  await openAttachmentAtReaderLocation(attachmentID, location);
}

/** Resolve an annotation by id and open it in the reader. */
export function openAnnotationIdInReader(annotationId: number): void {
  void (async () => {
    try {
      const item = await Zotero.Items.getAsync(annotationId);
      if (!item) {
        ztoolkit.log(
          "openAnnotationIdInReader: annotation not found",
          annotationId,
        );
        return;
      }
      await openAnnotationInReader(item);
    } catch (error) {
      ztoolkit.log("openAnnotationIdInReader failed", error);
    }
  })();
}
