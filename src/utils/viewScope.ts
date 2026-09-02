import { getSelectedCollection } from "./zotero";

export const SPECIAL_GALLERY_ROW_TYPES = [
  "search",
  "duplicates",
  "unfiled",
  "retracted",
  "publications",
  "trash",
  "feed",
  "feeds",
  "recentlyRead",
] as const;

export type SpecialGalleryRowType = (typeof SPECIAL_GALLERY_ROW_TYPES)[number];

/** Pref keys for saved searches, per-library specials, Recently Read, and the Feeds root (`S123`, `T1`, `Y1`, `F1`, …). Individual RSS feeds use Zotero’s `L{libraryID}` tree id and are kept via live library enumeration. */
export const SPECIAL_VIEW_PREF_KEY = /^[SDURPTFY]\d+$/;

export function isSpecialViewPrefKey(key: string): boolean {
  return SPECIAL_VIEW_PREF_KEY.test(key);
}

export type CollectionTreeRowLike = {
  type?: string;
  id?: string;
  name?: string;
  ref?: {
    id?: number;
    libraryID?: number;
    name?: string;
    getChildItems?: () => unknown;
  };
  isLibrary?: (includeGlobal?: boolean) => boolean;
  isCollection?: () => boolean;
  isSearch?: () => boolean;
  isDuplicates?: () => boolean;
  isUnfiled?: () => boolean;
  isRetracted?: () => boolean;
  isPublications?: () => boolean;
  isTrash?: () => boolean;
  isFeed?: () => boolean;
  isFeeds?: () => boolean;
  isRecentlyRead?: () => boolean;
  isHeader?: () => boolean;
  isGroup?: () => boolean;
  isSearchMode?: () => boolean;
  getName?: () => string;
  getSearchResults?: (...args: unknown[]) => unknown;
  getItems?: (...args: unknown[]) => unknown;
};

export type CollectionViewScope = {
  kind: "collection";
  collection: Zotero.Collection;
  viewKey: string;
  treeViewID: string;
};

export type SpecialViewScope = {
  kind: "special";
  type: SpecialGalleryRowType;
  treeViewID: string;
  viewKey: string;
  libraryID: number;
  title: string;
};

export type LibraryViewScope = {
  kind: "library";
  viewKey: string;
  libraryID: number;
};

export type OtherViewScope = {
  kind: "other";
  viewKey: string;
};

export type ViewScope =
  | CollectionViewScope
  | SpecialViewScope
  | LibraryViewScope
  | OtherViewScope;

function callFlag(fn: (() => boolean) | undefined): boolean {
  if (typeof fn !== "function") {
    return false;
  }
  try {
    return !!fn();
  } catch {
    return false;
  }
}

export function specialGalleryTypeFromRow(
  row: CollectionTreeRowLike | null | undefined,
): SpecialGalleryRowType | null {
  if (!row) {
    return null;
  }
  if (callFlag(row.isSearch) || row.type === "search") {
    return "search";
  }
  if (callFlag(row.isDuplicates) || row.type === "duplicates") {
    return "duplicates";
  }
  if (callFlag(row.isUnfiled) || row.type === "unfiled") {
    return "unfiled";
  }
  if (callFlag(row.isRetracted) || row.type === "retracted") {
    return "retracted";
  }
  if (callFlag(row.isPublications) || row.type === "publications") {
    return "publications";
  }
  if (callFlag(row.isTrash) || row.type === "trash") {
    return "trash";
  }
  if (callFlag(row.isRecentlyRead) || row.type === "recentlyRead") {
    return "recentlyRead";
  }
  if (callFlag(row.isFeeds) || row.type === "feeds") {
    return "feeds";
  }
  if (callFlag(row.isFeed) || row.type === "feed") {
    return "feed";
  }
  return null;
}

export function isLibraryRootRow(
  row: CollectionTreeRowLike | null | undefined,
): boolean {
  if (!row) {
    return false;
  }
  if (specialGalleryTypeFromRow(row)) {
    return false;
  }
  if (callFlag(row.isCollection) || row.type === "collection") {
    return false;
  }
  if (row.type === "library" || row.type === "group") {
    return true;
  }
  if (typeof row.isLibrary === "function") {
    try {
      if (row.isLibrary()) {
        return true;
      }
    } catch {
      // Fall through.
    }
  }
  return callFlag(row.isGroup);
}

export function collectionTreeRowKind(
  row: CollectionTreeRowLike | null | undefined,
): ViewScope["kind"] {
  if (!row) {
    return "other";
  }
  if (specialGalleryTypeFromRow(row)) {
    return "special";
  }
  if (callFlag(row.isCollection) || row.type === "collection") {
    return "collection";
  }
  if (isLibraryRootRow(row)) {
    return "library";
  }
  return "other";
}

export function treeViewIDFromRow(
  row: CollectionTreeRowLike | null | undefined,
  type?: string,
): string {
  if (!row) {
    return "";
  }
  if (typeof row.id === "string" && row.id) {
    return row.id;
  }
  const kind = type || specialGalleryTypeFromRow(row) || row.type || "";
  const refId = row.ref?.id;
  const libraryID = row.ref?.libraryID;
  switch (kind) {
    case "search":
      return refId != null ? `S${refId}` : "";
    case "duplicates":
      return libraryID != null ? `D${libraryID}` : "";
    case "unfiled":
      return libraryID != null ? `U${libraryID}` : "";
    case "retracted":
      return libraryID != null ? `R${libraryID}` : "";
    case "publications":
      return libraryID != null ? `P${libraryID}` : "";
    case "trash":
      return libraryID != null ? `T${libraryID}` : "";
    case "recentlyRead":
      return libraryID != null ? `Y${libraryID}` : "";
    case "feed":
      return libraryID != null
        ? `L${libraryID}`
        : refId != null
          ? `L${refId}`
          : "";
    case "feeds":
      return "F1";
    case "collection":
      return refId != null ? `C${refId}` : "";
    case "library":
    case "group":
      return libraryID != null ? `L${libraryID}` : "";
    default:
      return "";
  }
}

export function collectionTreeRowTitle(
  row: CollectionTreeRowLike | null | undefined,
): string {
  if (!row) {
    return "";
  }
  if (typeof row.getName === "function") {
    try {
      const name = row.getName();
      if (name) {
        return String(name);
      }
    } catch {
      // Fall through.
    }
  }
  if (typeof row.name === "string" && row.name) {
    return row.name;
  }
  if (typeof row.ref?.name === "string" && row.ref.name) {
    return row.ref.name;
  }
  return "";
}

export function viewScopeSupportsGallery(
  scope: { kind: string } | null | undefined,
): scope is CollectionViewScope | SpecialViewScope {
  return scope?.kind === "collection" || scope?.kind === "special";
}

export function viewScopeSupportsExplorer(
  scope: { kind: string } | null | undefined,
): scope is LibraryViewScope {
  return scope?.kind === "library";
}

function libraryIDFromRow(row: CollectionTreeRowLike): number {
  const fromRef = row.ref?.libraryID;
  if (typeof fromRef === "number" && fromRef > 0) {
    return fromRef;
  }
  try {
    const pane = getZoteroPane();
    const id = pane?.getSelectedLibraryID?.();
    if (typeof id === "number" && id > 0) {
      return id;
    }
  } catch {
    // Fall through.
  }
  return 0;
}

type PaneWithTree = {
  getSelectedLibraryID?: () => number | false | null | undefined;
  collectionsView?: {
    selectedTreeRow?: CollectionTreeRowLike | false | null;
  } | null;
};

function getZoteroPane(): PaneWithTree | undefined {
  try {
    return (Zotero.getActiveZoteroPane() ??
      Zotero.getMainWindow()?.ZoteroPane) as PaneWithTree | undefined;
  } catch {
    return undefined;
  }
}

export function getSelectedCollectionTreeRow(): CollectionTreeRowLike | null {
  try {
    const pane = getZoteroPane();
    const view = pane?.collectionsView;
    if (!view) {
      return null;
    }
    const row = view.selectedTreeRow;
    if (!row) {
      return null;
    }
    return row;
  } catch {
    return null;
  }
}

function collectionFromRow(
  row: CollectionTreeRowLike,
): Zotero.Collection | null {
  const ref = row.ref;
  if (
    ref &&
    typeof ref.getChildItems === "function" &&
    typeof ref.id === "number"
  ) {
    return ref as Zotero.Collection;
  }
  return getSelectedCollection();
}

export function getSelectedViewScope(): ViewScope {
  const row = getSelectedCollectionTreeRow();
  if (!row) {
    const collection = getSelectedCollection();
    if (collection) {
      return {
        kind: "collection",
        collection,
        viewKey: String(collection.id),
        treeViewID: collection.treeViewID || `C${collection.id}`,
      };
    }
    return { kind: "other", viewKey: "" };
  }

  const specialType = specialGalleryTypeFromRow(row);
  if (specialType) {
    const treeViewID = treeViewIDFromRow(row, specialType);
    return {
      kind: "special",
      type: specialType,
      treeViewID,
      viewKey: treeViewID,
      libraryID: libraryIDFromRow(row),
      title: collectionTreeRowTitle(row),
    };
  }

  if (callFlag(row.isCollection) || row.type === "collection") {
    const collection = collectionFromRow(row);
    if (collection) {
      return {
        kind: "collection",
        collection,
        viewKey: String(collection.id),
        treeViewID: treeViewIDFromRow(row, "collection") || `C${collection.id}`,
      };
    }
  }

  if (isLibraryRootRow(row)) {
    return {
      kind: "library",
      viewKey: treeViewIDFromRow(row, row.type || "library") || "library",
      libraryID: libraryIDFromRow(row),
    };
  }

  return {
    kind: "other",
    viewKey: treeViewIDFromRow(row) || row.type || "other",
  };
}

export function getSelectedViewKey(): string {
  return getSelectedViewScope().viewKey;
}
