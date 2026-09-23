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

export const MAGAZINE_TYPE_SIZES = ["small", "large"] as const;

export type MagazineTypeSize = (typeof MAGAZINE_TYPE_SIZES)[number];

const MagazineTypeSizeSchema = z.enum(MAGAZINE_TYPE_SIZES);

export function coerceMagazineTypeSize(value: unknown): MagazineTypeSize {
  const parsed = MagazineTypeSizeSchema.safeParse(value);
  return parsed.success ? parsed.data : "small";
}

const magazineTypeSizeSpec: ViewPrefSpec<MagazineTypeSize> = {
  mapKey: `${config.prefsPrefix}.galleryTypeSize`,
  defaultKey: "magazineTypeSize",
  coerce: coerceMagazineTypeSize,
};

export function getDefaultMagazineTypeSize(): MagazineTypeSize {
  return getViewPrefDefault(magazineTypeSizeSpec);
}

export function setDefaultMagazineTypeSize(size: MagazineTypeSize): void {
  setViewPrefDefault(magazineTypeSizeSpec, size);
}

export function getMagazineTypeSize(
  viewKey: string | number,
): MagazineTypeSize {
  return getViewPref(magazineTypeSizeSpec, viewKey);
}

export function setMagazineTypeSize(
  viewKey: string | number,
  size: MagazineTypeSize,
): void {
  setViewPref(magazineTypeSizeSpec, viewKey, size);
}

export function saveMagazineTypeSizeGlobally(
  viewKey: string | number,
  size: MagazineTypeSize,
): void {
  saveViewPrefGlobally(magazineTypeSizeSpec, viewKey, size);
}

export function useMagazineTypeSize(
  viewKey: string | number,
): [
  MagazineTypeSize,
  (size: MagazineTypeSize) => void,
  ViewPrefGlobalSetting<MagazineTypeSize>,
] {
  return useViewPref(magazineTypeSizeSpec, viewKey);
}
