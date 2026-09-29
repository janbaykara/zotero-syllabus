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

const showClassNotesSpec: ViewPrefSpec<boolean> = {
  mapKey: `${config.prefsPrefix}.showClassNotes`,
  defaultKey: "syllabusShowClassNotes",
  coerce: (value) => coerceBooleanPref(value, true),
};

export function getShowClassNotes(viewKey: string | number): boolean {
  return getViewPref(showClassNotesSpec, viewKey);
}

export function setShowClassNotes(
  viewKey: string | number,
  show: boolean,
): void {
  setViewPref(showClassNotesSpec, viewKey, show);
}

export function saveShowClassNotesGlobally(
  viewKey: string | number,
  show: boolean,
): void {
  saveViewPrefGlobally(showClassNotesSpec, viewKey, show);
}

export function useShowClassNotes(
  viewKey: string | number,
): [boolean, (show: boolean) => void, ViewPrefGlobalSetting<boolean>] {
  return useViewPref(showClassNotesSpec, viewKey);
}
