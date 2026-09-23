import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { getCachedPref, zoteroCache } from "./cache";
import { getPref, getPrefKey, setPref } from "./prefs";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

const ViewPrefMapSchema = z.record(z.string(), z.unknown());

export type ViewPrefGlobalSetting<T> = {
  isCustom: boolean;
  saveGlobally: () => void;
  globalValue: T;
};

/** @deprecated Use ViewPrefGlobalSetting */
export type GalleryGlobalSetting<T> = ViewPrefGlobalSetting<T>;

export type ViewPrefSpec<T> = {
  /** Full pref key for the JSON map (`extensions.zotero.syllabus.galleryLayout`). */
  mapKey: string;
  /** Scalar default under the plugin prefix. */
  defaultKey: keyof PluginPrefsMap;
  coerce: (value: unknown) => T;
  serialize?: (value: T) => unknown;
  equal?: (a: T, b: T) => boolean;
  /** When false, a missing map entry uses `coerce(undefined)` instead of the default. */
  inheritDefault?: (viewKey: string) => boolean;
};

function readMap(mapKey: string): Record<string, unknown> {
  return getCachedPref(mapKey, ViewPrefMapSchema) || {};
}

function writeMap(mapKey: string, map: Record<string, unknown>): void {
  Zotero.Prefs.set(mapKey, JSON.stringify(map), true);
  zoteroCache.invalidatePref(mapKey);
}

function valuesEqual<T>(spec: ViewPrefSpec<T>, a: T, b: T): boolean {
  if (spec.equal) {
    return spec.equal(a, b);
  }
  return a === b;
}

export function getViewPrefDefault<T>(spec: ViewPrefSpec<T>): T {
  return spec.coerce(getPref(spec.defaultKey));
}

export function setViewPrefDefault<T>(spec: ViewPrefSpec<T>, value: T): void {
  const stored = spec.serialize ? spec.serialize(value) : value;
  setPref(spec.defaultKey, stored as PluginPrefsMap[typeof spec.defaultKey]);
  zoteroCache.invalidatePref(getPrefKey(spec.defaultKey));
}

export function getViewPref<T>(
  spec: ViewPrefSpec<T>,
  viewKey: string | number,
  unsetDefault?: T,
): T {
  const map = readMap(spec.mapKey);
  const key = String(viewKey);
  if (key in map) {
    return spec.coerce(map[key]);
  }
  if (unsetDefault !== undefined) {
    return unsetDefault;
  }
  if (spec.inheritDefault && !spec.inheritDefault(key)) {
    return spec.coerce(undefined);
  }
  return getViewPrefDefault(spec);
}

export function setViewPref<T>(
  spec: ViewPrefSpec<T>,
  viewKey: string | number,
  value: T,
): void {
  const key = String(viewKey);
  if (!key) {
    return;
  }
  const map = { ...readMap(spec.mapKey) };
  map[key] = spec.serialize ? spec.serialize(value) : value;
  writeMap(spec.mapKey, map);
}

export function saveViewPrefGlobally<T>(
  spec: ViewPrefSpec<T>,
  viewKey: string | number,
  value: T,
): void {
  setViewPrefDefault(spec, value);
  setViewPref(spec, viewKey, value);
}

export function useViewPref<T>(
  spec: ViewPrefSpec<T>,
  viewKey: string | number,
  unsetDefault?: T,
): [T, (next: T) => void, ViewPrefGlobalSetting<T>] {
  const [value, setValue] = useState<T>(() =>
    getViewPref(spec, viewKey, unsetDefault),
  );
  const [globalValue, setGlobalValue] = useState<T>(() =>
    getViewPrefDefault(spec),
  );

  useEffect(() => {
    const refresh = () => {
      setValue(getViewPref(spec, viewKey, unsetDefault));
      setGlobalValue(getViewPrefDefault(spec));
    };
    refresh();
    const observerIDs = [
      Zotero.Prefs.registerObserver(spec.mapKey, refresh, true),
      Zotero.Prefs.registerObserver(getPrefKey(spec.defaultKey), refresh, true),
    ];
    return () => {
      for (const observerID of observerIDs) {
        Zotero.Prefs.unregisterObserver(observerID);
      }
    };
  }, [spec.mapKey, spec.defaultKey, viewKey, unsetDefault]);

  const setPrefValue = useCallback(
    (next: T) => {
      setValue(next);
      setViewPref(spec, viewKey, next);
    },
    [spec, viewKey],
  );

  const saveGlobally = useCallback(() => {
    saveViewPrefGlobally(spec, viewKey, value);
    setGlobalValue(value);
  }, [spec, viewKey, value]);

  return [
    value,
    setPrefValue,
    {
      isCustom: !valuesEqual(spec, value, globalValue),
      saveGlobally,
      globalValue,
    },
  ];
}

export function coerceBooleanPref(value: unknown, fallback = false): boolean {
  if (value === true || value === "true") {
    return true;
  }
  if (value === false || value === "false") {
    return false;
  }
  return fallback;
}
