/**
 * External stores for syncing React components with Zotero's state
 * Uses useSyncExternalStore pattern to subscribe to Zotero Notifier events
 */

import { SyllabusManager } from "../../modules/syllabus";
import { getPref } from "../prefs";
import { config } from "../../../package.json";

/**
 * Store for collection items - syncs when items in a collection change
 */
export function createCollectionItemsStore(collectionId: number) {
  let items: Zotero.Item[] = [];
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;

  const getSnapshot = () => items;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    // Subscribe to Zotero notifier for item and collection-item changes
    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        // Refresh if items in this collection changed
        if (type === "item" && (event === "modify" || event === "add" || event === "delete")) {
          const collection = Zotero.Collections.get(collectionId);
          if (collection) {
            const newItems = collection.getChildItems();
            // Only update if items actually changed (check IDs)
            const oldIds = new Set(items.map((i) => i.id));
            const newIds = new Set(newItems.map((i) => i.id));
            if (
              oldIds.size !== newIds.size ||
              [...oldIds].some((id) => !newIds.has(id)) ||
              [...newIds].some((id) => !oldIds.has(id))
            ) {
              items = newItems;
              listeners.forEach((l) => l());
            }
          }
        }
        // Handle collection-item changes (items added/removed from collection)
        if (type === "collection-item") {
          const collection = Zotero.Collections.get(collectionId);
          if (collection) {
            items = collection.getChildItems();
            listeners.forEach((l) => l());
          }
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "item",
      "collection-item",
    ]);

    // Initial load
    const collection = Zotero.Collections.get(collectionId);
    if (collection) {
      items = collection.getChildItems();
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && notifierID) {
        Zotero.Notifier.unregisterObserver(notifierID);
        notifierID = null;
      }
    };
  };

  return { getSnapshot, subscribe };
}

/**
 * Store for item extra fields (syllabus data) - syncs when item extra fields change
 * This is needed because item modifications might change the syllabus class number or priority
 */
export function createItemExtraFieldsStore(collectionId: number) {
  let version = 0;
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;

  const getSnapshot = () => version;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        // When items are modified, their extra fields might have changed
        if (type === "item" && event === "modify") {
          // Check if any of the modified items are in our collection
          const collection = Zotero.Collections.get(collectionId);
          if (collection) {
            const collectionItemIds = new Set(collection.getChildItems().map((i) => i.id));
            const modifiedIds = ids as number[];
            if (modifiedIds.some((id) => collectionItemIds.has(id))) {
              version++;
              listeners.forEach((l) => l());
            }
          }
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, ["item"]);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && notifierID) {
        Zotero.Notifier.unregisterObserver(notifierID);
        notifierID = null;
      }
    };
  };

  return { getSnapshot, subscribe };
}

/**
 * Store for collection metadata (descriptions, class titles, etc.)
 * Stored in preferences, so we listen to preference changes
 */
export function createCollectionMetadataStore(collectionId: number) {
  let version = 0;
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;

  const getSnapshot = () => version;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        // Listen for preference changes related to collection metadata
        if (type === "setting") {
          const prefKey = `${config.prefsPrefix}.collectionMetadata`;
          if (extraData?.pref === prefKey) {
            version++;
            listeners.forEach((l) => l());
          }
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, ["setting"]);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && notifierID) {
        Zotero.Notifier.unregisterObserver(notifierID);
        notifierID = null;
      }
    };
  };

  return { getSnapshot, subscribe };
}

/**
 * Store for collection name - syncs when collection changes
 */
export function createCollectionStore(collectionId: number) {
  let name: string = "";
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;

  const getSnapshot = () => name;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        // Listen for collection modifications
        if (type === "collection" && event === "modify") {
          const modifiedIds = ids as number[];
          if (modifiedIds.includes(collectionId)) {
            const collection = Zotero.Collections.get(collectionId);
            if (collection) {
              const newName = collection.name || "";
              if (newName !== name) {
                name = newName;
                listeners.forEach((l) => l());
              }
            }
          }
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "collection",
    ]);

    // Initial load
    const collection = Zotero.Collections.get(collectionId);
    if (collection) {
      name = collection.name || "";
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && notifierID) {
        Zotero.Notifier.unregisterObserver(notifierID);
        notifierID = null;
      }
    };
  };

  return { getSnapshot, subscribe };
}

/**
 * Store for a specific preference value
 */
export function createPreferenceStore<T>(key: string, defaultValue: T) {
  let value: T = defaultValue;
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;

  const getSnapshot = () => value;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        if (type === "setting" && extraData?.pref === key) {
          const newValue = (Zotero.Prefs.get(key, true) ?? defaultValue) as T;
          if (newValue !== value) {
            value = newValue;
            listeners.forEach((l) => l());
          }
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "setting",
    ]);

    // Initial load
    value = (Zotero.Prefs.get(key, true) ?? defaultValue) as T;

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && notifierID) {
        Zotero.Notifier.unregisterObserver(notifierID);
        notifierID = null;
      }
    };
  };

  return { getSnapshot, subscribe };
}

/**
 * Store for the currently selected collection in Zotero
 */
export function createSelectedCollectionStore() {
  let collection: Zotero.Collection | null = null;
  const listeners = new Set<() => void>();
  let notifierID: string | null = null;
  let intervalID: NodeJS.Timeout | null = null;

  const getSnapshot = () => collection;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        // Listen to tab changes and collection selection changes
        if (type === "tab" || type === "collection") {
          const pane = ztoolkit.getGlobal("ZoteroPane");
          const newCollection = pane?.getSelectedCollection() || null;
          if (newCollection?.id !== collection?.id) {
            collection = newCollection;
            listeners.forEach((l) => l());
          }
        }
      },
    };

    notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "tab",
      "collection",
    ]);

    // Also poll for changes as a fallback (Zotero doesn't always fire tab events reliably)
    intervalID = setInterval(() => {
      const pane = ztoolkit.getGlobal("ZoteroPane");
      const newCollection = pane?.getSelectedCollection() || null;
      if (newCollection?.id !== collection?.id) {
        collection = newCollection;
        listeners.forEach((l) => l());
      }
    }, 500);

    // Initial load
    const pane = ztoolkit.getGlobal("ZoteroPane");
    collection = pane?.getSelectedCollection() || null;

    return () => {
      listeners.delete(listener);
      if (intervalID) {
        clearInterval(intervalID);
        intervalID = null;
      }
      if (listeners.size === 0 && notifierID) {
        Zotero.Notifier.unregisterObserver(notifierID);
        notifierID = null;
      }
    };
  };

  return { getSnapshot, subscribe };
}

