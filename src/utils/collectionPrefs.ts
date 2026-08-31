import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "./cache";
import { getAllCollections } from "./zotero";

const CollectionPrefMapSchema = z.record(z.string(), z.unknown());

/** Prefs keyed by numeric collection id. */
export const COLLECTION_ID_PREF_KEYS = [
  `${config.prefsPrefix}.collectionViewModes`,
  `${config.prefsPrefix}.galleryGroupBy`,
  `${config.prefsPrefix}.gallerySort`,
  `${config.prefsPrefix}.furtherReadingSort`,
] as const;

/**
 * Drop map entries whose keys are not in `liveIds`.
 * Notero kept deleted collections in its sync prefs (#775).
 */
export function pruneStaleCollectionIdMap(
  map: Record<string, unknown>,
  liveIds: Iterable<string | number>,
): { next: Record<string, unknown>; removed: number } {
  const live = new Set(Array.from(liveIds, String));
  const next: Record<string, unknown> = {};
  let removed = 0;
  for (const [key, value] of Object.entries(map)) {
    if (live.has(key)) {
      next[key] = value;
    } else {
      removed += 1;
    }
  }
  return { next, removed };
}

export function liveCollectionIdSet(
  extraRemovedIds?: Iterable<string | number>,
): Set<string> {
  const live = new Set<string>();
  try {
    for (const collection of getAllCollections()) {
      if (!collection?.id || collection.deleted) {
        continue;
      }
      live.add(String(collection.id));
    }
  } catch {
    // Libraries may not be ready yet.
  }
  if (extraRemovedIds) {
    for (const id of extraRemovedIds) {
      live.delete(String(id));
    }
  }
  return live;
}

/** Remove view-mode / gallery prefs for collections that no longer exist. */
export function pruneStaleCollectionPrefs(
  extraRemovedIds?: Iterable<string | number>,
): number {
  const live = liveCollectionIdSet(extraRemovedIds);
  let removed = 0;
  for (const prefKey of COLLECTION_ID_PREF_KEYS) {
    const map = getCachedPref(prefKey, CollectionPrefMapSchema) || {};
    const pruned = pruneStaleCollectionIdMap(map, live);
    if (pruned.removed === 0) {
      continue;
    }
    removed += pruned.removed;
    Zotero.Prefs.set(prefKey, JSON.stringify(pruned.next), true);
    zoteroCache.invalidatePref(prefKey);
  }
  return removed;
}
