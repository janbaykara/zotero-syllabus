import { getCachedItem } from "./cache";

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

export function sortItemsByTitle(items: Zotero.Item[]): Zotero.Item[] {
  return [...items].sort((a, b) =>
    getItemTitle(a).localeCompare(getItemTitle(b)),
  );
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
      return getItemTitle(a).localeCompare(getItemTitle(b));
    }
    if (dateA === 0) return 1;
    if (dateB === 0) return -1;
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    return getItemTitle(a).localeCompare(getItemTitle(b));
  });
}

export type ItemSortMode = "auto" | "title" | "date";

export function sortItems(
  items: Zotero.Item[],
  mode: ItemSortMode,
): Zotero.Item[] {
  if (mode === "date") {
    return sortItemsByDate(items);
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
