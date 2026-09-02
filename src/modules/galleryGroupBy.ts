import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";
import { getPref, getPrefKey, setPref } from "../utils/prefs";
import type { GalleryGlobalSetting } from "./galleryLayout";

export const GALLERY_GROUP_BY_MODES = [
  "none",
  "type",
  "creator",
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

export function coerceGalleryGroupBy(value: unknown): GalleryGroupBy {
  const parsed = GalleryGroupBySchema.safeParse(value);
  return parsed.success ? parsed.data : "none";
}

export function getDefaultGalleryGroupBy(): GalleryGroupBy {
  return coerceGalleryGroupBy(getPref("defaultGalleryGroupBy"));
}

export function setDefaultGalleryGroupBy(mode: GalleryGroupBy): void {
  setPref("defaultGalleryGroupBy", mode);
  zoteroCache.invalidatePref(getPrefKey("defaultGalleryGroupBy"));
}

export function getGalleryGroupBy(viewKey: string | number): GalleryGroupBy {
  const map = getCachedPref(prefKey(), GalleryGroupByMapSchema) || {};
  const key = String(viewKey);
  if (!(key in map)) {
    return getDefaultGalleryGroupBy();
  }
  return coerceGalleryGroupBy(map[key]);
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

export function saveGalleryGroupByGlobally(
  viewKey: string | number,
  mode: GalleryGroupBy,
): void {
  setDefaultGalleryGroupBy(mode);
  setGalleryGroupBy(viewKey, mode);
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
): [
  GalleryGroupBy,
  (mode: GalleryGroupBy) => void,
  GalleryGlobalSetting<GalleryGroupBy>,
] {
  const allowClasses = !!allow.classes;
  const allowSubcollections = allow.subcollections !== false;
  const [mode, setMode] = useState<GalleryGroupBy>(() =>
    getGalleryGroupBy(viewKey),
  );
  const [globalValue, setGlobalValue] = useState<GalleryGroupBy>(() =>
    getDefaultGalleryGroupBy(),
  );

  useEffect(() => {
    const refresh = () => {
      setMode(getGalleryGroupBy(viewKey));
      setGlobalValue(getDefaultGalleryGroupBy());
    };
    refresh();
    const observerIDs = [
      Zotero.Prefs.registerObserver(prefKey(), refresh, true),
      Zotero.Prefs.registerObserver(
        getPrefKey("defaultGalleryGroupBy"),
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

  const allowOpts = {
    classes: allowClasses,
    subcollections: allowSubcollections,
  };
  const resolved = resolveGalleryGroupBy(mode, allowOpts);
  const resolvedGlobal = resolveGalleryGroupBy(globalValue, allowOpts);

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

  const saveGlobally = useCallback(() => {
    saveGalleryGroupByGlobally(viewKey, resolved);
    setGlobalValue(resolved);
  }, [resolved, viewKey]);

  return [
    resolved,
    setGroupBy,
    {
      isCustom: resolved !== resolvedGlobal,
      saveGlobally,
      globalValue: resolvedGlobal,
    },
  ];
}
