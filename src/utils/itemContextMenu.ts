const SKIP_TARGET_SELECTOR = "input, textarea, iframe";
const ITEM_MENU_ID = "zotero-itemmenu";

type ItemContextMenuPane = {
  getSelectedItems?: (
    asIDs?: boolean,
  ) => Zotero.Item[] | number[] | false | null;
  selectItem?: (
    id: number,
    options?: { noTabSwitch?: boolean },
  ) => Promise<unknown> | unknown;
  selectItems?: (
    ids: number[],
    options?: { noTabSwitch?: boolean },
  ) => Promise<unknown> | unknown;
  itemsView?: {
    selection?: {
      clearSelection?: () => void;
    };
  } | null;
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

type ItemMenuElement = Element & {
  state?: string;
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

function isItemMenuOpen(menu: ItemMenuElement | null | undefined): boolean {
  const state = menu?.state;
  return state === "open" || state === "showing" || state === "hiding";
}

async function restoreItemSelection(
  pane: ItemContextMenuPane,
  previousIds: number[],
): Promise<void> {
  try {
    if (previousIds.length === 0) {
      pane.itemsView?.selection?.clearSelection?.();
      return;
    }
    if (typeof pane.selectItems === "function") {
      await pane.selectItems(previousIds, { noTabSwitch: true });
      return;
    }
    if (previousIds.length === 1 && typeof pane.selectItem === "function") {
      await pane.selectItem(previousIds[0], { noTabSwitch: true });
    }
  } catch (err) {
    try {
      ztoolkit.log("Error restoring selection after item context menu:", err);
    } catch {
      // Tests (and early boot) may not have ztoolkit.
    }
  }
}

/**
 * Restore the prior library selection once `#zotero-itemmenu` closes so a
 * right-click does not leave the clicked item selected (left-click selects).
 * Resolves after restore. When the menu is open, waits for `popuphidden` first.
 */
async function restoreSelectionAfterItemMenu(
  pane: ItemContextMenuPane,
  previousIds: number[],
): Promise<void> {
  try {
    const win = Zotero.getMainWindow();
    const menu = win?.document?.getElementById(
      ITEM_MENU_ID,
    ) as ItemMenuElement | null;

    // After onItemsContextMenuOpen, the popup is already open (or it failed).
    // Wait for close so menu commands still see the temporary selection.
    if (
      menu &&
      typeof menu.addEventListener === "function" &&
      isItemMenuOpen(menu)
    ) {
      await new Promise<void>((resolve) => {
        menu.addEventListener("popuphidden", () => resolve(), { once: true });
      });
    }
  } catch {
    // Fall through to restore even if the menu lookup fails.
  }
  await restoreItemSelection(pane, previousIds);
}

function itemMenuIsOpen(): boolean {
  try {
    const menu = Zotero.getMainWindow()?.document?.getElementById(
      ITEM_MENU_ID,
    ) as ItemMenuElement | null;
    return isItemMenuOpen(menu);
  } catch {
    return false;
  }
}

/**
 * Open Zotero’s native `#zotero-itemmenu` for `item`. Temporarily selects the
 * item when needed so the menu targets it, then restores the prior library
 * selection when the menu closes — left-click (not right-click) selects.
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
    const restoreIds = selectedIds.includes(item.id) ? null : selectedIds;
    if (restoreIds && typeof pane.selectItem === "function") {
      // Stay on Reading Schedule / other custom tabs while the menu opens.
      await pane.selectItem(item.id, { noTabSwitch: true });
    }
    const { x, y } = itemContextMenuScreenPoint(event, fallbackElement);
    await pane.onItemsContextMenuOpen(event, x, y);
    if (restoreIds) {
      const restorePromise = restoreSelectionAfterItemMenu(pane, restoreIds);
      // Callers fire-and-forget; don't block on popuphidden (that hangs until
      // the user dismisses the menu). Await only when restoring immediately.
      if (!itemMenuIsOpen()) {
        await restorePromise;
      }
    }
  } catch (err) {
    ztoolkit.log("Error opening item context menu:", err);
  }
}
