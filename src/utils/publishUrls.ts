import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "./cache";

const PublishUrlMapSchema = z.record(z.string(), z.string());

function prefKey(): string {
  return `${config.prefsPrefix}.publishUrls`;
}

/** Last successful public URL for a syllabus collection, if any. */
export function getPublishedSyllabusUrl(collectionId: number): string | null {
  const map = getCachedPref(prefKey(), PublishUrlMapSchema) || {};
  const url = map[String(collectionId)];
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

export function setPublishedSyllabusUrl(
  collectionId: number,
  url: string,
): void {
  const key = prefKey();
  const map = { ...(getCachedPref(key, PublishUrlMapSchema) || {}) };
  map[String(collectionId)] = url;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function clearPublishedSyllabusUrl(collectionId: number): void {
  const key = prefKey();
  const map = { ...(getCachedPref(key, PublishUrlMapSchema) || {}) };
  if (!(String(collectionId) in map)) {
    return;
  }
  delete map[String(collectionId)];
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}
