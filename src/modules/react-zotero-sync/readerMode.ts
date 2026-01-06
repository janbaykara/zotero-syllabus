import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getPref, setPref, getPrefKey, getPrefValue } from "../../utils/prefs";

const PREF_KEY = getPrefKey("readerMode");

export function useZoteroReaderMode() {
  // Create the store once
  const store = useMemo(() => createReaderModeStore(), []);

  const __readerMode = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // @ts-expect-error - __readerMode is a string, but we want to compare it to a boolean
  const readerMode = __readerMode === "true" || __readerMode === true;

  const setReaderMode = useCallback((value: boolean) => {
    setPref("readerMode", String(value) as any);
  }, []);

  return [readerMode, setReaderMode] as const;
}

export function createReaderModeStore() {
  function getSnapshot() {
    return String(getPrefValue("readerMode"));
  }

  function subscribe(onStoreChange: () => void) {
    // Use Zotero's built-in preference observer
    const observerID = Zotero.Prefs.registerObserver(
      PREF_KEY,
      () => {
        onStoreChange();
      },
      true,
    );

    // Return an unsubscribe fn
    return () => {
      Zotero.Prefs.unregisterObserver(observerID);
    };
  }

  return { getSnapshot, subscribe };
}
