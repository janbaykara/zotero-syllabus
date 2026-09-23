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

export const FURTHER_READING_SORT_MODES = ["title", "creator", "date"] as const;

export type FurtherReadingSortBy = (typeof FURTHER_READING_SORT_MODES)[number];

const FurtherReadingSortBySchema = z.enum(FURTHER_READING_SORT_MODES);

export function coerceFurtherReadingSortBy(
  value: unknown,
): FurtherReadingSortBy {
  const parsed = FurtherReadingSortBySchema.safeParse(value);
  return parsed.success ? parsed.data : "title";
}

const furtherReadingSortSpec: ViewPrefSpec<FurtherReadingSortBy> = {
  mapKey: `${config.prefsPrefix}.furtherReadingSort`,
  defaultKey: "defaultFurtherReadingSort",
  coerce: coerceFurtherReadingSortBy,
};

export function getDefaultFurtherReadingSortBy(): FurtherReadingSortBy {
  return getViewPrefDefault(furtherReadingSortSpec);
}

export function setDefaultFurtherReadingSortBy(
  mode: FurtherReadingSortBy,
): void {
  setViewPrefDefault(furtherReadingSortSpec, mode);
}

export function getFurtherReadingSortBy(
  collectionId: number,
): FurtherReadingSortBy {
  return getViewPref(furtherReadingSortSpec, collectionId);
}

export function setFurtherReadingSortBy(
  collectionId: number,
  mode: FurtherReadingSortBy,
): void {
  setViewPref(furtherReadingSortSpec, collectionId, mode);
}

export function saveFurtherReadingSortByGlobally(
  collectionId: number,
  mode: FurtherReadingSortBy,
): void {
  saveViewPrefGlobally(furtherReadingSortSpec, collectionId, mode);
}

export function useFurtherReadingSortBy(
  collectionId: number,
): [
  FurtherReadingSortBy,
  (mode: FurtherReadingSortBy) => void,
  ViewPrefGlobalSetting<FurtherReadingSortBy>,
] {
  return useViewPref(furtherReadingSortSpec, collectionId);
}
