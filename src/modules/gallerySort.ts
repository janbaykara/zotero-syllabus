import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";

export const GALLERY_SORT_MODES = ["auto", "title", "date"] as const;

export type GallerySortBy = (typeof GALLERY_SORT_MODES)[number];

const GallerySortBySchema = z.enum(GALLERY_SORT_MODES);
const GallerySortByMapSchema = z.record(z.string(), z.unknown());

function prefKey() {
  return `${config.prefsPrefix}.gallerySort`;
}

function coerceGallerySortBy(value: unknown): GallerySortBy {
  const parsed = GallerySortBySchema.safeParse(value);
  return parsed.success ? parsed.data : "auto";
}

export function getGallerySortBy(viewKey: string | number): GallerySortBy {
  const map = getCachedPref(prefKey(), GallerySortByMapSchema) || {};
  return coerceGallerySortBy(map[String(viewKey)]);
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

export function useGallerySortBy(
  viewKey: string | number,
): [GallerySortBy, (mode: GallerySortBy) => void] {
  const [mode, setMode] = useState<GallerySortBy>(() =>
    getGallerySortBy(viewKey),
  );

  useEffect(() => {
    setMode(getGallerySortBy(viewKey));
  }, [viewKey]);

  const setSortBy = useCallback(
    (next: GallerySortBy) => {
      setMode(next);
      setGallerySortBy(viewKey, next);
    },
    [viewKey],
  );

  return [mode, setSortBy];
}
