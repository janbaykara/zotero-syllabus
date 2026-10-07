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

const includeAutomaticTagsSpec: ViewPrefSpec<boolean> = {
  mapKey: `${config.prefsPrefix}.includeAutomaticTags`,
  defaultKey: "galleryIncludeAutomaticTags",
  coerce: (value) => coerceBooleanPref(value, false),
};

export function getIncludeAutomaticTags(viewKey: string | number): boolean {
  return getViewPref(includeAutomaticTagsSpec, viewKey);
}

export function setIncludeAutomaticTags(
  viewKey: string | number,
  include: boolean,
): void {
  setViewPref(includeAutomaticTagsSpec, viewKey, include);
}

export function saveIncludeAutomaticTagsGlobally(
  viewKey: string | number,
  include: boolean,
): void {
  saveViewPrefGlobally(includeAutomaticTagsSpec, viewKey, include);
}

export function useIncludeAutomaticTags(
  viewKey: string | number,
): [boolean, (include: boolean) => void, ViewPrefGlobalSetting<boolean>] {
  return useViewPref(includeAutomaticTagsSpec, viewKey);
}
