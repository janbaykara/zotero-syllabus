import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getPref, setPref, getPrefKey } from "../../utils/prefs";

const PREF_KEY = getPrefKey("compactMode");

export function useZoteroCompactMode() {
  // Create the store once
  const store = useMemo(() => createCompactModeStore(), []);

  const __compactMode = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  // @ts-expect-error - __compactMode is a string, but we want to compare it to a boolean
  const compactMode = __compactMode === "true" || __compactMode === true;

  const setCompactMode = useCallback((value: boolean) => {
    setPref("compactMode", String(value) as any);
  }, []);

  return [compactMode, setCompactMode] as const;
}

export function createCompactModeStore() {
  function getSnapshot() {
    return String(getPref("compactMode"));
  }

  function subscribe(onStoreChange: () => void) {
    // Use Zotero's built-in preference observer
    const observerID = Zotero.Prefs.registerObserver(
      PREF_KEY,
      () => {
        ztoolkit.log("Compact mode preference changed");
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
