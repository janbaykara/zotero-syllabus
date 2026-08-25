import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getPrefKey, getPrefValue, setPref } from "../../utils/prefs";

const PREF_KEY = getPrefKey("generateReadingScheduleCollection");

export function useReadingScheduleCollectionPref() {
  const store = useMemo(() => createReadingScheduleCollectionPrefStore(), []);

  const raw = useSyncExternalStore(store.subscribe, store.getSnapshot);
  // @ts-expect-error - Pref observers may surface strings
  const enabled = raw === "true" || raw === true;

  const setEnabled = useCallback((value: boolean) => {
    setPref("generateReadingScheduleCollection", value);
  }, []);

  return [enabled, setEnabled] as const;
}

export function createReadingScheduleCollectionPrefStore() {
  function getSnapshot() {
    return String(getPrefValue("generateReadingScheduleCollection"));
  }

  function subscribe(onStoreChange: () => void) {
    const observerID = Zotero.Prefs.registerObserver(
      PREF_KEY,
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
