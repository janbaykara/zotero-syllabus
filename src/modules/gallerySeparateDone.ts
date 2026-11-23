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

const gallerySeparateDoneSpec: ViewPrefSpec<boolean> = {
  mapKey: `${config.prefsPrefix}.gallerySeparateDone`,
  defaultKey: "defaultGallerySeparateDone",
  coerce: (value) => coerceBooleanPref(value, true),
};

export function getGallerySeparateDone(viewKey: string | number): boolean {
  return getViewPref(gallerySeparateDoneSpec, viewKey);
}

export function setGallerySeparateDone(
  viewKey: string | number,
  separate: boolean,
): void {
  setViewPref(gallerySeparateDoneSpec, viewKey, separate);
}

export function saveGallerySeparateDoneGlobally(
  viewKey: string | number,
  separate: boolean,
): void {
  saveViewPrefGlobally(gallerySeparateDoneSpec, viewKey, separate);
}

export function useGallerySeparateDone(
  viewKey: string | number,
): [boolean, (separate: boolean) => void, ViewPrefGlobalSetting<boolean>] {
  return useViewPref(gallerySeparateDoneSpec, viewKey);
}
