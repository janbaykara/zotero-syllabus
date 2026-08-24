/**
 * Centralized caching system for expensive Zotero operations.
 * Handles JSON parsing, validation, and automatic cache invalidation.
 */

import type { z } from "zod";
import type { VersionedEntity } from "verzod";
import { LRUCache } from "lru-cache";

type GetByLibraryAndKeyArgs = Parameters<
  typeof Zotero.Collections.getByLibraryAndKey
>;

class ZoteroCache {
  // Item cache: itemId -> item
  private itemCache = new LRUCache<number, Zotero.Item>({
    max: 5000,
    updateAgeOnGet: true,
  });

  // Preference cache: key -> value (handles both JSON and simple prefs)
  private prefCache = new Map<string, any>();

  // Collection cache: libraryID:key -> collection (primary cache)
  private collectionCache = new Map<string, Zotero.Collection>();

  // Collection ID index: collectionId -> libraryID:key (for reverse lookup)
  private collectionIdIndex = new Map<number, string>();

  // Global Zotero Notifier observer ID
  private notifierID: string | null = null;

  // Per-key preference observer IDs
  private prefObserverIDs = new Map<string, symbol>();

  private initialized = false;

  /**
   * Initialize the cache system and register notifiers.
   * Call this once during addon startup.
   */
  initialize() {
    if (this.initialized) return;

    const observer = {
      notify: (
        event: string,
        type: string,
        ids: (number | string)[],
        _extraData: any,
      ) => {
        if (type === "item") {
          ids.forEach((id) => {
            if (typeof id === "number") {
              if (event === "modify" || event === "delete") {
                this.itemCache.delete(id);
              }
            }
          });
        }

        if (type === "collection") {
          ids.forEach((id) => {
            if (typeof id === "number") {
              if (event === "modify" || event === "delete") {
                this.invalidateCollection(id);
              }
            }
          });
        }
      },
    };

    this.notifierID = Zotero.Notifier.registerObserver(observer, [
      "item",
      "collection",
    ]);
    this.initialized = true;
  }

  /**
   * Cleanup - unregister notifiers
   */
  shutdown() {
    if (this.notifierID) {
      Zotero.Notifier.unregisterObserver(this.notifierID);
      this.notifierID = null;
    }

    for (const observerID of this.prefObserverIDs.values()) {
      Zotero.Prefs.unregisterObserver(observerID);
    }
    this.prefObserverIDs.clear();

    this.clear();
    this.initialized = false;
  }

  /**
   * Clear all caches
   */
  clear() {
    this.itemCache.clear();
    this.prefCache.clear();
    this.collectionCache.clear();
    this.collectionIdIndex.clear();
  }

  /**
   * Get item by ID (cached)
   */
  getItem(itemId: number): Zotero.Item | undefined {
    const cached = this.itemCache.get(itemId);
    if (cached) {
      return cached;
    }

    try {
      const item = Zotero.Items.get(itemId);
      if (item) {
        this.itemCache.set(itemId, item);
      }
      return item;
    } catch {
      return undefined;
    }
  }

  /**
   * Get preference value (cached)
   * If schema is provided, treats as JSON pref and parses/validates
   * If no schema, returns raw value (for simple prefs)
   */
  getPref<T = any>(
    key: string,
    schema?: z.ZodSchema<T>,
    entity?: VersionedEntity<any, any>,
  ): T | undefined {
    const cached = this.prefCache.get(key);
    if (cached !== undefined) {
      return cached as T;
    }

    if (!schema) {
      const value = Zotero.Prefs.get(key, true) as T;
      this.prefCache.set(key, value);
      return value;
    }

    let value: T | undefined = undefined;
    try {
      value = Zotero.Prefs.get(key, true) as T;
      const obj = JSON.parse(String(value || "{}"));

      if (entity) {
        const result = entity.safeParse(obj);
        if (result.type === "ok") {
          if (!entity.isLatest(obj)) {
            ztoolkit.log(`Migrating preference ${key} to latest version`);
            const migratedValue = result.value as T;
            Zotero.Prefs.set(key, JSON.stringify(migratedValue), true);
            value = migratedValue;
          } else {
            value = result.value as T;
          }
        } else {
          ztoolkit.log(`Error validating preference ${key}:`, result.error);
          value = undefined;
        }
      } else {
        const result = schema.safeParse(obj);
        if (result.success) {
          value = result.data as T;
        } else {
          ztoolkit.log(`Error validating preference ${key}:`, result.error);
          value = undefined;
        }
      }
    } catch (e) {
      ztoolkit.log(`Error parsing preference ${key}:`, e);
      value = undefined;
    }

    this.prefCache.set(key, value);
    this.registerPrefObserver(key);

    return value;
  }

  /**
   * Invalidate preference cache entry
   */
  invalidatePref(key: string): void {
    this.prefCache.delete(key);
  }

  /**
   * Register a preference observer for a given key to invalidate cache on changes
   */
  private registerPrefObserver(key: string): void {
    if (!this.prefObserverIDs.has(key)) {
      const observerID = Zotero.Prefs.registerObserver(
        key,
        () => {
          this.invalidatePref(key);
        },
        true,
      );
      this.prefObserverIDs.set(key, observerID);
    }
  }

  /**
   * Get collection by ID (cached)
   */
  getCollectionById(collectionId: number): Zotero.Collection | undefined {
    const cacheKey = this.collectionIdIndex.get(collectionId);
    if (cacheKey) {
      const cached = this.collectionCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      this.collectionIdIndex.delete(collectionId);
    }

    try {
      const collection = Zotero.Collections.get(collectionId);
      if (collection) {
        this.setCollection(collection);
      }
      return collection;
    } catch {
      return undefined;
    }
  }

  /**
   * Get collection by library ID and key (cached)
   */
  getCollectionByKey(
    libraryID: number,
    key: string,
  ): Zotero.Collection | undefined {
    const cacheKey = `${libraryID}:${key}`;

    const cached = this.collectionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const collection = Zotero.Collections.getByLibraryAndKey(libraryID, key);
      if (collection) {
        this.setCollection(collection);
      }
      return collection || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get collection by either ID or library:key tuple (cached)
   */
  getCollection(
    identifier: number | GetByLibraryAndKeyArgs,
  ): Zotero.Collection | undefined {
    if (typeof identifier === "number") {
      return this.getCollectionById(identifier);
    } else {
      const [libraryID, key] = identifier;
      return this.getCollectionByKey(libraryID, key);
    }
  }

  private setCollection(collection: Zotero.Collection): void {
    const cacheKey = `${collection.libraryID}:${collection.key}`;
    this.collectionCache.set(cacheKey, collection);
    this.collectionIdIndex.set(collection.id, cacheKey);
  }

  /**
   * Invalidate collection cache entry by ID
   */
  invalidateCollection(collectionId: number): void {
    const cacheKey = this.collectionIdIndex.get(collectionId);
    if (cacheKey) {
      this.collectionCache.delete(cacheKey);
      this.collectionIdIndex.delete(collectionId);
    }
  }

  /**
   * Invalidate collection by library:key
   */
  invalidateCollectionByKey(libraryID: number, key: string): void {
    const cacheKey = `${libraryID}:${key}`;
    this.collectionCache.delete(cacheKey);

    for (const [id, cachedKey] of this.collectionIdIndex.entries()) {
      if (cachedKey === cacheKey) {
        this.collectionIdIndex.delete(id);
        break;
      }
    }
  }
}

export const zoteroCache = new ZoteroCache();

export function getCachedItem(itemId: number): Zotero.Item | undefined {
  return zoteroCache.getItem(itemId);
}

export function getCachedPref<T = any>(
  key: string,
  schema?: z.ZodSchema<T>,
  entity?: VersionedEntity<any, any>,
): T | undefined {
  return zoteroCache.getPref(key, schema, entity);
}

export function getCachedCollection(
  identifier: number | GetByLibraryAndKeyArgs,
): Zotero.Collection | undefined {
  return zoteroCache.getCollection(identifier);
}

export function getCachedCollectionById(
  collectionId: number,
): Zotero.Collection | undefined {
  return zoteroCache.getCollectionById(collectionId);
}

export function getCachedCollectionByKey(
  libraryID: number,
  key: string,
): Zotero.Collection | undefined {
  return zoteroCache.getCollectionByKey(libraryID, key);
}
