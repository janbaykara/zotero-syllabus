import { useCallback } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import {
  coerceGalleryGroupBy,
  resolveGalleryGroupBy,
  type GalleryGroupBy,
  type GalleryGroupByAllow,
} from "./galleryGroupBy";
import { coerceGallerySortBy, type GallerySortBy } from "./gallerySort";
import { getPref, getPrefKey, setPref } from "../utils/prefs";
import { getCachedPref, zoteroCache } from "../utils/cache";
import {
  parseAnnotationColorFilter,
  serializeAnnotationColorFilter,
} from "../utils/annotationColors";
import {
  parseAnnotationTagFilter,
  serializeAnnotationTagFilter,
} from "../utils/annotationTags";
import {
  coerceAnnotationsQuoteOrder,
  coerceMyAnnotationsSearchScope,
  type AnnotationsQuoteOrder,
  type MyAnnotationsSearchScope,
} from "./explorerQueries";
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
import { createCoercedPrefHooks } from "./react-zotero-sync/coercedPref";

export type { MyAnnotationsSearchScope };

export const MY_ANNOTATIONS_LAYOUTS = ["vertical", "grid"] as const;
export type MyAnnotationsLayout = (typeof MY_ANNOTATIONS_LAYOUTS)[number];

function coerceMyAnnotationsLayout(value: unknown): MyAnnotationsLayout {
  // Legacy cover/card prefs map onto the stacked vertical mode.
  if (value === "vertical" || value === "cover" || value === "card") {
    return "vertical";
  }
  return "grid";
}

/** Dedicated prefs for My Annotations — separate from Gallery defaults. */
export function getMyAnnotationsLayout(): MyAnnotationsLayout {
  return coerceMyAnnotationsLayout(getPref("myAnnotationsLayout"));
}

export function setMyAnnotationsLayout(mode: MyAnnotationsLayout): void {
  setPref("myAnnotationsLayout", mode);
  zoteroCache.invalidatePref(getPrefKey("myAnnotationsLayout"));
}

export function getMyAnnotationsSortBy(): GallerySortBy {
  return coerceGallerySortBy(getPref("myAnnotationsSort"));
}

export function setMyAnnotationsSortBy(mode: GallerySortBy): void {
  setPref("myAnnotationsSort", mode);
  zoteroCache.invalidatePref(getPrefKey("myAnnotationsSort"));
}

export function getMyAnnotationsGroupBy(): GalleryGroupBy {
  return coerceGalleryGroupBy(getPref("myAnnotationsGroupBy"));
}

export function setMyAnnotationsGroupBy(mode: GalleryGroupBy): void {
  setPref("myAnnotationsGroupBy", mode);
  zoteroCache.invalidatePref(getPrefKey("myAnnotationsGroupBy"));
}

export const useMyAnnotationsLayout = createCoercedPrefHooks(
  "myAnnotationsLayout",
  getMyAnnotationsLayout,
  setMyAnnotationsLayout,
);

export const useMyAnnotationsSortBy = createCoercedPrefHooks(
  "myAnnotationsSort",
  getMyAnnotationsSortBy,
  setMyAnnotationsSortBy,
);

const useMyAnnotationsGroupByRaw = createCoercedPrefHooks(
  "myAnnotationsGroupBy",
  getMyAnnotationsGroupBy,
  setMyAnnotationsGroupBy,
);

export function useMyAnnotationsGroupBy(
  allow: GalleryGroupByAllow = {},
): [GalleryGroupBy, (mode: GalleryGroupBy) => void] {
  const allowClasses = !!allow.classes;
  const allowSubcollections = allow.subcollections !== false;
  const allowMagazine = !!allow.magazine;
  const [mode, setMode] = useMyAnnotationsGroupByRaw();

  const allowOpts = {
    classes: allowClasses,
    subcollections: allowSubcollections,
    magazine: allowMagazine,
  };
  const resolved = resolveGalleryGroupBy(mode, allowOpts);

  const setGroupBy = useCallback(
    (next: GalleryGroupBy) => {
      setMode(
        resolveGalleryGroupBy(next, {
          classes: allowClasses,
          subcollections: allowSubcollections,
          magazine: allowMagazine,
        }),
      );
    },
    [allowClasses, allowMagazine, allowSubcollections, setMode],
  );

  return [resolved, setGroupBy];
}

export const MY_ANNOTATIONS_ORDERS = ["newestLast", "newestFirst"] as const;
export type MyAnnotationsOrder = (typeof MY_ANNOTATIONS_ORDERS)[number];

function coerceMyAnnotationsOrder(value: unknown): MyAnnotationsOrder {
  if (value === "newestFirst") {
    return "newestFirst";
  }
  return "newestLast";
}

export function getMyAnnotationsOrder(): MyAnnotationsOrder {
  return coerceMyAnnotationsOrder(getPref("myAnnotationsOrder"));
}

export function setMyAnnotationsOrder(mode: MyAnnotationsOrder): void {
  setPref("myAnnotationsOrder", mode);
  zoteroCache.invalidatePref(getPrefKey("myAnnotationsOrder"));
}

export const useMyAnnotationsOrder = createCoercedPrefHooks(
  "myAnnotationsOrder",
  getMyAnnotationsOrder,
  setMyAnnotationsOrder,
);

export const MY_ANNOTATIONS_SEARCH_SCOPES = [
  "both",
  "annotations",
  "fulltext",
] as const;

export function getMyAnnotationsSearchScope(): MyAnnotationsSearchScope {
  return coerceMyAnnotationsSearchScope(getPref("myAnnotationsSearchScope"));
}

export function setMyAnnotationsSearchScope(
  mode: MyAnnotationsSearchScope,
): void {
  setPref("myAnnotationsSearchScope", mode);
  zoteroCache.invalidatePref(getPrefKey("myAnnotationsSearchScope"));
}

export const useMyAnnotationsSearchScope = createCoercedPrefHooks(
  "myAnnotationsSearchScope",
  getMyAnnotationsSearchScope,
  setMyAnnotationsSearchScope,
);

export const ANNOTATION_COLOR_FILTER_FEED = "feed";
export const ANNOTATION_COLOR_FILTER_EXPLORER = "explorer";
export const ANNOTATION_COLOR_FILTER_EXPLORER_PINNED = "explorer-pinned";

export const ANNOTATION_TAG_FILTER_FEED = ANNOTATION_COLOR_FILTER_FEED;

export function annotationColorFilterPrefKey(): string {
  return `${config.prefsPrefix}.annotationColorFilter`;
}

export function annotationTagFilterPrefKey(): string {
  return `${config.prefsPrefix}.annotationTagFilter`;
}

export function colorFilterInheritsDefault(scope: string): boolean {
  return (
    scope !== ANNOTATION_COLOR_FILTER_FEED &&
    scope !== ANNOTATION_COLOR_FILTER_EXPLORER &&
    scope !== ANNOTATION_COLOR_FILTER_EXPLORER_PINNED
  );
}

export function tagFilterInheritsDefault(scope: string): boolean {
  return colorFilterInheritsDefault(scope);
}

const colorFilterSpec: ViewPrefSpec<string[]> = {
  mapKey: `${config.prefsPrefix}.annotationColorFilter`,
  defaultKey: "defaultAnnotationColorFilter",
  coerce: parseAnnotationColorFilter,
  serialize: serializeAnnotationColorFilter,
  equal: (a, b) =>
    serializeAnnotationColorFilter(a) === serializeAnnotationColorFilter(b),
  inheritDefault: colorFilterInheritsDefault,
};

export function getDefaultAnnotationColorFilter(): string[] {
  return getViewPrefDefault(colorFilterSpec);
}

export function getAnnotationColorFilter(scope: string): string[] {
  if (
    !colorFilterInheritsDefault(scope) &&
    scope === ANNOTATION_COLOR_FILTER_FEED
  ) {
    const map = getCachedPref(
      annotationColorFilterPrefKey(),
      z.record(z.string(), z.unknown()),
    );
    if (!map || !Object.prototype.hasOwnProperty.call(map, scope)) {
      return parseAnnotationColorFilter(getPref("myAnnotationsColorFilter"));
    }
  }
  return getViewPref(colorFilterSpec, scope);
}

export function setAnnotationColorFilter(
  scope: string,
  hexes: readonly string[],
): void {
  const parsed = parseAnnotationColorFilter(hexes.join(","));
  setViewPref(colorFilterSpec, scope, parsed);
  if (scope === ANNOTATION_COLOR_FILTER_FEED) {
    setPref("myAnnotationsColorFilter", "");
    zoteroCache.invalidatePref(getPrefKey("myAnnotationsColorFilter"));
  }
}

export function saveAnnotationColorFilterGlobally(
  scope: string,
  hexes: readonly string[],
): void {
  saveViewPrefGlobally(
    colorFilterSpec,
    scope,
    parseAnnotationColorFilter(hexes.join(",")),
  );
}

export function useAnnotationColorFilter(
  scope: string,
): [
  string[],
  (hexes: readonly string[]) => void,
  ViewPrefGlobalSetting<string[]>,
] {
  const [hexes, setHexes, global] = useViewPref(colorFilterSpec, scope);
  const setFilter = useCallback(
    (next: readonly string[]) => {
      const parsed = parseAnnotationColorFilter(next.join(","));
      setHexes(parsed);
      if (scope === ANNOTATION_COLOR_FILTER_FEED) {
        setPref("myAnnotationsColorFilter", "");
        zoteroCache.invalidatePref(getPrefKey("myAnnotationsColorFilter"));
      }
    },
    [scope, setHexes],
  );
  return [hexes, setFilter, global];
}

const tagFilterSpec: ViewPrefSpec<string[]> = {
  mapKey: `${config.prefsPrefix}.annotationTagFilter`,
  defaultKey: "defaultAnnotationTagFilter",
  coerce: parseAnnotationTagFilter,
  serialize: serializeAnnotationTagFilter,
  equal: (a, b) =>
    serializeAnnotationTagFilter(a) === serializeAnnotationTagFilter(b),
  inheritDefault: tagFilterInheritsDefault,
};

export function getDefaultAnnotationTagFilter(): string[] {
  return getViewPrefDefault(tagFilterSpec);
}

export function getAnnotationTagFilter(scope: string): string[] {
  if (
    !tagFilterInheritsDefault(scope) &&
    scope === ANNOTATION_TAG_FILTER_FEED
  ) {
    const map = getCachedPref(
      annotationTagFilterPrefKey(),
      z.record(z.string(), z.unknown()),
    );
    if (!map || !Object.prototype.hasOwnProperty.call(map, scope)) {
      return parseAnnotationTagFilter(getPref("myAnnotationsTagFilter"));
    }
  }
  return getViewPref(tagFilterSpec, scope);
}

export function setAnnotationTagFilter(
  scope: string,
  tags: readonly string[],
): void {
  const parsed = parseAnnotationTagFilter(serializeAnnotationTagFilter(tags));
  setViewPref(tagFilterSpec, scope, parsed);
  if (scope === ANNOTATION_TAG_FILTER_FEED) {
    setPref("myAnnotationsTagFilter", "");
    zoteroCache.invalidatePref(getPrefKey("myAnnotationsTagFilter"));
  }
}

export function saveAnnotationTagFilterGlobally(
  scope: string,
  tags: readonly string[],
): void {
  saveViewPrefGlobally(
    tagFilterSpec,
    scope,
    parseAnnotationTagFilter(serializeAnnotationTagFilter(tags)),
  );
}

export function useAnnotationTagFilter(
  scope: string,
): [
  string[],
  (tags: readonly string[]) => void,
  ViewPrefGlobalSetting<string[]>,
] {
  const [tags, setTags, global] = useViewPref(tagFilterSpec, scope);
  const setFilter = useCallback(
    (next: readonly string[]) => {
      const parsed = parseAnnotationTagFilter(
        serializeAnnotationTagFilter(next),
      );
      setTags(parsed);
      if (scope === ANNOTATION_TAG_FILTER_FEED) {
        setPref("myAnnotationsTagFilter", "");
        zoteroCache.invalidatePref(getPrefKey("myAnnotationsTagFilter"));
      }
    },
    [scope, setTags],
  );
  return [tags, setFilter, global];
}

const quoteOrderSpec: ViewPrefSpec<AnnotationsQuoteOrder> = {
  mapKey: `${config.prefsPrefix}.annotationsQuoteOrderByView`,
  defaultKey: "annotationsQuoteOrder",
  coerce: coerceAnnotationsQuoteOrder,
};

export function getAnnotationsQuoteOrder(): AnnotationsQuoteOrder {
  return getViewPrefDefault(quoteOrderSpec);
}

export function setAnnotationsQuoteOrder(mode: AnnotationsQuoteOrder): void {
  setViewPrefDefault(quoteOrderSpec, mode);
}

export function getViewQuoteOrder(
  viewKey: string | number,
): AnnotationsQuoteOrder {
  return getViewPref(quoteOrderSpec, viewKey);
}

export function setViewQuoteOrder(
  viewKey: string | number,
  mode: AnnotationsQuoteOrder,
): void {
  setViewPref(quoteOrderSpec, viewKey, mode);
}

export function useViewQuoteOrder(
  viewKey: string | number,
): [
  AnnotationsQuoteOrder,
  (mode: AnnotationsQuoteOrder) => void,
  ViewPrefGlobalSetting<AnnotationsQuoteOrder>,
] {
  return useViewPref(quoteOrderSpec, viewKey);
}

export const useAnnotationsQuoteOrder = createCoercedPrefHooks(
  "annotationsQuoteOrder",
  getAnnotationsQuoteOrder,
  setAnnotationsQuoteOrder,
);
