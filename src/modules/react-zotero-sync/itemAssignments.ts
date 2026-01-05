import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import SuperJSON from "superjson";
import { SyllabusManager, ItemSyllabusAssignment } from "../syllabus";

export type ItemAssignmentsSnapshot = {
  assignments: ItemSyllabusAssignment[];
};

export function useZoteroItemAssignments(
  itemId: number | null,
  collectionId: number | null,
): ItemSyllabusAssignment[] {
  // Create the store once per item/collection combo
  const store = useMemo(
    () => createItemAssignmentsStore(itemId, collectionId),
    [itemId, collectionId],
  );

  const __assignments = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );

  const assignments = useMemo(() => {
    if (!itemId || !collectionId) {
      return [];
    }
    const snapshot = SuperJSON.parse(__assignments) as ItemAssignmentsSnapshot;
    return snapshot.assignments;
  }, [__assignments, itemId, collectionId]);

  return assignments;
}

export function createItemAssignmentsStore(
  itemId: number | null,
  collectionId: number | null,
) {
  function getSnapshot() {
    if (!itemId || !collectionId) {
      return SuperJSON.stringify({ assignments: [] });
    }

    try {
      const item = Zotero.Items.get(itemId);
      if (!item || !item.isRegularItem()) {
        return SuperJSON.stringify({ assignments: [] });
      }

      const assignments = SyllabusManager.getAllClassAssignments(
        item,
        collectionId,
      );
      return SuperJSON.stringify({ assignments });
    } catch (e) {
      ztoolkit.log("Error getting item assignments:", e);
      return SuperJSON.stringify({ assignments: [] });
    }
  }

  function subscribe(onStoreChange: () => void) {
    if (!itemId || !collectionId) {
      return () => {}; // No-op unsubscribe
    }

    const observer = {
      notify(
        event: string,
        type: string,
        ids: (number | string)[],
        extraData: any,
      ) {
        let shouldUpdate = false;

        // Listen to item modify/delete events for this specific item
        if (type === "item" && ids.includes(itemId)) {
          if (event === "modify" || event === "delete") {
            shouldUpdate = true;
            // Invalidate cache for this item
            try {
              const item = Zotero.Items.get(itemId);
              if (item) {
                SyllabusManager.invalidateSyllabusDataCache(item);
              }
            } catch (e) {
              // Item might not exist anymore
            }
          }
        }

        // Listen to collection-item events (items added/removed from collections)
        if (type === "collection-item") {
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          onStoreChange();
        }
      },
    };

    const notifierId = Zotero.Notifier.registerObserver(observer, [
      "item",
      "collection-item",
    ]);

    // Register preference observer for collection metadata changes
    // (class titles, reading dates, etc. affect assignment display)
    const prefKey = SyllabusManager.getPreferenceKey(
      SyllabusManager.settingsKeys.COLLECTION_METADATA,
    );

    const prefObserverId = Zotero.Prefs.registerObserver(
      prefKey,
      (value: unknown) => {
        Zotero.debug(`Preference ${prefKey} changed to ${value}`);
        onStoreChange();
      },
      true,
    );

    // Return an unsubscribe fn
    return () => {
      Zotero.Notifier.unregisterObserver(notifierId);
      Zotero.Prefs.unregisterObserver(prefObserverId);
    };
  }

  return { getSnapshot, subscribe };
}
