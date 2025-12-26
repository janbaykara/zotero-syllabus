import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { SyllabusManager } from "../syllabus";

export function useZoteroCollectionDescription(collectionId: number) {
  // Create the store once per ID
  const store = useMemo(
    () => createCollectionDescriptionStore(collectionId),
    [collectionId]
  );

  const descriptionFromZotero = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot
  );

  const setDescription = useCallback((description: string) => {
    SyllabusManager.setCollectionDescription(collectionId, description, "page");
  }, [collectionId]);

  return [descriptionFromZotero, setDescription] as const;
}

export function createCollectionDescriptionStore(collectionId: number) {
  const prefKey = SyllabusManager.getPreferenceKey(SyllabusManager.settingsKeys.COLLECTION_METADATA);

  function getSnapshot() {
    // Read from preferences via SyllabusManager
    return SyllabusManager.getCollectionDescription(collectionId);
  }

  function subscribe(onStoreChange: () => void) {
    const observer = {
      notify(event: string, type: string, ids: (number | string)[], extraData: any) {
        // Listen to setting events for our preference key
        if (type === 'setting' && extraData?.pref === prefKey) {
          onStoreChange();
        }
        // Also listen to collection modify/refresh events in case description is updated
        if (type === 'collection' && ids.includes(collectionId) && (event === 'modify' || event === 'refresh')) {
          onStoreChange();
        }
      }
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, ['setting', 'collection']);

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
    };
  }

  return { getSnapshot, subscribe };
}

