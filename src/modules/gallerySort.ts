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
] as const;

export type GallerySortBy = (typeof GALLERY_SORT_MODES)[number];

const GallerySortBySchema = z.enum(GALLERY_SORT_MODES);

export function coerceGallerySortBy(value: unknown): GallerySortBy {
  const parsed = GallerySortBySchema.safeParse(value);
  return parsed.success ? parsed.data : "auto";
}

const gallerySortSpec: ViewPrefSpec<GallerySortBy> = {
  mapKey: `${config.prefsPrefix}.gallerySort`,
  defaultKey: "defaultGallerySort",
  coerce: coerceGallerySortBy,
};

export function getDefaultGallerySortBy(): GallerySortBy {
  return getViewPrefDefault(gallerySortSpec);
}

export function setDefaultGallerySortBy(mode: GallerySortBy): void {
  setViewPrefDefault(gallerySortSpec, mode);
}

export function getGallerySortBy(viewKey: string | number): GallerySortBy {
  return getViewPref(gallerySortSpec, viewKey);
}

export function setGallerySortBy(
  viewKey: string | number,
  mode: GallerySortBy,
): void {
  setViewPref(gallerySortSpec, viewKey, mode);
}

export function saveGallerySortByGlobally(
  viewKey: string | number,
  mode: GallerySortBy,
): void {
  saveViewPrefGlobally(gallerySortSpec, viewKey, mode);
}

export function useGallerySortBy(
  viewKey: string | number,
): [
  GallerySortBy,
  (mode: GallerySortBy) => void,
  ViewPrefGlobalSetting<GallerySortBy>,
] {
  return useViewPref(gallerySortSpec, viewKey);
}
