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
import * as z from "zod";
import { getCachedPref, zoteroCache } from "../../utils/cache";

const readerModeSpec: ViewPrefSpec<boolean> = {
  mapKey: `${config.prefsPrefix}.readerModes`,
  defaultKey: "readerMode",
  coerce: (value) => coerceBooleanPref(value, false),
};

const ViewPrefMapSchema = z.record(z.string(), z.unknown());

/**
 * Copy legacy `syllabus:{id}` readerModes entries onto collection-id keys so
 * Syllabus and Gallery share one “Show checkboxes” setting per collection.
 */
export function migrateLegacyReaderModePrefs(): void {
  const map =
    getCachedPref(readerModeSpec.mapKey, ViewPrefMapSchema) || {};
  let changed = false;
  const next: Record<string, unknown> = { ...map };
  for (const [key, value] of Object.entries(map)) {
    const match = /^syllabus:(\d+)$/.exec(key);
    if (!match) {
      continue;
    }
    const collectionKey = match[1];
    if (!(collectionKey in next)) {
      next[collectionKey] = value;
      changed = true;
    }
  }
  if (!changed) {
    return;
  }
  zoteroCache.invalidatePref(readerModeSpec.mapKey);
  Zotero.Prefs.set(readerModeSpec.mapKey, JSON.stringify(next), true);
}

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
