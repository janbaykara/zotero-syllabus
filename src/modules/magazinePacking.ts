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

/** Gallery / Reading Schedule Magazine packing (not Home shelves). */
export const MAGAZINE_PACKINGS = ["vertical", "grid", "packed"] as const;

export type MagazinePacking = (typeof MAGAZINE_PACKINGS)[number];

const MagazinePackingSchema = z.enum(MAGAZINE_PACKINGS);

export function coerceMagazinePacking(value: unknown): MagazinePacking {
  const parsed = MagazinePackingSchema.safeParse(value);
  return parsed.success ? parsed.data : "packed";
}

const magazinePackingSpec: ViewPrefSpec<MagazinePacking> = {
  mapKey: `${config.prefsPrefix}.galleryPacking`,
  defaultKey: "magazinePacking",
  coerce: coerceMagazinePacking,
};

export function getDefaultMagazinePacking(): MagazinePacking {
  return getViewPrefDefault(magazinePackingSpec);
}

export function setDefaultMagazinePacking(packing: MagazinePacking): void {
  setViewPrefDefault(magazinePackingSpec, packing);
}

export function getMagazinePacking(viewKey: string | number): MagazinePacking {
  return getViewPref(magazinePackingSpec, viewKey);
}

export function setMagazinePacking(
  viewKey: string | number,
  packing: MagazinePacking,
): void {
  setViewPref(magazinePackingSpec, viewKey, packing);
}

export function saveMagazinePackingGlobally(
  viewKey: string | number,
  packing: MagazinePacking,
): void {
  saveViewPrefGlobally(magazinePackingSpec, viewKey, packing);
}

export function useMagazinePacking(
  viewKey: string | number,
): [
  MagazinePacking,
  (packing: MagazinePacking) => void,
  ViewPrefGlobalSetting<MagazinePacking>,
] {
  return useViewPref(magazinePackingSpec, viewKey);
}
