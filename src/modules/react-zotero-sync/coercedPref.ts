/**
 * Coerced plugin prefs mirrored through Jotai (Prefs observers → atom).
 */

import { useCallback } from "preact/hooks";
import { useAtomValue } from "jotai";
import { subscribePluginPref } from "../../utils/prefs";
import { atomFromExternal } from "./jotaiExternal";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

export function createCoercedPrefHooks<T>(
  prefKey: keyof PluginPrefsMap,
  read: () => T,
  write: (value: T) => void,
): () => [T, (value: T) => void] {
  const prefAtom = atomFromExternal({
    getSnapshot: read,
    subscribe: (onStoreChange) => subscribePluginPref(prefKey, onStoreChange),
  });

  return function useCoercedPref(): [T, (value: T) => void] {
    const value = useAtomValue(prefAtom);
    const setValue = useCallback((next: T) => {
      write(next);
    }, []);
    return [value, setValue];
  };
}
