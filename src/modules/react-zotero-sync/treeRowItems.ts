import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getCachedItem } from "../../utils/cache";
import { isSyllabusMemberItem } from "../../utils/items";
import {
  collectionTreeRowTitle,
  getSelectedCollectionTreeRow,
  treeViewIDFromRow,
  type CollectionTreeRowLike,
} from "../../utils/viewScope";
import {
  readItemsViewRegularItemIds,
  subscribeToItemsViewChanges,
} from "./itemsViewItems";
import type { ItemSyllabusAssignment } from "../syllabus";

export type TreeRowGalleryItem = {
  zoteroItem: Zotero.Item;
  assignments: ItemSyllabusAssignment[];
};

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Promise<unknown>).then === "function"
  );
}

function itemIdsFromUnknown(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids: number[] = [];
  for (const entry of value) {
    if (typeof entry === "number" && entry > 0) {
      ids.push(entry);
      continue;
    }
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as Zotero.Item).id === "number"
    ) {
      ids.push((entry as Zotero.Item).id);
    }
  }
  return ids;
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

function memberOptions(options?: {
  includeDeleted?: boolean;
  includeFeedItems?: boolean;
}) {
  return {
    includeDeleted: !!options?.includeDeleted,
    includeFeedItems: !!options?.includeFeedItems,
  };
}

function readTreeRowFallbackIds(
  treeViewID: string,
  options?: { includeDeleted?: boolean; includeFeedItems?: boolean },
): number[] {
  const row = getSelectedCollectionTreeRow();
  if (!row || treeViewIDFromRow(row) !== treeViewID) {
    return [];
  }
  if (typeof row.getSearchResults === "function") {
    try {
      const results = row.getSearchResults();
      if (!isThenable(results)) {
        return filterMemberIds(itemIdsFromUnknown(results), options);
      }
    } catch {
      // Fall through.
    }
  }
  if (options?.includeDeleted) {
    try {
      const libraryID = row.ref?.libraryID;
      const getDeleted = (
        Zotero.Items as {
          getDeleted?: (id: number, asIDs?: boolean) => unknown;
        }
      ).getDeleted;
      if (typeof getDeleted === "function" && typeof libraryID === "number") {
        const deleted = getDeleted.call(Zotero.Items, libraryID, true);
        if (!isThenable(deleted)) {
          return filterMemberIds(itemIdsFromUnknown(deleted), options);
        }
      }
    } catch {
      // Fall through.
    }
  }
  return [];
}

function filterMemberIds(
  ids: number[],
  options?: { includeDeleted?: boolean; includeFeedItems?: boolean },
): number[] {
  const member = memberOptions(options);
  const unique = new Set<number>();
  for (const id of ids) {
    const item = resolveItem(id);
    if (item && isSyllabusMemberItem(item, member)) {
      unique.add(item.id);
    }
  }
  return [...unique].sort((a, b) => a - b);
}

function fingerprintItems(ids: number[]): string {
  return JSON.stringify(
    ids.map((id) => {
      const item = resolveItem(id);
      if (!item) {
        return { id };
      }
      let title = "";
      let modified = "";
      try {
        title = String(item.getDisplayTitle?.() || "");
        modified = String(item.dateModified || "");
      } catch {
        // Ignore.
      }
      return { id, title, modified };
    }),
  );
}

function readTreeRowItemIds(
  treeViewID: string,
  options?: { includeDeleted?: boolean; includeFeedItems?: boolean },
): number[] {
  if (!treeViewID) {
    return [];
  }
  const fromView = readItemsViewRegularItemIds({
    treeViewID,
    includeDeleted: options?.includeDeleted,
    includeFeedItems: options?.includeFeedItems,
  });
  if (fromView) {
    return fromView;
  }
  return readTreeRowFallbackIds(treeViewID, options);
}

export function createTreeRowItemsStore(
  treeViewID: string,
  options?: { includeDeleted?: boolean; includeFeedItems?: boolean },
) {
  function getSnapshot() {
    return fingerprintItems(readTreeRowItemIds(treeViewID, options));
  }

  function subscribe(onStoreChange: () => void) {
    return subscribeToItemsViewChanges(onStoreChange);
  }

  return { getSnapshot, subscribe };
}

function itemsFromSnapshot(
  snapshot: string,
  options?: { includeDeleted?: boolean; includeFeedItems?: boolean },
): TreeRowGalleryItem[] {
  let parsed: Array<{ id?: number }> = [];
  try {
    parsed = JSON.parse(snapshot) as Array<{ id?: number }>;
  } catch {
    return [];
  }
  const member = memberOptions(options);
  const items: TreeRowGalleryItem[] = [];
  for (const entry of parsed) {
    if (typeof entry?.id !== "number") {
      continue;
    }
    const zoteroItem = resolveItem(entry.id);
    if (!zoteroItem || !isSyllabusMemberItem(zoteroItem, member)) {
      continue;
    }
    items.push({ zoteroItem, assignments: [] });
  }
  return items;
}

export function useZoteroTreeRowItems(
  treeViewID: string,
  options?: { includeDeleted?: boolean; includeFeedItems?: boolean },
): TreeRowGalleryItem[] {
  const includeDeleted = !!options?.includeDeleted;
  const includeFeedItems = !!options?.includeFeedItems;
  const store = useMemo(
    () =>
      createTreeRowItemsStore(treeViewID, { includeDeleted, includeFeedItems }),
    [treeViewID, includeDeleted, includeFeedItems],
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return useMemo(
    () => itemsFromSnapshot(snapshot, { includeDeleted, includeFeedItems }),
    [snapshot, includeDeleted, includeFeedItems],
  );
}

function titleFromRow(
  row: CollectionTreeRowLike | null,
  treeViewID: string,
): string {
  if (!row || treeViewIDFromRow(row) !== treeViewID) {
    return "";
  }
  return collectionTreeRowTitle(row);
}

export function createTreeRowTitleStore(treeViewID: string) {
  function getSnapshot() {
    return titleFromRow(getSelectedCollectionTreeRow(), treeViewID);
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify() {
        onStoreChange();
      },
    };
    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "search",
      "feed",
    ]);
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}

export function useZoteroTreeRowTitle(treeViewID: string): string {
  const store = useMemo(
    () => createTreeRowTitleStore(treeViewID),
    [treeViewID],
  );
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
