import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { getPref, setPref } from "../../utils/prefs";

const readerModeListeners = new Set<() => void>();

function registerReaderModeChangeListener(listener: () => void): () => void {
  readerModeListeners.add(listener);
  return () => {
    readerModeListeners.delete(listener);
  };
}

function emitReaderModeChange() {
  readerModeListeners.forEach((listener) => listener());
}

export function useZoteroReaderMode() {
  // Create the store once
  const store = useMemo(() => createReaderModeStore(), []);

  const __readerMode = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // @ts-expect-error - __readerMode is a string, but we want to compare it to a boolean
  const readerMode = __readerMode === "true" || __readerMode === true;

  const setReaderMode = useCallback((value: boolean) => {
    setPref("readerMode", String(value) as any);
    // Emit change event after setting preference
    emitReaderModeChange();
  }, []);

  return [readerMode, setReaderMode] as const;
}

export function createReaderModeStore() {
  function getSnapshot() {
    return String(getPref("readerMode"));
  }

  function subscribe(onStoreChange: () => void) {
    // Subscribe to custom event emitter instead of Zotero notifier
    const unsubscribe = registerReaderModeChangeListener(() => {
      onStoreChange();
    });

    // Return an unsubscribe fn
    return unsubscribe;
  }

  return { getSnapshot, subscribe };
}
