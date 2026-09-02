const SKIP_TARGET_SELECTOR = "input, textarea, iframe";

type ItemContextMenuPane = {
  getSelectedItems?: (
    asIDs?: boolean,
  ) => Zotero.Item[] | number[] | false | null;
  selectItem?: (id: number) => Promise<unknown> | unknown;
  onItemsContextMenuOpen?: (
    event: Event,
    x?: number,
    y?: number,
  ) => Promise<unknown> | unknown;
};

/** Test seam: pass a stub pane instead of the live ZoteroPane. */
export type ItemContextMenuPaneLike = ItemContextMenuPane;

export type ItemContextMenuPoint = {
  x: number;
  y: number;
};

/** True for Shift+F10 / the ContextMenu key, matching Zotero’s item tree. */
export function isItemContextMenuKey(event: KeyboardEvent): boolean {
  return event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
}

/** Native field/embed menus should win over the item menu. */
export function shouldSkipItemContextMenuTarget(
  target: EventTarget | null,
): boolean {
  if (!target) {
    return false;
  }
  const el = target as HTMLElement;
  if (typeof el.closest === "function") {
    return Boolean(el.closest(SKIP_TARGET_SELECTOR));
  }
  const tag = (el.tagName || "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "IFRAME";
}

function elementFromEventTarget(
  event: {
    currentTarget?: EventTarget | null;
    target?: EventTarget | null;
  },
  fallbackElement?: Element | null,
): Element | null {
  if (fallbackElement) {
    return fallbackElement;
  }
  if (event.currentTarget instanceof Element) {
    return event.currentTarget;
  }
  if (event.target instanceof Element) {
    return event.target;
  }
  return null;
}

/**
 * Mouse events already have screen coordinates. Keyboard contextmenu often
 * reports 0,0 — then use the target’s box, as Zotero’s item tree does.
 */
export function itemContextMenuScreenPoint(
  event: {
    screenX?: number;
    screenY?: number;
    view?: Window | null;
    currentTarget?: EventTarget | null;
    target?: EventTarget | null;
  },
  fallbackElement?: Element | null,
): ItemContextMenuPoint {
  const x = event.screenX ?? 0;
  const y = event.screenY ?? 0;
  if (x || y) {
    return { x, y };
  }
  const el = elementFromEventTarget(event, fallbackElement);
  if (!el || typeof el.getBoundingClientRect !== "function") {
    return { x: 0, y: 0 };
  }
  const rect = el.getBoundingClientRect();
  const win =
    event.view ?? el.ownerDocument.defaultView ?? Zotero.getMainWindow();
  return {
    x: (win?.screenX ?? 0) + rect.left + 50,
    y: (win?.screenY ?? 0) + rect.bottom,
  };
}

function selectedItemIds(pane: ItemContextMenuPane): number[] {
  try {
    if (typeof pane.getSelectedItems !== "function") {
      return [];
    }
    const selected = pane.getSelectedItems(true);
    if (!Array.isArray(selected) || selected.length === 0) {
      return [];
    }
    if (typeof selected[0] === "number") {
      return selected as number[];
    }
    return (selected as Zotero.Item[]).map((item) => item.id);
  } catch {
    return [];
  }
}

function getItemContextMenuPane(): ItemContextMenuPane | undefined {
  try {
    return ztoolkit.getGlobal("ZoteroPane") as ItemContextMenuPane | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Open Zotero’s native `#zotero-itemmenu` for `item`, matching table-list
 * right-click: select the item if it is not already in the selection, then
 * build and show the menu.
 */
export async function openZoteroItemContextMenu(
  item: Zotero.Item,
  event: Event,
  fallbackElement?: Element | null,
  pane = getItemContextMenuPane(),
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
    if (!pane || typeof pane.onItemsContextMenuOpen !== "function") {
      return;
    }
    const selectedIds = selectedItemIds(pane);
    if (
      !selectedIds.includes(item.id) &&
      typeof pane.selectItem === "function"
    ) {
      await pane.selectItem(item.id);
    }
    const { x, y } = itemContextMenuScreenPoint(event, fallbackElement);
    await pane.onItemsContextMenuOpen(event, x, y);
  } catch (err) {
    ztoolkit.log("Error opening item context menu:", err);
  }
}
