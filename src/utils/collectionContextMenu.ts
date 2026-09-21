import {
  itemContextMenuScreenPoint,
  shouldSkipItemContextMenuTarget,
} from "./itemContextMenu";
import { getCachedCollectionById } from "./cache";

type CollectionContextMenuPane = {
  collectionsView?: {
    selectByID?: (id: string) => Promise<unknown> | unknown;
  } | null;
  onCollectionsContextMenuOpen?: (
    event: Event,
    x?: number,
    y?: number,
  ) => Promise<unknown> | unknown;
};

/** Test seam: pass a stub pane instead of the live ZoteroPane. */
export type CollectionContextMenuPaneLike = CollectionContextMenuPane;

function getCollectionContextMenuPane(): CollectionContextMenuPane | undefined {
  try {
    return ztoolkit.getGlobal("ZoteroPane") as
      CollectionContextMenuPane | undefined;
  } catch {
    return undefined;
  }
}

async function selectCollectionForContextMenu(
  collection: Zotero.Collection,
  pane: CollectionContextMenuPane,
): Promise<boolean> {
  try {
    const treeViewID = collection.treeViewID;
    if (!treeViewID || typeof pane.collectionsView?.selectByID !== "function") {
      return false;
    }
    await pane.collectionsView.selectByID(treeViewID);
    return true;
  } catch (error) {
    ztoolkit.log("Error selecting collection for context menu:", error);
    return false;
  }
}

/**
 * Open Zotero’s native `#zotero-collectionmenu` for `collection`, matching
 * sidebar right-click: select the collection in the tree, then build and show
 * the menu.
 */
export async function openZoteroCollectionContextMenu(
  collection: Zotero.Collection | number,
  event: Event,
  fallbackElement?: Element | null,
  pane = getCollectionContextMenuPane(),
): Promise<void> {
  if (shouldSkipItemContextMenuTarget(event.target)) {
    return;
  }
  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  if (typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }
  try {
    if (!pane || typeof pane.onCollectionsContextMenuOpen !== "function") {
      return;
    }
    const resolved =
      typeof collection === "number"
        ? getCachedCollectionById(collection) ||
          Zotero.Collections.get(collection) ||
          null
        : collection;
    if (!resolved) {
      return;
    }
    const selected = await selectCollectionForContextMenu(resolved, pane);
    if (!selected) {
      return;
    }
    const { x, y } = itemContextMenuScreenPoint(event, fallbackElement);
    await pane.onCollectionsContextMenuOpen(event, x, y);
  } catch (err) {
    ztoolkit.log("Error opening collection context menu:", err);
  }
}
