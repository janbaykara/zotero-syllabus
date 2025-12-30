import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getPref, setPref } from "../../utils/prefs";

const compactModeListeners = new Set<() => void>();

function registerCompactModeChangeListener(listener: () => void): () => void {
  compactModeListeners.add(listener);
  return () => {
    compactModeListeners.delete(listener);
  };
}

function emitCompactModeChange() {
  compactModeListeners.forEach((listener) => listener());
}

export function useZoteroCompactMode() {
  // Create the store once
  const store = useMemo(() => createCompactModeStore(), []);

  const __compactMode = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  // @ts-expect-error - __compactMode is a string, but we want to compare it to a boolean
  const compactMode = __compactMode === "true" || __compactMode === true

  const setCompactMode = useCallback((value: boolean) => {
    setPref("compactMode", String(value) as any);
    // Emit change event after setting preference
    emitCompactModeChange();
  }, []);

  return [compactMode, setCompactMode] as const;
}

export function createCompactModeStore() {
  function getSnapshot() {
    return String(getPref("compactMode"))
  }

  function subscribe(onStoreChange: () => void) {
    // Subscribe to custom event emitter instead of Zotero notifier
    const unsubscribe = registerCompactModeChangeListener(() => {
      onStoreChange()
    });

    // Return an unsubscribe fn
    return unsubscribe;
  }

  return { getSnapshot, subscribe };
}

