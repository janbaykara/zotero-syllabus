/**
 * Preact hooks for syncing with Zotero's external state
 * These hooks abstract away the store creation and useSyncExternalStore usage
 */

import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "preact/compat";
import {
  createCollectionItemsStore,
  createItemExtraFieldsStore,
  createCollectionMetadataStore,
  createCollectionStore,
  createPreferenceStore,
  createSelectedCollectionStore,
} from "./stores";
import { config } from "../../../package.json";
import { SyllabusManager } from "../../modules/syllabus";

/**
 * Hook to get a Zotero collection and sync with changes
 * @param collectionId - The ID of the collection
 * @returns The collection object, or null if not found
 */
export function useZoteroCollection(
  collectionId: number,
): Zotero.Collection | null {
  const store = useMemo(
    () => createCollectionStore(collectionId),
    [collectionId],
  );
  const name = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // Return the collection object, re-fetching when name changes
  return useMemo(() => {
    const collection = Zotero.Collections.get(collectionId);
    return collection || null;
  }, [collectionId, name]);
}

/**
 * Hook to get items in a collection and sync with changes
 * @param collectionId - The ID of the collection
 * @returns Array of items in the collection
 */
export function useZoteroCollectionItems(collectionId: number): Zotero.Item[] {
  const store = useMemo(
    () => createCollectionItemsStore(collectionId),
    [collectionId],
  );
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * Hook to track changes to item extra fields (syllabus data) in a collection
 * Returns a version number that increments when any item's extra fields change
 * @param collectionId - The ID of the collection
 * @returns Version number that changes when item extra fields are modified
 */
export function useZoteroItemExtraFields(collectionId: number): number {
  const store = useMemo(
    () => createItemExtraFieldsStore(collectionId),
    [collectionId],
  );
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * Hook to track changes to collection metadata (descriptions, class titles, etc.)
 * Returns a version number that increments when collection metadata changes
 * @param collectionId - The ID of the collection
 * @returns Version number that changes when collection metadata is modified
 */
export function useZoteroCollectionMetadata(collectionId: number): number {
  const store = useMemo(
    () => createCollectionMetadataStore(collectionId),
    [collectionId],
  );
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * Hook to get collection metadata values and sync with changes
 * @param collectionId - The ID of the collection
 * @returns Object with collection description and helper to get class metadata
 */
export function useZoteroCollectionMetadataData(collectionId: number) {
  const version = useZoteroCollectionMetadata(collectionId);

  return useMemo(() => {
    const description = SyllabusManager.getCollectionDescription(collectionId);
    const getClassTitle = (classNumber: number) =>
      SyllabusManager.getClassTitle(collectionId, classNumber);
    const getClassDescription = (classNumber: number) =>
      SyllabusManager.getClassDescription(collectionId, classNumber);

    return {
      description,
      getClassTitle,
      getClassDescription,
      version, // Include version so components can depend on it
    };
  }, [collectionId, version]);
}

/**
 * Hook to get a plugin preference value and sync with changes
 * @param key - The preference key (without prefix)
 * @param defaultValue - Default value if preference is not set
 * @returns The current preference value
 */
export function useZoteroPluginPreference<T>(key: string, defaultValue: T): T {
  const prefKey = `${config.prefsPrefix}.${key}`;
  const store = useMemo(
    () => createPreferenceStore(prefKey, defaultValue),
    [prefKey, defaultValue],
  );
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * Hook to get multiple plugin preferences at once
 * Note: This hook must be called with a stable keys object (use useMemo if needed)
 * @param keys - Object mapping preference keys to default values
 * @returns Object with the same keys and current preference values
 */
export function useZoteroPluginPreferences<T extends Record<string, any>>(
  keys: T,
): { [K in keyof T]: T[K] } {
  // Get all keys as an array to ensure consistent hook call order
  const keyEntries = Object.entries(keys);
  const prefs: any = {};

  // Call hooks in consistent order
  for (const [key, defaultValue] of keyEntries) {
    prefs[key] = useZoteroPluginPreference(key, defaultValue);
  }

  return prefs as { [K in keyof T]: T[K] };
}

/**
 * Hook to get the currently selected collection in Zotero
 * @returns The currently selected collection, or null if none is selected
 */
export function useZoteroSelectedCollection(): Zotero.Collection | null {
  const store = useMemo(() => createSelectedCollectionStore(), []);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * Hook to get collection name and sync with changes
 * @param collectionId - The ID of the collection
 * @returns The collection name
 */
export function useZoteroCollectionName(collectionId: number): string {
  const store = useMemo(
    () => createCollectionStore(collectionId),
    [collectionId],
  );
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
