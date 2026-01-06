/**
 * Centralized caching system for expensive Zotero operations.
 * Handles JSON parsing, validation, and automatic cache invalidation.
 */

import type { z } from "zod";
import type { VersionedEntity } from "verzod";
import { LRUCache } from "lru-cache";
import {
  ItemSyllabusDataEntity,
  type ItemSyllabusData,
} from "./schemas";
import { ExtraFieldTool } from "zotero-plugin-toolkit";
import type { GetByLibraryAndKeyArgs } from "../modules/syllabus";

// ztoolkit is available as a global
declare const ztoolkit: ZToolkit;

// Sentinel value to represent "no syllabus data" in cache
// This allows us to distinguish between "not cached" and "cached as undefined"
const NO_SYLLABUS_DATA = Symbol("no-syllabus-data");

class ZoteroCache {
  // Item cache: itemId -> item
  private itemCache = new LRUCache<number, Zotero.Item>({
    max: 5000,
    updateAgeOnGet: true,
  });

  // Syllabus data cache: itemId -> parsed/validated ItemSyllabusData or NO_SYLLABUS_DATA
  private syllabusDataCache = new LRUCache<
    number,
    ItemSyllabusData | typeof NO_SYLLABUS_DATA
  >({
    max: 2000,
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

  // ExtraFieldTool instance for reading item extra fields
  private extraFieldTool = new ExtraFieldTool();

  private static SYLLABUS_DATA_KEY = "syllabus";

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
        // Invalidate item cache on item changes
        if (type === "item") {
          ids.forEach((id) => {
            if (typeof id === "number") {
              if (event === "modify" || event === "delete") {
                // Invalidate both item and syllabus data caches
                this.itemCache.delete(id);
                this.syllabusDataCache.delete(id);
              }
            }
          });
        }

        // Invalidate collection cache on collection changes
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

    // Unregister all preference observers
    for (const [key, observerID] of this.prefObserverIDs.entries()) {
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
    this.syllabusDataCache.clear();
    this.prefCache.clear();
    this.collectionCache.clear();
    this.collectionIdIndex.clear();
  }

  /**
   * Get item by ID (cached)
   */
  getItem(itemId: number): Zotero.Item | undefined {
    // Check cache first
    const cached = this.itemCache.get(itemId);
    if (cached) {
      return cached;
    }

    // Fetch from Zotero
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
   * Get syllabus data for an item (cached, with parsing and validation)
   */
  getItemSyllabusData(itemId: number): ItemSyllabusData | undefined {
    // Check cache first
    const cached = this.syllabusDataCache.get(itemId);
    if (cached !== undefined) {
      // If it's the sentinel, return undefined
      if (cached === NO_SYLLABUS_DATA) {
        return undefined;
      }
      // Otherwise return the cached data
      return cached;
    }

    // Get item (using cached getter)
    const item = this.getItem(itemId);
    if (!item) {
      return undefined;
    }

    // Read extra field
    const jsonStr = this.extraFieldTool.getExtraField(
      item,
      ZoteroCache.SYLLABUS_DATA_KEY,
    );

    if (!jsonStr) {
      // Cache sentinel to avoid repeated lookups
      this.syllabusDataCache.set(itemId, NO_SYLLABUS_DATA);
      return undefined;
    }

    try {
      const parsed = JSON.parse(jsonStr);
      // Use Zod schema with verzod for parsing and migration
      const result = ItemSyllabusDataEntity.safeParse(parsed);
      if (result.type === "ok") {
        // Handle migration if needed (fire-and-forget)
        (async () => {
          const isLatest = ItemSyllabusDataEntity.isLatest(parsed);
          if (!isLatest) {
            // Save the migrated data back to the extra field
            const migratedJsonStr = JSON.stringify(result.value);
            this.extraFieldTool
              .setExtraField(item, ZoteroCache.SYLLABUS_DATA_KEY, migratedJsonStr)
              .catch((e) => {
                ztoolkit.log("Error saving upgraded syllabus data:", e);
              })
              .finally(() => {
                ztoolkit.log(
                  "item - migrated syllabus data saved",
                  itemId,
                  item.getDisplayTitle(),
                  migratedJsonStr,
                );
              });
          }
        })();

        // Cache the validated result
        this.syllabusDataCache.set(itemId, result.value);
        return result.value;
      } else {
        ztoolkit.log("Error parsing syllabus data - after JSON.parse:", {
          result,
          parsed,
        });
        // Cache sentinel for invalid data
        this.syllabusDataCache.set(itemId, NO_SYLLABUS_DATA);
        return undefined;
      }
    } catch (e) {
      ztoolkit.log("Error parsing syllabus data:", e, jsonStr);
      // Cache sentinel for parse errors
      this.syllabusDataCache.set(itemId, NO_SYLLABUS_DATA);
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
    // Check if we have a cached value
    const cached = this.prefCache.get(key);
    if (cached !== undefined) {
      return cached as T;
    }

    if (!schema) {
      // Simple pref - just get raw value
      const value = Zotero.Prefs.get(key, true) as T;
      this.prefCache.set(key, value);
      return value;
    }

    let value: T | undefined = undefined;
    // JSON pref - parse and validate
    try {
      value = Zotero.Prefs.get(key, true) as T;
      const obj = JSON.parse(String(value || ""));

      if (entity) {
        // Use versioned entity if provided (for migration)
        // and then save back to DB if a migration happened
        const result = entity.safeParse(obj);
        if (result.type === "ok") {
          // Check if migration needed
          if (!entity.isLatest(obj)) {
            // Migrate and save back
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
        // No versioned entity, just validate with schema
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

    // Cache the result and raw string
    this.prefCache.set(key, value);

    // Register preference observer if not already registered
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
          // Invalidate cache when preference changes
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
    // Check ID index first
    const cacheKey = this.collectionIdIndex.get(collectionId);
    if (cacheKey) {
      const cached = this.collectionCache.get(cacheKey);
      if (cached) {
        return cached;
      }
      // Cache key exists but collection not found - index is stale, remove it
      this.collectionIdIndex.delete(collectionId);
    }

    // Fetch from Zotero
    try {
      const collection = Zotero.Collections.get(collectionId);
      if (collection) {
        // Cache it using libraryID:key as the primary key
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

    // Check primary cache
    const cached = this.collectionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from Zotero
    try {
      const collection = Zotero.Collections.getByLibraryAndKey(
        libraryID,
        key,
      );
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

  /**
   * Internal method to cache a collection in both maps
   */
  private setCollection(collection: Zotero.Collection): void {
    const cacheKey = `${collection.libraryID}:${collection.key}`;

    // Store in primary cache
    this.collectionCache.set(cacheKey, collection);

    // Store in ID index
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

    // Find and remove from ID index
    for (const [id, cachedKey] of this.collectionIdIndex.entries()) {
      if (cachedKey === cacheKey) {
        this.collectionIdIndex.delete(id);
        break;
      }
    }
  }

  /**
   * Invalidate syllabus data cache for a specific item
   * Call this immediately after modifying item's syllabus data to ensure cache stays in sync
   */
  invalidateItemSyllabusData(itemId: number): void {
    this.syllabusDataCache.delete(itemId);
  }
}

// Singleton instance
export const zoteroCache = new ZoteroCache();

// ========== Convenience Wrapper Functions ==========

/**
 * Get item by ID (cached)
 */
export function getCachedItem(itemId: number): Zotero.Item | undefined {
  return zoteroCache.getItem(itemId);
}

/**
 * Get syllabus data for an item (cached, with parsing and validation)
 */
export function getCachedItemSyllabusData(
  itemId: number,
): ItemSyllabusData | undefined {
  return zoteroCache.getItemSyllabusData(itemId);
}

/**
 * Get preference value (cached)
 * If schema is provided, treats as JSON pref and parses/validates
 * If no schema, returns raw value (for simple prefs)
 */
export function getCachedPref<T = any>(
  key: string,
  schema?: z.ZodSchema<T>,
  entity?: VersionedEntity<any, any>,
): T | undefined {
  return zoteroCache.getPref(key, schema, entity);
}

/**
 * Get collection by either ID or library:key tuple (cached)
 */
export function getCachedCollection(
  identifier: number | GetByLibraryAndKeyArgs,
): Zotero.Collection | undefined {
  return zoteroCache.getCollection(identifier);
}

/**
 * Get collection by ID (cached)
 */
export function getCachedCollectionById(
  collectionId: number,
): Zotero.Collection | undefined {
  return zoteroCache.getCollectionById(collectionId);
}

/**
 * Get collection by library ID and key (cached)
 */
export function getCachedCollectionByKey(
  libraryID: number,
  key: string,
): Zotero.Collection | undefined {
  return zoteroCache.getCollectionByKey(libraryID, key);
}

/**
 * Invalidate syllabus data cache for a specific item
 * Call this immediately after modifying item's syllabus data to ensure cache stays in sync
 */
export function invalidateCachedItemSyllabusData(itemId: number): void {
  zoteroCache.invalidateItemSyllabusData(itemId);
}

