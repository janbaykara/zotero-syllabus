import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getPrefKey, getPrefValue, setPref } from "../../utils/prefs";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

export type BooleanPrefKey = {
  [K in keyof PluginPrefsMap]: PluginPrefsMap[K] extends boolean ? K : never;
}[keyof PluginPrefsMap];

export function createBooleanPrefStore(key: BooleanPrefKey) {
  const prefKey = getPrefKey(key);

  function getSnapshot() {
    return String(getPrefValue(key));
  }

  function subscribe(onStoreChange: () => void) {
    const observerID = Zotero.Prefs.registerObserver(
      prefKey,
      () => {
        onStoreChange();
      },
      true,
    );

    return () => {
      Zotero.Prefs.unregisterObserver(observerID);
    };
  }

  return { getSnapshot, subscribe };
}

export function useBooleanPref(key: BooleanPrefKey) {
  const store = useMemo(() => createBooleanPrefStore(key), [key]);
  const raw = useSyncExternalStore(store.subscribe, store.getSnapshot);
  // Pref observers may surface strings
  const value = raw === "true";

  const setValue = useCallback(
    (next: boolean) => {
      setPref(key, next);
    },
    [key],
  );

  return [value, setValue] as const;
}
