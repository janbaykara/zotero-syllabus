import { useCallback, useEffect, useState } from "preact/hooks";
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
  coerceAnnotationsQuoteOrder,
  type AnnotationsQuoteOrder,
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

export function useMyAnnotationsLayout(): [
  MyAnnotationsLayout,
  (mode: MyAnnotationsLayout) => void,
] {
  const [mode, setMode] = useState<MyAnnotationsLayout>(() =>
    getMyAnnotationsLayout(),
  );

  useEffect(() => {
    const refresh = () => setMode(getMyAnnotationsLayout());
    refresh();
    const observerID = Zotero.Prefs.registerObserver(
      getPrefKey("myAnnotationsLayout"),
      refresh,
      true,
    );
    return () => Zotero.Prefs.unregisterObserver(observerID);
  }, []);

  const setLayout = useCallback((next: MyAnnotationsLayout) => {
    setMode(next);
    setMyAnnotationsLayout(next);
  }, []);

  return [mode, setLayout];
}

export function useMyAnnotationsSortBy(): [
  GallerySortBy,
  (mode: GallerySortBy) => void,
] {
  const [mode, setMode] = useState<GallerySortBy>(() =>
    getMyAnnotationsSortBy(),
  );

  useEffect(() => {
    const refresh = () => setMode(getMyAnnotationsSortBy());
    refresh();
    const observerID = Zotero.Prefs.registerObserver(
      getPrefKey("myAnnotationsSort"),
      refresh,
      true,
    );
    return () => Zotero.Prefs.unregisterObserver(observerID);
  }, []);

  const setSortBy = useCallback((next: GallerySortBy) => {
    setMode(next);
    setMyAnnotationsSortBy(next);
  }, []);

  return [mode, setSortBy];
}

export function useMyAnnotationsGroupBy(
  allow: GalleryGroupByAllow = {},
): [GalleryGroupBy, (mode: GalleryGroupBy) => void] {
  const allowClasses = !!allow.classes;
  const allowSubcollections = allow.subcollections !== false;
  const allowMagazine = !!allow.magazine;
  const [mode, setMode] = useState<GalleryGroupBy>(() =>
    getMyAnnotationsGroupBy(),
  );

  useEffect(() => {
    const refresh = () => setMode(getMyAnnotationsGroupBy());
    refresh();
    const observerID = Zotero.Prefs.registerObserver(
      getPrefKey("myAnnotationsGroupBy"),
      refresh,
      true,
    );
    return () => Zotero.Prefs.unregisterObserver(observerID);
  }, []);

  const allowOpts = {
    classes: allowClasses,
    subcollections: allowSubcollections,
    magazine: allowMagazine,
  };
  const resolved = resolveGalleryGroupBy(mode, allowOpts);

  const setGroupBy = useCallback(
    (next: GalleryGroupBy) => {
      const allowed = resolveGalleryGroupBy(next, {
        classes: allowClasses,
        subcollections: allowSubcollections,
        magazine: allowMagazine,
      });
      setMode(allowed);
      setMyAnnotationsGroupBy(allowed);
    },
    [allowClasses, allowMagazine, allowSubcollections],
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

export function useMyAnnotationsOrder(): [
  MyAnnotationsOrder,
  (mode: MyAnnotationsOrder) => void,
] {
  const [mode, setMode] = useState<MyAnnotationsOrder>(() =>
    getMyAnnotationsOrder(),
  );

  useEffect(() => {
    const refresh = () => setMode(getMyAnnotationsOrder());
    refresh();
    const observerID = Zotero.Prefs.registerObserver(
      getPrefKey("myAnnotationsOrder"),
      refresh,
      true,
    );
    return () => Zotero.Prefs.unregisterObserver(observerID);
  }, []);

  const setOrder = useCallback((next: MyAnnotationsOrder) => {
    setMode(next);
    setMyAnnotationsOrder(next);
  }, []);

  return [mode, setOrder];
}

export const ANNOTATION_COLOR_FILTER_FEED = "feed";
export const ANNOTATION_COLOR_FILTER_EXPLORER = "explorer";
export const ANNOTATION_COLOR_FILTER_EXPLORER_PINNED = "explorer-pinned";

export function annotationColorFilterPrefKey(): string {
  return `${config.prefsPrefix}.annotationColorFilter`;
}

export function colorFilterInheritsDefault(scope: string): boolean {
  return (
    scope !== ANNOTATION_COLOR_FILTER_FEED &&
    scope !== ANNOTATION_COLOR_FILTER_EXPLORER &&
    scope !== ANNOTATION_COLOR_FILTER_EXPLORER_PINNED
  );
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

export function useAnnotationsQuoteOrder(): [
  AnnotationsQuoteOrder,
  (mode: AnnotationsQuoteOrder) => void,
] {
  const [mode, setMode] = useState<AnnotationsQuoteOrder>(() =>
    getAnnotationsQuoteOrder(),
  );

  useEffect(() => {
    const refresh = () => setMode(getAnnotationsQuoteOrder());
    refresh();
    const observerID = Zotero.Prefs.registerObserver(
      getPrefKey("annotationsQuoteOrder"),
      refresh,
      true,
    );
    return () => Zotero.Prefs.unregisterObserver(observerID);
  }, []);

  const setOrder = useCallback((next: AnnotationsQuoteOrder) => {
    setMode(next);
    setAnnotationsQuoteOrder(next);
  }, []);

  return [mode, setOrder];
}
