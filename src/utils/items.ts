import { getCachedItem } from "./cache";
import { compareLocale } from "./locale";

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
 */
export function isSyllabusMemberItem(
  item: Zotero.Item | false | null | undefined,
): item is Zotero.Item {
  if (!item) {
    return false;
  }
  try {
    if (item.deleted) {
      return false;
    }
    if (typeof item.isRegularItem !== "function" || !item.isRegularItem()) {
      return false;
    }
    const isFeedItem = item.isFeedItem as boolean | (() => boolean);
    if (typeof isFeedItem === "function" ? isFeedItem.call(item) : isFeedItem) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function sortItemsByTitle(items: Zotero.Item[]): Zotero.Item[] {
  return [...items].sort((a, b) =>
    compareLocale(getItemTitle(a), getItemTitle(b)),
  );
}

/** First creator last name then given name. Empty if the item has no creator. */
function itemCreatorSortKey(item: Zotero.Item): string {
  try {
    const creators = item.getCreators();
    if (creators && creators.length > 0) {
      const first = creators[0];
      const last = String(first.lastName || "").trim();
      const given = String(first.firstName || "").trim();
      const key = `${last} ${given}`.trim();
      if (key) {
        return key;
      }
    }
    return String(item.firstCreator || "").trim();
  } catch {
    return "";
  }
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

export type ItemSortMode = "auto" | "title" | "creator" | "date";

export function sortItems(
  items: Zotero.Item[],
  mode: ItemSortMode,
): Zotero.Item[] {
  if (mode === "date") {
    return sortItemsByDate(items);
  }
  if (mode === "creator") {
    return sortItemsByCreator(items);
  }
  if (mode === "title") {
    return sortItemsByTitle(items);
  }
  return [...items];
}

/** Open the first viewable attachment, or the item URL if none. */
export function openItemBestAttachment(item: Zotero.Item): void {
  const attachments = item.getAttachments();
  const viewableAttachment = attachments.find((attId) => {
    const att = getCachedItem(attId);
    return !!(att && att.isAttachment());
  });
  if (viewableAttachment) {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    void pane.viewPDF(viewableAttachment, { page: 1 } as any);
    return;
  }
  const url = item.getField("url");
  if (url) {
    Zotero.launchURL(url);
  }
}
