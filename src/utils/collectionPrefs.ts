import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "./cache";
import { isSpecialViewPrefKey } from "./viewScope";
import { getAllCollections, zoteroLibraryID } from "./zotero";

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
  options?: { preserve?: (key: string) => boolean },
): { next: Record<string, unknown>; removed: number } {
  const live = new Set(Array.from(liveIds, String));
  const next: Record<string, unknown> = {};
  let removed = 0;
  for (const [key, value] of Object.entries(map)) {
    if (live.has(key) || options?.preserve?.(key)) {
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

function searchesApiAvailable(): boolean {
  try {
    const searches = (
      Zotero as {
        Searches?: { getAll?: unknown; getByLibrary?: unknown };
      }
    ).Searches;
    return (
      typeof searches?.getByLibrary === "function" ||
      typeof searches?.getAll === "function"
    );
  } catch {
    return false;
  }
}

function searchesForLibrary(libraryID: number): { id?: number }[] {
  try {
    const api = (
      Zotero as {
        Searches?: {
          getByLibrary?: (id: number) => { id?: number }[] | false | null;
          getAll?: () => { id?: number; libraryID?: number }[];
        };
      }
    ).Searches;
    if (typeof api?.getByLibrary === "function") {
      const byLibrary = api.getByLibrary(libraryID);
      return Array.isArray(byLibrary) ? byLibrary : [];
    }
    if (typeof api?.getAll === "function") {
      return (api.getAll() || []).filter(
        (search) => search.libraryID === libraryID,
      );
    }
  } catch {
    // Searches API unavailable.
  }
  return [];
}

/** Tree-row pref keys for live libraries (and saved searches, when enumerable). */
export function liveSpecialViewKeySet(): Set<string> {
  const live = new Set<string>();
  try {
    for (const library of Zotero.Libraries.getAll()) {
      const id = zoteroLibraryID(library);
      if (id == null) {
        continue;
      }
      if (library.libraryType === "feed") {
        live.add(`L${id}`);
        continue;
      }
      live.add(`D${id}`);
      live.add(`U${id}`);
      live.add(`R${id}`);
      live.add(`P${id}`);
      live.add(`T${id}`);
      live.add(`Y${id}`);
      for (const search of searchesForLibrary(id)) {
        if (search?.id) {
          live.add(`S${search.id}`);
        }
      }
    }
    live.add("F1");
  } catch {
    // Libraries may not be ready yet.
  }
  return live;
}

/** Remove view-mode / gallery prefs for collections that no longer exist. */
export function pruneStaleCollectionPrefs(
  extraRemovedIds?: Iterable<string | number>,
): number {
  const live = liveCollectionIdSet(extraRemovedIds);
  for (const key of liveSpecialViewKeySet()) {
    live.add(key);
  }
  const keepUnenumeratedSearches = !searchesApiAvailable();
  let removed = 0;
  for (const prefKey of COLLECTION_ID_PREF_KEYS) {
    const map = getCachedPref(prefKey, CollectionPrefMapSchema) || {};
    const pruned = pruneStaleCollectionIdMap(map, live, {
      preserve: (key) =>
        keepUnenumeratedSearches &&
        key.startsWith("S") &&
        isSpecialViewPrefKey(key),
    });
    if (pruned.removed === 0) {
      continue;
    }
    removed += pruned.removed;
    Zotero.Prefs.set(prefKey, JSON.stringify(pruned.next), true);
    zoteroCache.invalidatePref(prefKey);
  }
  return removed;
}
