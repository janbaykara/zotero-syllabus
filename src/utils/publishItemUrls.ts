import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "./cache";
import {
  clearItemShareUrlInExtra,
  getItemShareUrlFromExtra,
  setItemShareUrlInExtra,
} from "./itemShareExtra";

const PublishItemUrlMapSchema = z.record(z.string(), z.string());

function prefKey(): string {
  return `${config.prefsPrefix}.publishItemUrls`;
}

function itemMapKey(libraryId: number | string, itemKey: string): string {
  return `${libraryId}:${itemKey}`;
}

/** Last successful public URL from the local prefs cache, if any. */
export function getPublishedItemUrl(
  libraryId: number | string,
  itemKey: string,
): string | null {
  const map = getCachedPref(prefKey(), PublishItemUrlMapSchema) || {};
  const url = map[itemMapKey(libraryId, itemKey)];
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

/**
 * Prefer Extra (syncs with the library), fall back to the local prefs cache.
 */
export function resolvePublishedItemUrl(item: Zotero.Item): string | null {
  const fromExtra = getItemShareUrlFromExtra(item);
  if (fromExtra) {
    return fromExtra;
  }
  try {
    return getPublishedItemUrl(item.libraryID, item.key);
  } catch {
    return null;
  }
}

export function setPublishedItemUrl(
  libraryId: number | string,
  itemKey: string,
  url: string,
): void {
  const key = prefKey();
  const map = { ...(getCachedPref(key, PublishItemUrlMapSchema) || {}) };
  map[itemMapKey(libraryId, itemKey)] = url;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

/** Write prefs cache + Extra on the item (Extra syncs across devices). */
export async function rememberPublishedItemUrl(
  item: Zotero.Item,
  url: string,
): Promise<void> {
  setPublishedItemUrl(item.libraryID, item.key, url);
  try {
    await setItemShareUrlInExtra(item, url);
  } catch (err) {
    ztoolkit.log("rememberPublishedItemUrl Extra write failed:", err);
  }
}

export function clearPublishedItemUrl(
  libraryId: number | string,
  itemKey: string,
): void {
  const key = prefKey();
  const map = { ...(getCachedPref(key, PublishItemUrlMapSchema) || {}) };
  const id = itemMapKey(libraryId, itemKey);
  if (!(id in map)) {
    return;
  }
  delete map[id];
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export async function forgetPublishedItemUrl(item: Zotero.Item): Promise<void> {
  clearPublishedItemUrl(item.libraryID, item.key);
  try {
    await clearItemShareUrlInExtra(item);
  } catch (err) {
    ztoolkit.log("forgetPublishedItemUrl Extra clear failed:", err);
  }
}
