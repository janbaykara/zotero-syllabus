import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";
import { getPref, getPrefKey, setPref } from "../utils/prefs";
import type { GalleryGlobalSetting } from "./galleryLayout";

export const GALLERY_SORT_MODES = [
  "auto",
  "title",
  "date",
  "dateAdded",
] as const;

export type GallerySortBy = (typeof GALLERY_SORT_MODES)[number];

const GallerySortBySchema = z.enum(GALLERY_SORT_MODES);
const GallerySortByMapSchema = z.record(z.string(), z.unknown());

function prefKey() {
  return `${config.prefsPrefix}.gallerySort`;
}

export function coerceGallerySortBy(value: unknown): GallerySortBy {
  const parsed = GallerySortBySchema.safeParse(value);
  return parsed.success ? parsed.data : "auto";
}

export function getDefaultGallerySortBy(): GallerySortBy {
  return coerceGallerySortBy(getPref("defaultGallerySort"));
}

export function setDefaultGallerySortBy(mode: GallerySortBy): void {
  setPref("defaultGallerySort", mode);
  zoteroCache.invalidatePref(getPrefKey("defaultGallerySort"));
}

export function getGallerySortBy(viewKey: string | number): GallerySortBy {
  const map = getCachedPref(prefKey(), GallerySortByMapSchema) || {};
  const key = String(viewKey);
  if (!(key in map)) {
    return getDefaultGallerySortBy();
  }
  return coerceGallerySortBy(map[key]);
}

export function setGallerySortBy(
  viewKey: string | number,
  mode: GallerySortBy,
): void {
  const key = prefKey();
  const map = getCachedPref(key, GallerySortByMapSchema) || {};
  map[String(viewKey)] = mode;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function saveGallerySortByGlobally(
  viewKey: string | number,
  mode: GallerySortBy,
): void {
  setDefaultGallerySortBy(mode);
  setGallerySortBy(viewKey, mode);
}

export function useGallerySortBy(
  viewKey: string | number,
): [
  GallerySortBy,
  (mode: GallerySortBy) => void,
  GalleryGlobalSetting<GallerySortBy>,
] {
  const [mode, setMode] = useState<GallerySortBy>(() =>
    getGallerySortBy(viewKey),
  );
  const [globalValue, setGlobalValue] = useState<GallerySortBy>(() =>
    getDefaultGallerySortBy(),
  );

  useEffect(() => {
    const refresh = () => {
      setMode(getGallerySortBy(viewKey));
      setGlobalValue(getDefaultGallerySortBy());
    };
    refresh();
    const observerIDs = [
      Zotero.Prefs.registerObserver(prefKey(), refresh, true),
      Zotero.Prefs.registerObserver(
        getPrefKey("defaultGallerySort"),
        refresh,
        true,
      ),
    ];
    return () => {
      for (const observerID of observerIDs) {
        Zotero.Prefs.unregisterObserver(observerID);
      }
    };
  }, [viewKey]);

  const setSortBy = useCallback(
    (next: GallerySortBy) => {
      setMode(next);
      setGallerySortBy(viewKey, next);
    },
    [viewKey],
  );

  const saveGlobally = useCallback(() => {
    saveGallerySortByGlobally(viewKey, mode);
    setGlobalValue(mode);
  }, [mode, viewKey]);

  return [
    mode,
    setSortBy,
    { isCustom: mode !== globalValue, saveGlobally, globalValue },
  ];
}
