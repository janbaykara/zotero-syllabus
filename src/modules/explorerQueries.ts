import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getCachedItem } from "../utils/cache";
import { isSyllabusMemberItem } from "../utils/items";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  normalizeHighlightColor,
} from "../utils/itemHighlights";
import { savedSearchShelfKey, type ExplorerShelf } from "./explorerConfig";

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
      attachmentIds = [];
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
    feeds = [];
  }
  if (!feeds.length) {
    try {
      feeds = Zotero.Libraries.getAll().filter(
        (library) => library.libraryType === "feed",
      );
    } catch {
      feeds = [];
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
): Promise<ExplorerAnnotation[]> {
  const ids = await searchItemIds(libraryID, [
    ["itemType", "is", "annotation"],
    ["dateModified", "isInTheLast", "90 days"],
  ]);
  const rows: ExplorerAnnotation[] = [];
  for (const id of ids) {
    const item = resolveItem(id);
    if (!item) {
      continue;
    }
    let text = "";
    try {
      text = String(item.annotationText || item.annotationComment || "").trim();
    } catch {
      text = "";
    }
    let color = DEFAULT_HIGHLIGHT_COLOR;
    try {
      color = normalizeHighlightColor(String(item.annotationColor || ""));
    } catch {
      color = DEFAULT_HIGHLIGHT_COLOR;
    }
    let parent: Zotero.Item | null = null;
    try {
      const attachment = item.parentItem;
      const work = attachment?.parentItem || attachment || null;
      parent = work && isSyllabusMemberItem(work) ? work : work || null;
      if (parent && !parent.isRegularItem?.()) {
        const grand = parent.parentItem;
        parent = grand && isSyllabusMemberItem(grand) ? grand : parent;
      }
    } catch {
      parent = null;
    }
    rows.push({
      id: item.id,
      text,
      color,
      dateModified: String(item.dateModified || ""),
      parent,
    });
  }
  return rows
    .sort(
      (a, b) => dateMs(b.dateModified) - dateMs(a.dateModified) || a.id - b.id,
    )
    .slice(0, limit);
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

async function annotationsForParent(
  parent: Zotero.Item,
): Promise<ExplorerAnnotation[]> {
  await loadChildItems(parent);
  let attachmentIds: number[] = [];
  try {
    attachmentIds = parent.getAttachments();
  } catch {
    return [];
  }
  const rows: ExplorerAnnotation[] = [];
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
    let annotations: Zotero.Item[] = [];
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
      let text = "";
      try {
        text = String(ann.annotationText || ann.annotationComment || "").trim();
      } catch {
        text = "";
      }
      let color = DEFAULT_HIGHLIGHT_COLOR;
      try {
        color = normalizeHighlightColor(String(ann.annotationColor || ""));
      } catch {
        color = DEFAULT_HIGHLIGHT_COLOR;
      }
      rows.push({
        id: ann.id,
        text,
        color,
        dateModified: String(ann.dateModified || ""),
        parent,
      });
    }
  }
  return rows.sort(
    (a, b) => dateMs(b.dateModified) - dateMs(a.dateModified) || a.id - b.id,
  );
}

function maxLastReadForParent(parent: Zotero.Item): number {
  let best = 0;
  let attachmentIds: number[] = [];
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
  annotations: ExplorerAnnotation[];
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

function createExplorerQueryStore(libraryID: number, shelvesKey: string) {
  let snapshot = emptySnapshot();
  let serialized = JSON.stringify({ n: 0 });
  let generation = 0;
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let loadToken = 0;
  const shelves: ExplorerShelf[] = JSON.parse(shelvesKey);

  function emit() {
    generation += 1;
    serialized = JSON.stringify({ n: generation });
    listeners.forEach((listener) => listener());
  }

  async function reload() {
    const token = ++loadToken;
    const next = await loadExplorerSnapshot(libraryID, shelves);
    if (token !== loadToken) {
      return;
    }
    snapshot = next;
    emit();
  }

  function scheduleReload() {
    if (debounce) {
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      debounce = null;
      void reload();
    }, 250);
  }

  return {
    getSnapshot: () => serialized,
    getData: () => snapshot,
    subscribe(onStoreChange: () => void) {
      listeners.add(onStoreChange);
      if (!notifierID) {
        notifierID = Zotero.Notifier.registerObserver(
          {
            notify: () => {
              scheduleReload();
            },
          },
          ["item", "collection", "feed", "collection-item", "search"],
        );
        void reload();
      }
      return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0 && notifierID) {
          Zotero.Notifier.unregisterObserver(notifierID);
          notifierID = null;
        }
        if (listeners.size === 0 && debounce) {
          clearTimeout(debounce);
          debounce = null;
        }
      };
    },
  };
}

export function useExplorerQueryData(
  libraryID: number,
  shelves: ExplorerShelf[],
): ExplorerQuerySnapshot {
  const shelvesKey = JSON.stringify(
    shelves.map((shelf) => ({
      type: shelf.type,
      days: "days" in shelf ? shelf.days : 0,
      limit: "limit" in shelf ? shelf.limit : 0,
      libraryID: "libraryID" in shelf ? shelf.libraryID : 0,
      collectionKey: "collectionKey" in shelf ? shelf.collectionKey : "",
      searchKey: "searchKey" in shelf ? shelf.searchKey : "",
    })),
  );
  const store = useMemo(
    () => createExplorerQueryStore(libraryID, shelvesKey),
    [libraryID, shelvesKey],
  );
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  return store.getData();
}

function createMyAnnotationsQueryStore(libraryID: number) {
  let snapshot: ExplorerAnnotationGroup[] = [];
  let serialized = JSON.stringify({ n: 0 });
  let generation = 0;
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null;
  let loadToken = 0;

  function emit() {
    generation += 1;
    serialized = JSON.stringify({ n: generation });
    listeners.forEach((listener) => listener());
  }

  async function reload() {
    const token = ++loadToken;
    const next = await searchMyAnnotatedRecentlyRead(libraryID);
    if (token !== loadToken) {
      return;
    }
    snapshot = next;
    emit();
  }

  function scheduleReload() {
    if (debounce) {
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      debounce = null;
      void reload();
    }, 250);
  }

  return {
    getSnapshot: () => serialized,
    getData: () => snapshot,
    subscribe(onStoreChange: () => void) {
      listeners.add(onStoreChange);
      if (!notifierID) {
        notifierID = Zotero.Notifier.registerObserver(
          {
            notify: () => {
              scheduleReload();
            },
          },
          ["item"],
        );
        void reload();
      }
      return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0 && notifierID) {
          Zotero.Notifier.unregisterObserver(notifierID);
          notifierID = null;
        }
        if (listeners.size === 0 && debounce) {
          clearTimeout(debounce);
          debounce = null;
        }
      };
    },
  };
}

export function useMyAnnotatedRecentlyRead(
  libraryID: number,
): ExplorerAnnotationGroup[] {
  const store = useMemo(
    () => createMyAnnotationsQueryStore(libraryID),
    [libraryID],
  );
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  return store.getData();
}
