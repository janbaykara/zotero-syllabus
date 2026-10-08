import { useCallback, useMemo } from "preact/hooks";
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

export const GALLERY_SORT_MODES = [
  "auto",
  "lastRead",
  "title",
  "date",
  "dateAdded",
  "personalOrder",
] as const;

export type GallerySortBy = (typeof GALLERY_SORT_MODES)[number];

const GallerySortBySchema = z.enum(GALLERY_SORT_MODES);

export function coerceGallerySortBy(value: unknown): GallerySortBy {
  const parsed = GallerySortBySchema.safeParse(value);
  return parsed.success ? parsed.data : "title";
}

/**
 * Gallery no longer offers Auto (Explorer shelves still may). Legacy stored
 * `auto` resolves to A–Z.
 */
export function resolveGallerySortBy(mode: GallerySortBy): GallerySortBy {
  return mode === "auto" ? "title" : mode;
}

const gallerySortSpec: ViewPrefSpec<GallerySortBy> = {
  mapKey: `${config.prefsPrefix}.gallerySort`,
  defaultKey: "defaultGallerySort",
  coerce: coerceGallerySortBy,
};

export function getDefaultGallerySortBy(): GallerySortBy {
  return resolveGallerySortBy(getViewPrefDefault(gallerySortSpec));
}

export function setDefaultGallerySortBy(mode: GallerySortBy): void {
  setViewPrefDefault(gallerySortSpec, resolveGallerySortBy(mode));
}

export function getGallerySortBy(viewKey: string | number): GallerySortBy {
  return resolveGallerySortBy(getViewPref(gallerySortSpec, viewKey));
}

export function setGallerySortBy(
  viewKey: string | number,
  mode: GallerySortBy,
): void {
  setViewPref(gallerySortSpec, viewKey, resolveGallerySortBy(mode));
}

export function saveGallerySortByGlobally(
  viewKey: string | number,
  mode: GallerySortBy,
): void {
  saveViewPrefGlobally(gallerySortSpec, viewKey, resolveGallerySortBy(mode));
}

export function useGallerySortBy(
  viewKey: string | number,
): [
  GallerySortBy,
  (mode: GallerySortBy) => void,
  ViewPrefGlobalSetting<GallerySortBy>,
] {
  const [mode, setMode, global] = useViewPref(gallerySortSpec, viewKey);
  const resolved = resolveGallerySortBy(mode);
  const resolvedGlobal = resolveGallerySortBy(global.globalValue);
  const setResolved = useCallback(
    (next: GallerySortBy) => {
      setMode(resolveGallerySortBy(next));
    },
    [setMode],
  );
  const saveGlobally = useCallback(() => {
    saveGallerySortByGlobally(viewKey, resolved);
  }, [resolved, viewKey]);
  const setting = useMemo(
    (): ViewPrefGlobalSetting<GallerySortBy> => ({
      isCustom: resolved !== resolvedGlobal,
      saveGlobally,
      globalValue: resolvedGlobal,
    }),
    [resolved, resolvedGlobal, saveGlobally],
  );
  return [resolved, setResolved, setting];
}
