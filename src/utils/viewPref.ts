import { useCallback } from "preact/hooks";
import { useAtomValue } from "jotai";
import * as z from "zod";
import { getCachedPref, zoteroCache } from "./cache";
import { getPref, getPrefKey, setPref, subscribePrefs } from "./prefs";
import { atomFamilyFromExternal } from "../modules/react-zotero-sync/jotaiExternal";

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
  zoteroCache.invalidatePref(mapKey);
  Zotero.Prefs.set(mapKey, JSON.stringify(map), true);
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

/** Specs registered by useViewPref so shared atoms can coerce without closing over hooks. */
const registeredSpecs = new Map<string, ViewPrefSpec<unknown>>();

function specRegistryId(spec: ViewPrefSpec<unknown>): string {
  return `${spec.mapKey}\0${String(spec.defaultKey)}`;
}

type ViewPrefAtomParam = {
  registryId: string;
  viewKey: string;
  /** JSON of unsetDefault, or empty if undefined */
  unsetJson: string;
};

type DefaultPrefAtomParam = {
  registryId: string;
};

function subscribeViewPrefKeys(
  mapKey: string,
  defaultKey: keyof PluginPrefsMap,
  onStoreChange: () => void,
): () => void {
  return subscribePrefs([mapKey, getPrefKey(defaultKey)], onStoreChange);
}

const viewPrefValueAtomFamily = atomFamilyFromExternal(
  (param: ViewPrefAtomParam) => {
    const spec = registeredSpecs.get(param.registryId);
    return {
      getSnapshot: () => {
        const live = registeredSpecs.get(param.registryId) || spec;
        if (!live) {
          return null;
        }
        const unsetDefault =
          param.unsetJson === ""
            ? undefined
            : (JSON.parse(param.unsetJson) as unknown);
        return getViewPref(live, param.viewKey, unsetDefault);
      },
      subscribe: (onStoreChange) => {
        const live = registeredSpecs.get(param.registryId) || spec;
        if (!live) {
          return () => {};
        }
        return subscribeViewPrefKeys(
          live.mapKey,
          live.defaultKey,
          onStoreChange,
        );
      },
    };
  },
  (a, b) =>
    a.registryId === b.registryId &&
    a.viewKey === b.viewKey &&
    a.unsetJson === b.unsetJson,
);

const viewPrefDefaultAtomFamily = atomFamilyFromExternal(
  (param: DefaultPrefAtomParam) => {
    const spec = registeredSpecs.get(param.registryId);
    return {
      getSnapshot: () => {
        const live = registeredSpecs.get(param.registryId) || spec;
        if (!live) {
          return null;
        }
        return getViewPrefDefault(live);
      },
      subscribe: (onStoreChange) => {
        const live = registeredSpecs.get(param.registryId) || spec;
        if (!live) {
          return () => {};
        }
        return subscribeViewPrefKeys(
          live.mapKey,
          live.defaultKey,
          onStoreChange,
        );
      },
    };
  },
  (a, b) => a.registryId === b.registryId,
);

export function useViewPref<T>(
  spec: ViewPrefSpec<T>,
  viewKey: string | number,
  unsetDefault?: T,
): [T, (next: T) => void, ViewPrefGlobalSetting<T>] {
  const registryId = specRegistryId(spec as ViewPrefSpec<unknown>);
  registeredSpecs.set(registryId, spec as ViewPrefSpec<unknown>);

  const unsetJson =
    unsetDefault === undefined ? "" : JSON.stringify(unsetDefault);

  const value = useAtomValue(
    viewPrefValueAtomFamily({
      registryId,
      viewKey: String(viewKey),
      unsetJson,
    }),
  ) as T;

  const globalValue = useAtomValue(
    viewPrefDefaultAtomFamily({ registryId }),
  ) as T;

  const setPrefValue = useCallback(
    (next: T) => {
      setViewPref(spec, viewKey, next);
    },
    [spec, viewKey],
  );

  const saveGlobally = useCallback(() => {
    saveViewPrefGlobally(spec, viewKey, value);
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
