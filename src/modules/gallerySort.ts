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

export function getGallerySortBy(collectionId: number): GallerySortBy {
  const map = getCachedPref(prefKey(), GallerySortByMapSchema) || {};
  return coerceGallerySortBy(map[String(collectionId)]);
}

export function setGallerySortBy(
  collectionId: number,
  mode: GallerySortBy,
): void {
  const key = prefKey();
  const map = getCachedPref(key, GallerySortByMapSchema) || {};
  map[String(collectionId)] = mode;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function useGallerySortBy(
  collectionId: number,
): [GallerySortBy, (mode: GallerySortBy) => void] {
  const [mode, setMode] = useState<GallerySortBy>(() =>
    getGallerySortBy(collectionId),
  );

  useEffect(() => {
    setMode(getGallerySortBy(collectionId));
  }, [collectionId]);

  const setSortBy = useCallback(
    (next: GallerySortBy) => {
      setMode(next);
      setGallerySortBy(collectionId, next);
    },
    [collectionId],
  );

  return [mode, setSortBy];
}
