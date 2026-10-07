import { useCallback } from "preact/hooks";
import { useAtomValue } from "jotai";
import {
  getPrefValue,
  setPref,
  subscribePluginPref,
} from "../../utils/prefs";
import { atomFamilyFromExternal } from "./jotaiExternal";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

export type BooleanPrefKey = {
  [K in keyof PluginPrefsMap]: PluginPrefsMap[K] extends boolean ? K : never;
}[keyof PluginPrefsMap];

export const booleanPrefAtomFamily = atomFamilyFromExternal(
  (key: BooleanPrefKey) => ({
    getSnapshot: () => String(getPrefValue(key)),
    subscribe: (onStoreChange: () => void) =>
      subscribePluginPref(key, onStoreChange),
  }),
);

export function useBooleanPref(key: BooleanPrefKey) {
  const raw = useAtomValue(booleanPrefAtomFamily(key));
  const value = raw === "true";

  const setValue = useCallback(
    (next: boolean) => {
      setPref(key, next);
    },
    [key],
  );

  return [value, setValue] as const;
}
