import { useCallback } from "preact/hooks";
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

export const GALLERY_GROUP_BY_MODES = [
  "none",
  "auto",
  "type",
  "creator",
  "tags",
  "subcollections",
  "classes",
] as const;

export type GalleryGroupBy = (typeof GALLERY_GROUP_BY_MODES)[number];

export type GalleryGroupByAllow = {
  classes?: boolean;
  subcollections?: boolean;
  magazine?: boolean;
};

const GalleryGroupBySchema = z.enum(GALLERY_GROUP_BY_MODES);

export function coerceGalleryGroupBy(value: unknown): GalleryGroupBy {
  const parsed = GalleryGroupBySchema.safeParse(value);
  return parsed.success ? parsed.data : "none";
}

const galleryGroupBySpec: ViewPrefSpec<GalleryGroupBy> = {
  mapKey: `${config.prefsPrefix}.galleryGroupBy`,
  defaultKey: "defaultGalleryGroupBy",
  coerce: coerceGalleryGroupBy,
};

export function getDefaultGalleryGroupBy(): GalleryGroupBy {
  return getViewPrefDefault(galleryGroupBySpec);
}

export function setDefaultGalleryGroupBy(mode: GalleryGroupBy): void {
  setViewPrefDefault(galleryGroupBySpec, mode);
}

export function getGalleryGroupBy(viewKey: string | number): GalleryGroupBy {
  return getViewPref(galleryGroupBySpec, viewKey);
}

export function setGalleryGroupBy(
  viewKey: string | number,
  mode: GalleryGroupBy,
): void {
  setViewPref(galleryGroupBySpec, viewKey, mode);
}

export function saveGalleryGroupByGlobally(
  viewKey: string | number,
  mode: GalleryGroupBy,
): void {
  saveViewPrefGlobally(galleryGroupBySpec, viewKey, mode);
}

export function resolveGalleryGroupBy(
  mode: GalleryGroupBy,
  allow: GalleryGroupByAllow,
): GalleryGroupBy {
  if (mode === "auto" && !allow.magazine) {
    return "none";
  }
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
  allow: GalleryGroupByAllow = {},
): [
  GalleryGroupBy,
  (mode: GalleryGroupBy) => void,
  ViewPrefGlobalSetting<GalleryGroupBy>,
] {
  const allowClasses = !!allow.classes;
  const allowSubcollections = allow.subcollections !== false;
  const allowMagazine = !!allow.magazine;
  const [mode, setMode, global] = useViewPref(galleryGroupBySpec, viewKey);
  const allowOpts = {
    classes: allowClasses,
    subcollections: allowSubcollections,
    magazine: allowMagazine,
  };
  const resolved = resolveGalleryGroupBy(mode, allowOpts);
  const resolvedGlobal = resolveGalleryGroupBy(global.globalValue, allowOpts);

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

  const saveGlobally = useCallback(() => {
    saveGalleryGroupByGlobally(viewKey, resolved);
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
