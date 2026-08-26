import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";

export const GALLERY_GROUP_BY_MODES = [
  "none",
  "type",
  "tags",
  "subcollections",
  "classes",
] as const;

export type GalleryGroupBy = (typeof GALLERY_GROUP_BY_MODES)[number];

const GalleryGroupBySchema = z.enum(GALLERY_GROUP_BY_MODES);
const GalleryGroupByMapSchema = z.record(z.string(), z.unknown());

function prefKey() {
  return `${config.prefsPrefix}.galleryGroupBy`;
}

function coerceGalleryGroupBy(value: unknown): GalleryGroupBy {
  const parsed = GalleryGroupBySchema.safeParse(value);
  return parsed.success ? parsed.data : "none";
}

export function getGalleryGroupBy(collectionId: number): GalleryGroupBy {
  const map = getCachedPref(prefKey(), GalleryGroupByMapSchema) || {};
  return coerceGalleryGroupBy(map[String(collectionId)]);
}

export function setGalleryGroupBy(
  collectionId: number,
  mode: GalleryGroupBy,
): void {
  const key = prefKey();
  const map = getCachedPref(key, GalleryGroupByMapSchema) || {};
  map[String(collectionId)] = mode;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function useGalleryGroupBy(
  collectionId: number,
  allowClasses: boolean,
): [GalleryGroupBy, (mode: GalleryGroupBy) => void] {
  const [mode, setMode] = useState<GalleryGroupBy>(() =>
    getGalleryGroupBy(collectionId),
  );

  useEffect(() => {
    setMode(getGalleryGroupBy(collectionId));
  }, [collectionId]);

  const resolved: GalleryGroupBy =
    mode === "classes" && !allowClasses ? "none" : mode;

  const setGroupBy = useCallback(
    (next: GalleryGroupBy) => {
      const allowed = next === "classes" && !allowClasses ? "none" : next;
      setMode(allowed);
      setGalleryGroupBy(collectionId, allowed);
    },
    [allowClasses, collectionId],
  );

  return [resolved, setGroupBy];
}
