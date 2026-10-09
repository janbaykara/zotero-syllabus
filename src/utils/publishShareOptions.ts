import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "./cache";
import { getGalleryLayout } from "../modules/galleryLayout";
import { getGallerySortBy } from "../modules/gallerySort";
import { getGalleryGroupBy } from "../modules/galleryGroupBy";
import { getViewItemDensity } from "../modules/react-zotero-sync/itemDensity";
import { getShowItemsWithoutAnnotations } from "../modules/showItemsWithoutAnnotations";
import {
  getAnnotationColorFilter,
  getAnnotationTagFilter,
  getViewQuoteOrder,
} from "../modules/myAnnotationsPrefs";
import { syllabusViewKey } from "./viewScope";
import {
  defaultShareOptions,
  type CollectionShareOptions,
  type ShareGalleryGroupBy,
  type ShareGalleryLayout,
  type ShareGallerySortBy,
  type ShareItemDensity,
  type ShareKind,
  type ShareQuoteOrder,
  type ShareViewSettings,
} from "./sharePayload";

const ShareViewSchema = z.object({
  layout: z.enum(["card", "cover", "annotations", "magazine"]),
  sortBy: z.enum(["title", "date", "dateAdded", "personalOrder"]),
  groupBy: z.enum([
    "none",
    "auto",
    "type",
    "creator",
    "tags",
    "subcollections",
  ]),
  density: z.enum(["row", "standard", "expanded"]),
  quoteOrder: z.enum(["location", "dateAdded"]),
  colorFilter: z.array(z.string()),
  tagFilter: z.array(z.string()),
  showItemsWithoutAnnotations: z.boolean(),
  includeAutomaticTags: z.boolean(),
  readerMode: z.boolean(),
  showBibliography: z.boolean(),
});

const ShareOptionsSchema = z.object({
  kind: z.enum(["syllabus", "gallery"]),
  includeAnnotations: z.boolean(),
  includeAttachments: z.boolean().default(true),
  view: ShareViewSchema,
});

const ShareOptionsMapSchema = z.record(z.string(), ShareOptionsSchema);

function prefKey(): string {
  return `${config.prefsPrefix}.publishShareOptions`;
}

export function getPublishedShareOptions(
  collectionId: number,
): CollectionShareOptions | null {
  const map = getCachedPref(prefKey(), ShareOptionsMapSchema) || {};
  const raw = map[String(collectionId)];
  if (!raw) return null;
  const parsed = ShareOptionsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function setPublishedShareOptions(
  collectionId: number,
  options: CollectionShareOptions,
): void {
  const key = prefKey();
  const map = { ...(getCachedPref(key, ShareOptionsMapSchema) || {}) };
  map[String(collectionId)] = options;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function clearPublishedShareOptions(collectionId: number): void {
  const key = prefKey();
  const map = { ...(getCachedPref(key, ShareOptionsMapSchema) || {}) };
  if (!(String(collectionId) in map)) return;
  delete map[String(collectionId)];
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

function asLayout(value: string): ShareGalleryLayout {
  if (
    value === "card" ||
    value === "cover" ||
    value === "annotations" ||
    value === "magazine"
  ) {
    return value;
  }
  return "cover";
}

function asSort(value: string): ShareGallerySortBy {
  if (
    value === "title" ||
    value === "date" ||
    value === "dateAdded" ||
    value === "personalOrder"
  ) {
    return value;
  }
  return "title";
}

function asGroup(value: string): ShareGalleryGroupBy {
  if (
    value === "none" ||
    value === "auto" ||
    value === "type" ||
    value === "creator" ||
    value === "tags" ||
    value === "subcollections"
  ) {
    return value;
  }
  return "none";
}

function asDensity(value: string): ShareItemDensity {
  if (value === "row" || value === "standard" || value === "expanded") {
    return value;
  }
  return "expanded";
}

function asQuoteOrder(value: string): ShareQuoteOrder {
  return value === "dateAdded" ? "dateAdded" : "location";
}

/**
 * Seed wizard options from current view prefs for the collection.
 * When stored options match `kind`, reuse include* flags (view chrome still
 * comes from live prefs when `preferPageKind`).
 */
export function seedShareOptionsFromView(opts: {
  collectionId: number;
  kind: ShareKind;
  /**
   * When true (opening from Syllabus/Gallery UI), always use `kind` from the
   * current page and live view prefs — do not restore a previously published
   * kind’s frozen view snapshot over the page default.
   */
  preferPageKind?: boolean;
}): CollectionShareOptions {
  const { collectionId, kind, preferPageKind } = opts;
  const stored = getPublishedShareOptions(collectionId);
  if (stored && stored.kind === kind && !preferPageKind) {
    return {
      ...stored,
      view: { ...stored.view, readerMode: false },
    };
  }

  const base = defaultShareOptions(kind);
  const viewKey =
    kind === "syllabus" ? syllabusViewKey(collectionId) : String(collectionId);

  const layout = asLayout(getGalleryLayout(viewKey));
  const sortBy = asSort(getGallerySortBy(viewKey));
  let groupBy = asGroup(getGalleryGroupBy(viewKey));
  if (sortBy === "personalOrder") {
    groupBy = "none";
  }

  const view: ShareViewSettings = {
    layout,
    sortBy,
    groupBy,
    density: asDensity(getViewItemDensity(viewKey)),
    quoteOrder: asQuoteOrder(getViewQuoteOrder(viewKey)),
    colorFilter: [...getAnnotationColorFilter(viewKey)],
    tagFilter: [...getAnnotationTagFilter(viewKey)],
    showItemsWithoutAnnotations: getShowItemsWithoutAnnotations(viewKey),
    // Public page defaults off; recipients can enable in the ⋯ menu.
    includeAutomaticTags: false,
    // Personal / local-only — never publish.
    readerMode: false,
    // Always include bibliography on the public page.
    showBibliography: true,
  };

  return {
    kind,
    includeAnnotations: stored?.includeAnnotations ?? layout === "annotations",
    includeAttachments: stored?.includeAttachments ?? base.includeAttachments,
    view,
  };
}
