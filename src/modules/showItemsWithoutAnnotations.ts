import { config } from "../../package.json";
import {
  coerceBooleanPref,
  getViewPref,
  saveViewPrefGlobally,
  setViewPref,
  useViewPref,
  type ViewPrefGlobalSetting,
  type ViewPrefSpec,
} from "../utils/viewPref";

const showEmptySpec: ViewPrefSpec<boolean> = {
  mapKey: `${config.prefsPrefix}.showItemsWithoutAnnotations`,
  defaultKey: "galleryShowItemsWithoutAnnotations",
  coerce: (value) => coerceBooleanPref(value, true),
};

export function getShowItemsWithoutAnnotations(
  viewKey: string | number,
): boolean {
  return getViewPref(showEmptySpec, viewKey);
}

export function setShowItemsWithoutAnnotations(
  viewKey: string | number,
  show: boolean,
): void {
  setViewPref(showEmptySpec, viewKey, show);
}

export function saveShowItemsWithoutAnnotationsGlobally(
  viewKey: string | number,
  show: boolean,
): void {
  saveViewPrefGlobally(showEmptySpec, viewKey, show);
}

export function useShowItemsWithoutAnnotations(
  viewKey: string | number,
): [boolean, (show: boolean) => void, ViewPrefGlobalSetting<boolean>] {
  return useViewPref(showEmptySpec, viewKey);
}
