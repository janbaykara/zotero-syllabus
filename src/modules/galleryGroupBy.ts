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

export function getGalleryGroupBy(viewKey: string | number): GalleryGroupBy {
  const map = getCachedPref(prefKey(), GalleryGroupByMapSchema) || {};
  return coerceGalleryGroupBy(map[String(viewKey)]);
}

export function setGalleryGroupBy(
  viewKey: string | number,
  mode: GalleryGroupBy,
): void {
  const key = prefKey();
  const map = getCachedPref(key, GalleryGroupByMapSchema) || {};
  map[String(viewKey)] = mode;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

function resolveGalleryGroupBy(
  mode: GalleryGroupBy,
  allow: { classes?: boolean; subcollections?: boolean },
): GalleryGroupBy {
  if (mode === "classes" && !allow.classes) {
    return "none";
  }
  if (mode === "subcollections" && allow.subcollections === false) {
    return "none";
  }
  return mode;
}

export function useGalleryGroupBy(
  viewKey: string | number,
  allow: { classes?: boolean; subcollections?: boolean } = {},
): [GalleryGroupBy, (mode: GalleryGroupBy) => void] {
  const allowClasses = !!allow.classes;
  const allowSubcollections = allow.subcollections !== false;
  const [mode, setMode] = useState<GalleryGroupBy>(() =>
    getGalleryGroupBy(viewKey),
  );

  useEffect(() => {
    setMode(getGalleryGroupBy(viewKey));
  }, [viewKey]);

  const resolved = resolveGalleryGroupBy(mode, {
    classes: allowClasses,
    subcollections: allowSubcollections,
  });

  const setGroupBy = useCallback(
    (next: GalleryGroupBy) => {
      const allowed = resolveGalleryGroupBy(next, {
        classes: allowClasses,
        subcollections: allowSubcollections,
      });
      setMode(allowed);
      setGalleryGroupBy(viewKey, allowed);
    },
    [allowClasses, allowSubcollections, viewKey],
  );

  return [resolved, setGroupBy];
}
