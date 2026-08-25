import { getPrefKey, getPrefValue } from "../utils/prefs";
import { getCollectionTreeKind } from "./autoManagedCollection";

const ICON_BY_KIND = {
  "reading-schedule-root": "calendar",
  "calendar-date": "calendar-date",
  "class-folder": "syllabus-class-date",
  syllabus: "syllabus-collection",
} as const;

const ROW_CLASS_BY_KIND = {
  "reading-schedule-root": "syllabus-tree-reading-schedule",
  "calendar-date": "syllabus-tree-calendar-date",
  "class-folder": "syllabus-tree-class-folder",
  syllabus: "syllabus-tree-syllabus",
} as const;

const TOOLTIP_BY_KIND = {
  "reading-schedule-root": "Reading schedule (auto-managed)",
  "calendar-date": "Auto-managed by Zotero Syllabus",
  "class-folder": "Auto-managed by Zotero Syllabus",
  syllabus: "Syllabus",
} as const;

const ROW_CLASSES = Object.values(ROW_CLASS_BY_KIND);
const TOOLTIPS = Object.values(TOOLTIP_BY_KIND);
const RENDER_PATCH_KEY = "_syllabusManagedRenderOriginal";

type CollectionsView = {
  getIconName: (index: number) => string | null;
  getRow: (index: number) =>
    | {
        isCollection?: () => boolean;
        ref?: { id?: number };
      }
    | undefined;
  renderItem: (
    index: number,
    selection: unknown,
    oldDiv: HTMLElement | null,
    columns: unknown,
  ) => HTMLElement;
  forceUpdate?: () => void;
  tree?: { invalidate?: () => void };
};

let prototypePatched = false;
let patchedPrototype: CollectionsView | null = null;
let originalGetIconName:
  | ((this: CollectionsView, index: number) => string | null)
  | null = null;
let prefObserverID: symbol | null = null;

export function areCustomIconsEnabled(): boolean {
  return Boolean(getPrefValue("customIcons"));
}

function collectionIdFromRow(
  row: ReturnType<CollectionsView["getRow"]>,
): number | null {
  if (!row?.isCollection?.() || row.ref?.id == null) {
    return null;
  }
  return row.ref.id;
}

function wrapGetIconName(this: CollectionsView, index: number): string | null {
  if (areCustomIconsEnabled()) {
    try {
      const collectionId = collectionIdFromRow(this.getRow(index));
      if (collectionId != null) {
        const kind = getCollectionTreeKind(collectionId);
        if (kind) {
          return ICON_BY_KIND[kind];
        }
      }
    } catch (error) {
      ztoolkit.log("Error resolving collection tree icon:", error);
    }
  }
  return originalGetIconName!.call(this, index);
}

function markCollectionRow(
  view: CollectionsView,
  index: number,
  div: HTMLElement,
) {
  const collectionId = collectionIdFromRow(view.getRow(index));
  const kind =
    areCustomIconsEnabled() && collectionId != null
      ? getCollectionTreeKind(collectionId)
      : null;
  for (const className of ROW_CLASSES) {
    div.classList.toggle(
      className,
      kind != null && ROW_CLASS_BY_KIND[kind] === className,
    );
  }
  if (kind) {
    div.title = TOOLTIP_BY_KIND[kind];
  } else if (TOOLTIPS.includes(div.title as (typeof TOOLTIPS)[number])) {
    div.title = "";
  }
}

function collectionsViewForWindow(
  win: _ZoteroTypes.MainWindow,
): CollectionsView | null {
  const view = win.ZoteroPane?.collectionsView as unknown as
    | CollectionsView
    | undefined;
  if (!view?.getIconName || !view.renderItem || !view.getRow) {
    return null;
  }
  return view;
}

function patchPrototype(view: CollectionsView): void {
  if (prototypePatched) {
    return;
  }
  const proto = Object.getPrototypeOf(view) as CollectionsView;
  patchedPrototype = proto;
  originalGetIconName = proto.getIconName;
  proto.getIconName = wrapGetIconName;
  prototypePatched = true;
}

function patchRenderItem(view: CollectionsView): void {
  const patchedView = view as CollectionsView & {
    [RENDER_PATCH_KEY]?: CollectionsView["renderItem"];
  };
  const original = patchedView[RENDER_PATCH_KEY] || view.renderItem.bind(view);
  patchedView[RENDER_PATCH_KEY] = original;
  view.renderItem = (index, selection, oldDiv, columns) => {
    const div = original(index, selection, oldDiv, columns);
    try {
      markCollectionRow(view, index, div);
    } catch (error) {
      ztoolkit.log("Error marking collection tree row:", error);
    }
    return div;
  };
  view.forceUpdate?.();
}

function isRenderPatched(view: CollectionsView): boolean {
  return Boolean(
    (view as CollectionsView & { [RENDER_PATCH_KEY]?: unknown })[
      RENDER_PATCH_KEY
    ],
  );
}

function setCustomIconsDocumentClass(
  win: _ZoteroTypes.MainWindow,
  enabled: boolean,
): void {
  win.document.documentElement.classList.toggle(
    "syllabus-custom-icons",
    enabled,
  );
}

export function patchManagedCollectionTree(win: _ZoteroTypes.MainWindow): void {
  if (!areCustomIconsEnabled()) {
    return;
  }
  setCustomIconsDocumentClass(win, true);
  const view = collectionsViewForWindow(win);
  if (!view) {
    return;
  }
  patchPrototype(view);
  patchRenderItem(view);
  view.tree?.invalidate?.();
}

/** Apply or strip custom tree icons for one window based on the global pref. */
export function applyManagedCollectionTree(win: _ZoteroTypes.MainWindow): void {
  if (areCustomIconsEnabled()) {
    patchManagedCollectionTree(win);
    return;
  }
  const view = collectionsViewForWindow(win);
  if (view && isRenderPatched(view)) {
    view.forceUpdate?.();
    view.tree?.invalidate?.();
  }
  unpatchManagedCollectionTree(win);
  setCustomIconsDocumentClass(win, false);
}

export function applyManagedCollectionTrees(): void {
  for (const win of Zotero.getMainWindows() as _ZoteroTypes.MainWindow[]) {
    applyManagedCollectionTree(win);
  }
  if (!areCustomIconsEnabled()) {
    unpatchManagedCollectionTreePrototype();
  }
}

export function registerCustomIconsPrefObserver(onChange?: () => void): void {
  if (prefObserverID) {
    return;
  }
  prefObserverID = Zotero.Prefs.registerObserver(
    getPrefKey("customIcons"),
    () => {
      applyManagedCollectionTrees();
      onChange?.();
    },
    true,
  );
}

export function unregisterCustomIconsPrefObserver(): void {
  if (!prefObserverID) {
    return;
  }
  Zotero.Prefs.unregisterObserver(prefObserverID);
  prefObserverID = null;
}

export function unpatchManagedCollectionTree(
  win: _ZoteroTypes.MainWindow,
): void {
  const view = collectionsViewForWindow(win);
  if (!view) {
    return;
  }
  const patchedView = view as CollectionsView & {
    [RENDER_PATCH_KEY]?: CollectionsView["renderItem"];
  };
  const original = patchedView[RENDER_PATCH_KEY];
  if (original) {
    view.renderItem = original;
    delete patchedView[RENDER_PATCH_KEY];
    view.forceUpdate?.();
  }
  view.tree?.invalidate?.();
}

export function unpatchManagedCollectionTreePrototype(): void {
  if (patchedPrototype && originalGetIconName) {
    patchedPrototype.getIconName = originalGetIconName;
  }
  prototypePatched = false;
  patchedPrototype = null;
  originalGetIconName = null;
}

/** Re-render tree rows so managed icons apply after folders are remembered. */
export function refreshManagedCollectionTrees(): void {
  if (!areCustomIconsEnabled()) {
    return;
  }
  for (const win of Zotero.getMainWindows() as _ZoteroTypes.MainWindow[]) {
    const view = collectionsViewForWindow(win);
    if (!view) {
      continue;
    }
    view.forceUpdate?.();
    view.tree?.invalidate?.();
  }
}
