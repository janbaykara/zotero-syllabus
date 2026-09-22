import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";
import {
  GALLERY_LAYOUT_MODES,
  coerceGalleryLayout,
  type GalleryLayout,
} from "./galleryLayout";
import {
  coerceGalleryGroupBy,
  resolveGalleryGroupBy,
  type GalleryGroupBy,
  type GalleryGroupByAllow,
} from "./galleryGroupBy";
import { coerceGallerySortBy, type GallerySortBy } from "./gallerySort";
import {
  coerceMagazineTypeSize,
  type MagazineTypeSize,
} from "./magazineTypeSize";

export const EXPLORER_SHELF_TYPES = [
  "pinned",
  "upcoming-deadlines",
  "watch-now",
  "listen-now",
  "recently-added",
  "recently-read",
  "recent-in-feed",
  "recent-annotations",
  "collection",
  "saved-search",
] as const;

const PARSED_SHELF_TYPES = [
  ...EXPLORER_SHELF_TYPES,
  "featured-video",
  "featured-audio",
  "featured-books",
  "recent-articles",
] as const;

const LEGACY_DEFAULT_SHELF_TYPES = [
  "recently-read",
  "recent-articles",
  "featured-books",
  "featured-video",
  "watch-now",
  "featured-audio",
  "listen-now",
] as const;

const PREVIOUS_DEFAULT_SHELF_TYPES = [
  "watch-now",
  "listen-now",
  "recently-read",
  "recently-added",
] as const;

/** Defaults before the Pinned shelf was added. */
const PRE_PINNED_DEFAULT_SHELF_TYPES = [
  "upcoming-deadlines",
  "watch-now",
  "listen-now",
  "recently-read",
  "recently-added",
] as const;

export type ExplorerShelfType = (typeof EXPLORER_SHELF_TYPES)[number];

export type LibraryViewMode = "collection" | "explorer";

/** Shared shelf depth for recent annotations. */
export const EXPLORER_ANNOTATION_SHELF_LIMIT = 20;

export const DEFAULT_COLLECTION_SHELF_GROUP_BY: GalleryGroupBy = "classes";
export const DEFAULT_COLLECTION_SHELF_SORT_BY: GallerySortBy = "auto";
export const DEFAULT_COLLECTION_SHELF_TYPE_SIZE: MagazineTypeSize = "small";

type ExplorerShelfBase = {
  id: string;
  layout: GalleryLayout;
  enabled?: boolean;
};

export type ExplorerCollectionShelf = ExplorerShelfBase & {
  type: "collection";
  libraryID: number;
  collectionKey: string;
  groupBy?: GalleryGroupBy;
  sortBy?: GallerySortBy;
  magazineTypeSize?: MagazineTypeSize;
};

export type ExplorerShelf = ExplorerShelfBase &
  (
    | { type: "pinned" }
    | { type: "upcoming-deadlines" }
    | { type: "watch-now" }
    | { type: "listen-now" }
    | { type: "recently-added"; days: number }
    | { type: "recently-read"; days: number; limit: number }
    | { type: "recent-in-feed"; days: number }
    | {
        type: "recent-annotations";
        limit: number;
      }
    | ExplorerCollectionShelf
    | { type: "saved-search"; libraryID: number; searchKey: string }
  );

const LibraryViewModeSchema = z.enum(["collection", "explorer"]);
const LibraryViewModesSchema = z.record(z.string(), z.unknown());

const ExplorerShelfSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(PARSED_SHELF_TYPES),
    layout: z.unknown().optional(),
    days: z.number().positive().optional(),
    limit: z.number().positive().optional(),
    groupBy: z.unknown().optional(),
    sortBy: z.unknown().optional(),
    magazineTypeSize: z.unknown().optional(),
    libraryID: z.number().int().positive().optional(),
    collectionKey: z.string().optional(),
    searchKey: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough();

const ExplorerShelvesSchema = z.array(z.unknown());

function shelvesPrefKey() {
  return `${config.prefsPrefix}.explorerShelves`;
}

/** One-time bump: deadlines shelf was locked to Card; default is now Cover. */
function deadlinesLayoutMigrationKey() {
  return `${config.prefsPrefix}.explorerDeadlinesCoverDefault`;
}

function libraryViewPrefKey() {
  return `${config.prefsPrefix}.libraryViewModes`;
}

export function defaultLayoutForShelfType(
  type: ExplorerShelfType,
): GalleryLayout {
  switch (type) {
    case "pinned":
      return "card";
    case "upcoming-deadlines":
      return "cover";
    case "collection":
      return "cover";
    case "recently-added":
    case "recent-in-feed":
    case "saved-search":
      return "magazine";
    case "recent-annotations":
      return "card";
    default:
      return "cover";
  }
}

/** Gallery-only layouts that do not apply to Explorer shelves. */
const EXPLORER_SHELF_LAYOUTS = GALLERY_LAYOUT_MODES.filter(
  (mode) => mode !== "annotations",
);

export function layoutsForExplorerShelf(
  type: ExplorerShelfType,
): readonly GalleryLayout[] {
  switch (type) {
    case "watch-now":
    case "listen-now":
      return ["cover"];
    case "recent-annotations":
      return ["card"];
    case "pinned":
    case "upcoming-deadlines":
      return EXPLORER_SHELF_LAYOUTS;
    default:
      return EXPLORER_SHELF_LAYOUTS;
  }
}

function resolveShelfLayout(
  type: ExplorerShelfType,
  layout: GalleryLayout,
): GalleryLayout {
  const allowed = layoutsForExplorerShelf(type);
  if (allowed.length === 0) {
    return defaultLayoutForShelfType(type);
  }
  return allowed.includes(layout) ? layout : allowed[0];
}

export function defaultExplorerShelves(): ExplorerShelf[] {
  return [
    { id: "pinned", type: "pinned", layout: "card" },
    { id: "upcoming-deadlines", type: "upcoming-deadlines", layout: "cover" },
    { id: "watch-now", type: "watch-now", layout: "cover" },
    { id: "listen-now", type: "listen-now", layout: "cover" },
    {
      id: "recently-read",
      type: "recently-read",
      layout: "cover",
      days: 30,
      limit: 10,
    },
    {
      id: "recently-added",
      type: "recently-added",
      layout: "magazine",
      days: 14,
    },
  ];
}

export const EXPLORER_SHELF_MENU_TYPES: Exclude<
  ExplorerShelfType,
  "collection" | "saved-search"
>[] = [
  "pinned",
  "upcoming-deadlines",
  "watch-now",
  "listen-now",
  "recently-read",
  "recently-added",
  "recent-in-feed",
  "recent-annotations",
];

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : fallback;
}

export function coerceExplorerShelf(value: unknown): ExplorerShelf | null {
  const parsed = ExplorerShelfSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  const raw = parsed.data;
  if (raw.type === "featured-books") {
    return null;
  }
  const type =
    raw.type === "featured-video"
      ? "watch-now"
      : raw.type === "featured-audio"
        ? "listen-now"
        : raw.type === "recent-articles"
          ? "recently-added"
          : raw.type;
  const layout = resolveShelfLayout(
    type,
    raw.layout
      ? coerceGalleryLayout(raw.layout)
      : defaultLayoutForShelfType(type),
  );
  const id = raw.id;
  let shelf: ExplorerShelf;
  switch (raw.type) {
    case "pinned":
      shelf = { id, type: "pinned", layout };
      break;
    case "upcoming-deadlines":
      shelf = { id, type: "upcoming-deadlines", layout };
      break;
    case "featured-video":
    case "watch-now":
      shelf = { id, type: "watch-now", layout };
      break;
    case "featured-audio":
    case "listen-now":
      shelf = { id, type: "listen-now", layout };
      break;
    case "recent-in-feed":
      shelf = {
        id,
        type: "recent-in-feed",
        layout,
        days: positiveInt(raw.days, 7),
      };
      break;
    case "recent-articles":
    case "recently-added":
      shelf = {
        id,
        type: "recently-added",
        layout,
        days: positiveInt(raw.days, 14),
      };
      break;
    case "recently-read":
      shelf = {
        id,
        type: "recently-read",
        layout,
        days: positiveInt(raw.days, 30),
        limit: positiveInt(raw.limit, 10),
      };
      break;
    case "recent-annotations": {
      shelf = {
        id,
        type: "recent-annotations",
        layout,
        limit: EXPLORER_ANNOTATION_SHELF_LIMIT,
      };
      break;
    }
    case "collection":
      if (!raw.collectionKey || raw.libraryID == null) {
        return null;
      }
      shelf = {
        id,
        type: "collection",
        layout,
        libraryID: raw.libraryID,
        collectionKey: raw.collectionKey,
        ...(raw.groupBy !== undefined
          ? { groupBy: coerceGalleryGroupBy(raw.groupBy) }
          : {}),
        ...(raw.sortBy !== undefined
          ? { sortBy: coerceGallerySortBy(raw.sortBy) }
          : {}),
        ...(raw.magazineTypeSize !== undefined
          ? {
              magazineTypeSize: coerceMagazineTypeSize(raw.magazineTypeSize),
            }
          : {}),
      };
      break;
    case "saved-search":
      if (!raw.searchKey || raw.libraryID == null) {
        return null;
      }
      shelf = {
        id,
        type: "saved-search",
        layout,
        libraryID: raw.libraryID,
        searchKey: raw.searchKey,
      };
      break;
    default:
      return null;
  }
  return raw.enabled === false ? { ...shelf, enabled: false } : shelf;
}

function collapseDuplicateShelves(shelves: ExplorerShelf[]): ExplorerShelf[] {
  const unique = new Set<
    | "pinned"
    | "upcoming-deadlines"
    | "watch-now"
    | "listen-now"
    | "recently-added"
  >();
  const next: ExplorerShelf[] = [];
  for (const shelf of shelves) {
    if (
      shelf.type === "pinned" ||
      shelf.type === "upcoming-deadlines" ||
      shelf.type === "watch-now" ||
      shelf.type === "listen-now" ||
      shelf.type === "recently-added"
    ) {
      if (unique.has(shelf.type)) {
        continue;
      }
      unique.add(shelf.type);
    }
    next.push(shelf);
  }
  return next;
}

function rawShelfTypes(rows: unknown[]): string[] {
  const types: string[] = [];
  for (const row of rows) {
    const parsed = ExplorerShelfSchema.safeParse(row);
    if (parsed.success) {
      types.push(parsed.data.type);
    }
  }
  return types;
}

export function coerceExplorerShelves(value: unknown): ExplorerShelf[] {
  const parsed = ExplorerShelvesSchema.safeParse(value);
  if (!parsed.success) {
    return defaultExplorerShelves();
  }
  const types = rawShelfTypes(parsed.data);
  if (
    types.join(",") === LEGACY_DEFAULT_SHELF_TYPES.join(",") ||
    types.join(",") === PREVIOUS_DEFAULT_SHELF_TYPES.join(",") ||
    types.join(",") === PRE_PINNED_DEFAULT_SHELF_TYPES.join(",")
  ) {
    return defaultExplorerShelves();
  }
  const shelves = collapseDuplicateShelves(
    parsed.data
      .map(coerceExplorerShelf)
      .filter((shelf): shelf is ExplorerShelf => !!shelf),
  );
  return shelves.length > 0 ? shelves : defaultExplorerShelves();
}

export function getExplorerShelves(): ExplorerShelf[] {
  const raw = getCachedPref(shelvesPrefKey(), ExplorerShelvesSchema);
  const shelves =
    raw == null ? defaultExplorerShelves() : coerceExplorerShelves(raw);
  return migrateUpcomingDeadlinesCoverDefault(shelves);
}

/**
 * Before layout options existed, Upcoming deadlines always stored `card`.
 * Remap that forced default to Cover once; after that, Card is a real choice.
 */
function migrateUpcomingDeadlinesCoverDefault(
  shelves: ExplorerShelf[],
): ExplorerShelf[] {
  const key = deadlinesLayoutMigrationKey();
  try {
    if (Zotero.Prefs.get(key, true)) {
      return shelves;
    }
  } catch {
    return shelves;
  }

  const next = shelves.map((shelf) =>
    shelf.type === "upcoming-deadlines" && shelf.layout === "card"
      ? { ...shelf, layout: "cover" as const }
      : shelf,
  );
  const changed = next.some(
    (shelf, index) => shelf.layout !== shelves[index]?.layout,
  );
  if (changed) {
    setExplorerShelves(next);
  }
  try {
    Zotero.Prefs.set(key, true, true);
  } catch {
    return changed ? next : shelves;
  }
  return changed ? next : shelves;
}

export function setExplorerShelves(shelves: ExplorerShelf[]): void {
  const key = shelvesPrefKey();
  Zotero.Prefs.set(key, JSON.stringify(shelves), true);
  zoteroCache.invalidatePref(key);
}

export function createExplorerShelf(
  type: Exclude<ExplorerShelfType, "collection" | "saved-search">,
  id: string,
): ExplorerShelf {
  return coerceExplorerShelf({
    id,
    type,
    layout: defaultLayoutForShelfType(type),
  }) as ExplorerShelf;
}

export function createCollectionShelf(
  id: string,
  libraryID: number,
  collectionKey: string,
): ExplorerCollectionShelf {
  return {
    id,
    type: "collection",
    layout: "cover",
    libraryID,
    collectionKey,
    groupBy: DEFAULT_COLLECTION_SHELF_GROUP_BY,
    sortBy: DEFAULT_COLLECTION_SHELF_SORT_BY,
    magazineTypeSize: DEFAULT_COLLECTION_SHELF_TYPE_SIZE,
  };
}

/** Resolved sort for a collection shelf (missing → auto). */
export function explorerShelfSortBy(
  shelf: ExplorerCollectionShelf | ExplorerShelf,
): GallerySortBy {
  if (shelf.type !== "collection") {
    return DEFAULT_COLLECTION_SHELF_SORT_BY;
  }
  return shelf.sortBy != null
    ? coerceGallerySortBy(shelf.sortBy)
    : DEFAULT_COLLECTION_SHELF_SORT_BY;
}

/** Resolved magazine type size for a collection shelf. */
export function explorerShelfMagazineTypeSize(
  shelf: ExplorerCollectionShelf | ExplorerShelf,
): MagazineTypeSize {
  if (shelf.type !== "collection") {
    return DEFAULT_COLLECTION_SHELF_TYPE_SIZE;
  }
  return shelf.magazineTypeSize != null
    ? coerceMagazineTypeSize(shelf.magazineTypeSize)
    : DEFAULT_COLLECTION_SHELF_TYPE_SIZE;
}

/**
 * Resolved groupBy for a collection shelf.
 * Missing groupBy defaults to classes (legacy Cover syllabus rails).
 * Gates match Gallery (auto only for magazine; classes only with syllabus).
 */
export function explorerShelfGroupBy(
  shelf: ExplorerCollectionShelf | ExplorerShelf,
  allow: GalleryGroupByAllow,
): GalleryGroupBy {
  if (shelf.type !== "collection") {
    return "none";
  }
  const layout = shelf.layout;
  const raw =
    shelf.groupBy != null
      ? coerceGalleryGroupBy(shelf.groupBy)
      : DEFAULT_COLLECTION_SHELF_GROUP_BY;
  return resolveGalleryGroupBy(raw, {
    classes: !!allow.classes,
    subcollections: allow.subcollections !== false,
    magazine: layout === "magazine",
  });
}

export function isExplorerCollectionShelf(
  shelf: ExplorerShelf,
): shelf is ExplorerCollectionShelf {
  return shelf.type === "collection";
}

export function createSavedSearchShelf(
  id: string,
  libraryID: number,
  searchKey: string,
): ExplorerShelf {
  return {
    id,
    type: "saved-search",
    layout: "magazine",
    libraryID,
    searchKey,
  };
}

export function collectionShelfKey(
  libraryID: number,
  collectionKey: string,
): string {
  return `${libraryID}:${collectionKey}`;
}

export function savedSearchShelfKey(
  libraryID: number,
  searchKey: string,
): string {
  return `${libraryID}:${searchKey}`;
}

export function isExplorerShelfEnabled(shelf: ExplorerShelf): boolean {
  return shelf.enabled !== false;
}

function matchesCollectionShelf(
  shelf: ExplorerShelf,
  libraryID: number,
  collectionKey: string,
): boolean {
  return (
    shelf.type === "collection" &&
    shelf.libraryID === libraryID &&
    shelf.collectionKey === collectionKey
  );
}

/** Whether the collection is currently shown as a Home shelf. */
export function isCollectionShelfOnHome(
  shelves: ExplorerShelf[],
  libraryID: number,
  collectionKey: string,
): boolean {
  const shelf = shelves.find((row) =>
    matchesCollectionShelf(row, libraryID, collectionKey),
  );
  return !!shelf && isExplorerShelfEnabled(shelf);
}

/**
 * Pure toggle: add/enable a collection shelf, or remove it when already on Home.
 * Nested collections that are removed do not reappear in the configure catalog.
 */
export function withToggledCollectionShelf(
  shelves: ExplorerShelf[],
  libraryID: number,
  collectionKey: string,
): ExplorerShelf[] {
  if (isCollectionShelfOnHome(shelves, libraryID, collectionKey)) {
    return shelves.filter(
      (row) => !matchesCollectionShelf(row, libraryID, collectionKey),
    );
  }

  const existing = shelves.find((row) =>
    matchesCollectionShelf(row, libraryID, collectionKey),
  );
  if (existing) {
    return shelves.map((row) =>
      matchesCollectionShelf(row, libraryID, collectionKey)
        ? { ...row, enabled: true }
        : row,
    );
  }

  return [
    ...shelves,
    createCollectionShelf(
      `catalog:collection:${collectionShelfKey(libraryID, collectionKey)}`,
      libraryID,
      collectionKey,
    ),
  ];
}

/** Toggle a collection as a Home shelf. Returns whether it is on Home afterward. */
export function toggleCollectionShelfOnHome(
  libraryID: number,
  collectionKey: string,
): boolean {
  const next = withToggledCollectionShelf(
    getExplorerShelves(),
    libraryID,
    collectionKey,
  );
  setExplorerShelves(next);
  return isCollectionShelfOnHome(next, libraryID, collectionKey);
}

export function mergeExplorerCatalog(
  shelves: ExplorerShelf[],
  libraryID: number,
  topLevelCollectionKeys: string[],
  savedSearchKeys: string[] = [],
): ExplorerShelf[] {
  const next: ExplorerShelf[] = [];
  const seenPreset = new Set<
    Exclude<ExplorerShelfType, "collection" | "saved-search">
  >();
  const seenCollection = new Set<string>();
  const seenSearch = new Set<string>();

  for (const shelf of shelves) {
    if (shelf.type === "collection") {
      const key = `${shelf.libraryID}:${shelf.collectionKey}`;
      if (seenCollection.has(key)) {
        continue;
      }
      seenCollection.add(key);
      const isTopLevel =
        shelf.libraryID === libraryID &&
        topLevelCollectionKeys.includes(shelf.collectionKey);
      if (!isTopLevel && !isExplorerShelfEnabled(shelf)) {
        continue;
      }
      next.push(shelf);
      continue;
    }
    if (shelf.type === "saved-search") {
      const key = savedSearchShelfKey(shelf.libraryID, shelf.searchKey);
      if (seenSearch.has(key)) {
        continue;
      }
      seenSearch.add(key);
      const inLibrary =
        shelf.libraryID === libraryID &&
        savedSearchKeys.includes(shelf.searchKey);
      if (!inLibrary && !isExplorerShelfEnabled(shelf)) {
        continue;
      }
      next.push(shelf);
      continue;
    }
    if (seenPreset.has(shelf.type)) {
      continue;
    }
    seenPreset.add(shelf.type);
    next.push(shelf);
  }

  for (const type of EXPLORER_SHELF_MENU_TYPES) {
    if (seenPreset.has(type)) {
      continue;
    }
    next.push({
      ...createExplorerShelf(type, `catalog:${type}`),
      enabled: false,
    });
  }

  for (const collectionKey of topLevelCollectionKeys) {
    const key = `${libraryID}:${collectionKey}`;
    if (seenCollection.has(key)) {
      continue;
    }
    next.push({
      ...createCollectionShelf(
        `catalog:collection:${key}`,
        libraryID,
        collectionKey,
      ),
      enabled: false,
    });
  }

  for (const searchKey of savedSearchKeys) {
    const key = savedSearchShelfKey(libraryID, searchKey);
    if (seenSearch.has(key)) {
      continue;
    }
    next.push({
      ...createSavedSearchShelf(`catalog:search:${key}`, libraryID, searchKey),
      enabled: false,
    });
  }

  return next;
}

export function useExplorerShelves(): [
  ExplorerShelf[],
  (shelves: ExplorerShelf[]) => void,
] {
  const [shelves, setShelvesState] = useState(getExplorerShelves);

  useEffect(() => {
    const refresh = () => setShelvesState(getExplorerShelves());
    refresh();
    const observerID = Zotero.Prefs.registerObserver(
      shelvesPrefKey(),
      refresh,
      true,
    );
    return () => {
      Zotero.Prefs.unregisterObserver(observerID);
    };
  }, []);

  const setShelves = useCallback((next: ExplorerShelf[]) => {
    setShelvesState(next);
    setExplorerShelves(next);
  }, []);

  return [shelves, setShelves];
}

export function getLibraryViewMode(libraryID: number): LibraryViewMode {
  const map = getCachedPref(libraryViewPrefKey(), LibraryViewModesSchema) || {};
  const parsed = LibraryViewModeSchema.safeParse(map[String(libraryID)]);
  return parsed.success ? parsed.data : "collection";
}

export function setLibraryViewMode(
  libraryID: number,
  mode: LibraryViewMode,
): void {
  const key = libraryViewPrefKey();
  const map = getCachedPref(key, LibraryViewModesSchema) || {};
  map[String(libraryID)] = mode;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}
