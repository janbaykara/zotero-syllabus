import * as z from "zod";
import { config } from "../../package.json";
import {
  getViewPref,
  getViewPrefDefault,
  saveViewPrefGlobally,
  setViewPref,
  setViewPrefDefault,
  useViewPref,
  type ViewPrefGlobalSetting,
  type ViewPrefSpec,
} from "../utils/viewPref";
import { isSyllabusDisplayViewKey } from "../utils/viewScope";

export const GALLERY_LAYOUT_MODES = [
  "card",
  "cover",
  "annotations",
  "magazine",
] as const;

export type GalleryLayout = (typeof GALLERY_LAYOUT_MODES)[number];

/**
 * Matches `.container-padded` / `max-w-4xl`. Cover & Magazine tile width is
 * sized so four tiles + gaps fill that column's *content box* exactly.
 * Padding is inside max-width (see `.container-padded`), so subtract it.
 */
export const READING_NARROW_MAX = "56rem";
/** Each side; matches `.container-padded` at ≥48rem. */
export const READING_NARROW_PAD_X_REM = 2.5;
export const READING_TILE_GAP = "1.25rem";
/** Item counts at or below this stay on the narrow, left-aligned column. */
export const READING_NARROW_MAX_ITEMS = 4;

export type ReadingItemsPackMode = "narrow" | "centered" | "fill";

/** Fixed tile width: (contentMax − gaps between N tiles) / N, minus 1px for
 *  subpixel rounding so auto-fill / fixed tracks don't wrap early. */
export function readingTileWidthCss(): string {
  const gaps = READING_NARROW_MAX_ITEMS - 1;
  const content = `calc(${READING_NARROW_MAX} - 2 * ${READING_NARROW_PAD_X_REM}rem)`;
  return `calc((${content} - ${gaps} * ${READING_TILE_GAP}) / ${READING_NARROW_MAX_ITEMS} - 1px)`;
}

/** How many fixed tiles fit in a full-pane row (padding deducted). */
export function readingTilesFitCount(
  containerWidthPx: number,
  rootFontPx = 16,
): number {
  if (containerWidthPx <= 0) {
    return READING_NARROW_MAX_ITEMS;
  }
  const gap = 1.25 * rootFontPx;
  const gaps = READING_NARROW_MAX_ITEMS - 1;
  // Match readingTileWidthCss() content box (56rem − 2×2.5rem pad).
  const contentMaxRem = 56 - 2 * READING_NARROW_PAD_X_REM;
  const tile =
    (contentMaxRem * rootFontPx - gaps * gap) / READING_NARROW_MAX_ITEMS - 1;
  // Match container-padded-wide horizontal padding (px-6 / md:px-10).
  const pad =
    (containerWidthPx >= 48 * rootFontPx ? 2.5 : 1.5) * 2 * rootFontPx;
  const available = Math.max(0, containerWidthPx - pad);
  return Math.max(1, Math.floor((available + gap) / (tile + gap)));
}

/**
 * - ≤4 and they fit: narrow column, left-aligned
 * - more than 4 but ≤ what fits on screen: full width, centred
 * - more than fit: full width, left-aligned wrapping
 */
export function readingItemsPackMode(
  itemCount: number,
  fitCount: number,
): ReadingItemsPackMode {
  if (itemCount <= 0) {
    return "narrow";
  }
  if (itemCount <= READING_NARROW_MAX_ITEMS && itemCount <= fitCount) {
    return "narrow";
  }
  if (itemCount <= fitCount) {
    return "centered";
  }
  return "fill";
}

export function readingContentWidthClass(
  layout: GalleryLayout = "card",
  pack: ReadingItemsPackMode | number = "narrow",
): "container-padded" | "container-padded-wide" {
  if (layout === "card") {
    return "container-padded";
  }
  // Back-compat: callers that still pass an item count.
  const mode: ReadingItemsPackMode =
    typeof pack === "number"
      ? pack <= READING_NARROW_MAX_ITEMS
        ? "narrow"
        : "centered"
      : pack;
  return mode === "narrow" ? "container-padded" : "container-padded-wide";
}

export function readingItemsPackClass(
  mode: ReadingItemsPackMode,
): string | undefined {
  if (mode === "narrow") {
    return "is-narrow";
  }
  if (mode === "centered") {
    return "is-centered";
  }
  return "is-fill";
}

export type GalleryGlobalSetting<T> = ViewPrefGlobalSetting<T>;

const GalleryLayoutSchema = z.enum(GALLERY_LAYOUT_MODES);

function layoutMapKey() {
  return `${config.prefsPrefix}.galleryLayout`;
}

export function coerceGalleryLayout(value: unknown): GalleryLayout {
  const parsed = GalleryLayoutSchema.safeParse(value);
  return parsed.success ? parsed.data : "cover";
}

function coerceSyllabusLayout(value: unknown): GalleryLayout {
  const parsed = GalleryLayoutSchema.safeParse(value);
  return parsed.success ? parsed.data : "card";
}

const galleryLayoutSpec: ViewPrefSpec<GalleryLayout> = {
  mapKey: layoutMapKey(),
  defaultKey: "defaultGalleryLayout",
  coerce: coerceGalleryLayout,
};

const syllabusLayoutSpec: ViewPrefSpec<GalleryLayout> = {
  mapKey: layoutMapKey(),
  defaultKey: "defaultSyllabusLayout",
  coerce: coerceSyllabusLayout,
};

export function layoutSpecForView(
  viewKey: string | number,
): ViewPrefSpec<GalleryLayout> {
  return isSyllabusDisplayViewKey(String(viewKey))
    ? syllabusLayoutSpec
    : galleryLayoutSpec;
}

export function getDefaultGalleryLayout(): GalleryLayout {
  return getViewPrefDefault(galleryLayoutSpec);
}

export function setDefaultGalleryLayout(mode: GalleryLayout): void {
  setViewPrefDefault(galleryLayoutSpec, mode);
}

export function getDefaultSyllabusLayout(): GalleryLayout {
  return getViewPrefDefault(syllabusLayoutSpec);
}

export function setDefaultSyllabusLayout(mode: GalleryLayout): void {
  setViewPrefDefault(syllabusLayoutSpec, mode);
}

export function getGalleryLayout(
  viewKey: string | number,
  unsetDefault?: GalleryLayout,
): GalleryLayout {
  return getViewPref(layoutSpecForView(viewKey), viewKey, unsetDefault);
}

export function setGalleryLayout(
  viewKey: string | number,
  mode: GalleryLayout,
): void {
  setViewPref(layoutSpecForView(viewKey), viewKey, mode);
}

export function saveGalleryLayoutGlobally(
  viewKey: string | number,
  mode: GalleryLayout,
): void {
  saveViewPrefGlobally(layoutSpecForView(viewKey), viewKey, mode);
}

export function useGalleryLayout(
  viewKey: string | number,
  unsetDefault?: GalleryLayout,
): [
  GalleryLayout,
  (mode: GalleryLayout) => void,
  GalleryGlobalSetting<GalleryLayout>,
] {
  return useViewPref(layoutSpecForView(viewKey), viewKey, unsetDefault);
}
