import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getCachedItem } from "../../utils/cache";
import { isSyllabusMemberItem } from "../../utils/items";
import {
  treeViewIDFromRow,
  type CollectionTreeRowLike,
} from "../../utils/viewScope";

/**
 * Sentinel snapshot: the items tree is not applying a search/tag/advanced
 * filter, or it isn't showing this collection yet. Gallery should list the
 * unfiltered collection.
 */
const UNFILTERED = "*";

type ItemsViewRow = {
  isObjectRow?: boolean;
  ref?: Zotero.Item | { id?: number };
};

type EventBinding = {
  addListener?: (listener: () => void) => void;
  removeListener?: (listener: () => void) => void;
};

type ItemsViewLike = {
  rowCount?: number;
  getRowCount?: () => number;
  getRow?: (index: number) => ItemsViewRow | undefined;
  collectionTreeRow?: CollectionTreeRowLike;
  _collectionTreeRow?: CollectionTreeRowLike;
  collectionTreeRows?: CollectionTreeRowLike[];
  onRefresh?: EventBinding;
  onRowCountChange?: EventBinding;
};

export type MemberItemOptions = {
  includeDeleted?: boolean;
  includeFeedItems?: boolean;
};

function getItemsView(): ItemsViewLike | null {
  try {
    const pane = ztoolkit.getGlobal("ZoteroPane") as
      | { itemsView?: ItemsViewLike }
      | undefined;
    return pane?.itemsView ?? null;
  } catch {
    return null;
  }
}

function getViewCollectionTreeRows(
  view: ItemsViewLike,
): CollectionTreeRowLike[] {
  if (
    Array.isArray(view.collectionTreeRows) &&
    view.collectionTreeRows.length
  ) {
    return view.collectionTreeRows;
  }
  const singular = view.collectionTreeRow || view._collectionTreeRow;
  return singular ? [singular] : [];
}

function itemsViewCoversCollection(
  view: ItemsViewLike,
  collectionId: number,
): boolean {
  return getViewCollectionTreeRows(view).some((row) => {
    try {
      if (row.isCollection?.() && row.ref?.id === collectionId) {
        return true;
      }
      return treeViewIDFromRow(row) === `C${collectionId}`;
    } catch {
      return false;
    }
  });
}

export function itemsViewCoversTreeViewID(
  view: ItemsViewLike,
  treeViewID: string,
): boolean {
  if (!treeViewID) {
    return false;
  }
  return getViewCollectionTreeRows(view).some((row) => {
    try {
      return treeViewIDFromRow(row) === treeViewID;
    } catch {
      return false;
    }
  });
}

function itemsViewIsFiltered(view: ItemsViewLike): boolean {
  return getViewCollectionTreeRows(view).some((row) => {
    try {
      return !!row.isSearchMode?.();
    } catch {
      return false;
    }
  });
}

/** True when the items tree is showing a filtered view of this tree row. */
export function itemsViewIsFilteredForTreeViewID(treeViewID: string): boolean {
  if (!treeViewID) {
    return false;
  }
  const view = getItemsView();
  if (!view || !itemsViewCoversTreeViewID(view, treeViewID)) {
    return false;
  }
  return itemsViewIsFiltered(view);
}

function regularItemIdFromItem(
  item: Zotero.Item | undefined,
  options?: MemberItemOptions,
): number | null {
  if (!item || typeof item.isRegularItem !== "function") {
    return null;
  }
  try {
    if (isSyllabusMemberItem(item, options)) {
      return item.id;
    }
    const parentId = (item as Zotero.Item).parentItemID;
    if (parentId) {
      const parent = getCachedItem(parentId);
      if (parent) {
        return regularItemIdFromItem(parent, options);
      }
      return parentId;
    }
  } catch {
    return null;
  }
  return null;
}

export function collectRegularItemIds(
  view: ItemsViewLike,
  options?: MemberItemOptions,
): number[] {
  const count =
    typeof view.rowCount === "number"
      ? view.rowCount
      : typeof view.getRowCount === "function"
        ? view.getRowCount()
        : 0;
  if (!count || typeof view.getRow !== "function") {
    return [];
  }

  const ids = new Set<number>();
  for (let i = 0; i < count; i++) {
    let row: ItemsViewRow | undefined;
    try {
      row = view.getRow(i);
    } catch {
      continue;
    }
    if (!row || row.isObjectRow === false) {
      continue;
    }
    const id = regularItemIdFromItem(
      row.ref as Zotero.Item | undefined,
      options,
    );
    if (id != null) {
      ids.add(id);
    }
  }
  return [...ids].sort((a, b) => a - b);
}

/** Item IDs currently shown for this tree row, or null if the items view isn't showing it. */
export function readItemsViewRegularItemIds(options: {
  treeViewID: string;
  includeDeleted?: boolean;
  includeFeedItems?: boolean;
}): number[] | null {
  const view = getItemsView();
  if (!view || !itemsViewCoversTreeViewID(view, options.treeViewID)) {
    return null;
  }
  return collectRegularItemIds(view, {
    includeDeleted: options.includeDeleted,
    includeFeedItems: options.includeFeedItems,
  });
}

function readSnapshot(collectionId: number): string {
  const view = getItemsView();
  if (!view || !itemsViewCoversCollection(view, collectionId)) {
    return UNFILTERED;
  }
  if (!itemsViewIsFiltered(view)) {
    return UNFILTERED;
  }
  return collectRegularItemIds(view).join(",");
}

export function bindItemsViewEvent(
  binding: EventBinding | undefined,
  listener: () => void,
) {
  binding?.addListener?.(listener);
  return () => {
    binding?.removeListener?.(listener);
  };
}

export function subscribeToItemsViewChanges(
  onStoreChange: () => void,
): () => void {
  let boundView: ItemsViewLike | null = null;
  let unbindView = () => {};

  const attachView = () => {
    const view = getItemsView();
    if (view === boundView) {
      return;
    }
    unbindView();
    boundView = view;
    if (!view) {
      unbindView = () => {};
      return;
    }
    const unbindRefresh = bindItemsViewEvent(view.onRefresh, handleChange);
    const unbindRows = bindItemsViewEvent(view.onRowCountChange, handleChange);
    unbindView = () => {
      unbindRefresh();
      unbindRows();
    };
  };

  const handleChange = () => {
    attachView();
    onStoreChange();
  };

  attachView();

  let searchBox: Element | null = null;
  try {
    searchBox =
      Zotero.getMainWindow()?.document.getElementById("zotero-tb-search");
  } catch {
    searchBox = null;
  }
  if (searchBox) {
    searchBox.addEventListener("command", handleChange);
  }

  const observer = {
    notify() {
      handleChange();
    },
  };
  const notifierId = Zotero.Notifier.registerObserver(observer, [
    "item",
    "collection-item",
    "search",
    "feed",
  ]);

  return () => {
    unbindView();
    searchBox?.removeEventListener("command", handleChange);
    Zotero.Notifier.unregisterObserver(notifierId);
  };
}

export function createItemsViewItemsStore(collectionId: number) {
  function getSnapshot() {
    return readSnapshot(collectionId);
  }

  function subscribe(onStoreChange: () => void) {
    return subscribeToItemsViewChanges(onStoreChange);
  }

  return { getSnapshot, subscribe };
}

/**
 * Regular-item IDs currently shown in Zotero's items tree for this collection,
 * including parents of matching child attachments/notes.
 *
 * Returns `null` when the tree is unfiltered or isn't showing this collection,
 * so Gallery can keep listing the full collection.
 */
export function useZoteroItemsViewRegularItemIds(
  collectionId: number,
): Set<number> | null {
  const store = useMemo(
    () => createItemsViewItemsStore(collectionId),
    [collectionId],
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return useMemo(() => {
    if (snapshot === UNFILTERED) {
      return null;
    }
    if (!snapshot) {
      return new Set();
    }
    return new Set(
      snapshot
        .split(",")
        .map((part) => Number(part))
        .filter((id) => Number.isFinite(id) && id > 0),
    );
  }, [snapshot]);
}
