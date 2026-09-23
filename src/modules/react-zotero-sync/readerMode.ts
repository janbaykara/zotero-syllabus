import { config } from "../../../package.json";
import { useBooleanPref } from "./booleanPref";
import {
  coerceBooleanPref,
  getViewPref,
  saveViewPrefGlobally,
  setViewPref,
  useViewPref,
  type ViewPrefGlobalSetting,
  type ViewPrefSpec,
} from "../../utils/viewPref";

const readerModeSpec: ViewPrefSpec<boolean> = {
  mapKey: `${config.prefsPrefix}.readerModes`,
  defaultKey: "readerMode",
  coerce: (value) => coerceBooleanPref(value, false),
};

export function getViewReaderMode(viewKey: string | number): boolean {
  return getViewPref(readerModeSpec, viewKey);
}

export function setViewReaderMode(
  viewKey: string | number,
  enabled: boolean,
): void {
  setViewPref(readerModeSpec, viewKey, enabled);
}

export function saveReaderModeGlobally(
  viewKey: string | number,
  enabled: boolean,
): void {
  saveViewPrefGlobally(readerModeSpec, viewKey, enabled);
}

export function useReaderMode(
  viewKey: string | number,
): [boolean, (enabled: boolean) => void, ViewPrefGlobalSetting<boolean>] {
  return useViewPref(readerModeSpec, viewKey);
}

/** Default-only (prefs pane / surfaces without a view key). */
export function useZoteroReaderMode() {
  return useBooleanPref("readerMode");
}
