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
  annotationColorFilterFromMap,
  parseAnnotationColorFilter,
  serializeAnnotationColorFilter,
} from "../utils/annotationColors";
import {
  coerceAnnotationsQuoteOrder,
  type AnnotationsQuoteOrder,
} from "./explorerQueries";

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

const ColorFilterMapSchema = z.record(z.string(), z.unknown());

export const ANNOTATION_COLOR_FILTER_FEED = "feed";
export const ANNOTATION_COLOR_FILTER_EXPLORER = "explorer";

export function annotationColorFilterPrefKey(): string {
  return `${config.prefsPrefix}.annotationColorFilter`;
}

export function getAnnotationColorFilter(scope: string): string[] {
  return annotationColorFilterFromMap(
    getCachedPref(annotationColorFilterPrefKey(), ColorFilterMapSchema),
    scope,
    getPref("myAnnotationsColorFilter"),
  );
}

export function setAnnotationColorFilter(
  scope: string,
  hexes: readonly string[],
): void {
  const key = String(scope);
  if (!key) {
    return;
  }
  const prefKey = annotationColorFilterPrefKey();
  const map = {
    ...(getCachedPref(prefKey, ColorFilterMapSchema) || {}),
  };
  const serialized = serializeAnnotationColorFilter(hexes);
  if (serialized) {
    map[key] = serialized;
  } else {
    delete map[key];
  }
  Zotero.Prefs.set(prefKey, JSON.stringify(map), true);
  zoteroCache.invalidatePref(prefKey);
  if (key === ANNOTATION_COLOR_FILTER_FEED) {
    setPref("myAnnotationsColorFilter", "");
    zoteroCache.invalidatePref(getPrefKey("myAnnotationsColorFilter"));
  }
}

export function useAnnotationColorFilter(
  scope: string,
): [string[], (hexes: readonly string[]) => void] {
  const [hexes, setHexes] = useState<string[]>(() =>
    getAnnotationColorFilter(scope),
  );

  useEffect(() => {
    const refresh = () => setHexes(getAnnotationColorFilter(scope));
    refresh();
    const observerID = Zotero.Prefs.registerObserver(
      annotationColorFilterPrefKey(),
      refresh,
      true,
    );
    return () => Zotero.Prefs.unregisterObserver(observerID);
  }, [scope]);

  const setFilter = useCallback(
    (next: readonly string[]) => {
      const parsed = parseAnnotationColorFilter(next.join(","));
      setHexes(parsed);
      setAnnotationColorFilter(scope, parsed);
    },
    [scope],
  );

  return [hexes, setFilter];
}

export function getAnnotationsQuoteOrder(): AnnotationsQuoteOrder {
  return coerceAnnotationsQuoteOrder(getPref("annotationsQuoteOrder"));
}

export function setAnnotationsQuoteOrder(mode: AnnotationsQuoteOrder): void {
  setPref("annotationsQuoteOrder", mode);
  zoteroCache.invalidatePref(getPrefKey("annotationsQuoteOrder"));
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
