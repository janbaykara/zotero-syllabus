import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "./cache";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

export const PREFS_KEYS: (keyof PluginPrefsMap)[] = [
  "showBibliography",
  "defaultItemDensity",
  "readerMode",
  "shouldColourSyllabusRows",
  "debugMode",
  "wpm",
  "enableSyllabus",
  "enableGallery",
  "enableExplorer",
  "enableReadingSchedule",
  "enableAnnotations",
  "optionalFeaturesPromptDone",
  "generateReadingScheduleCollection",
  "customIcons",
];

/**
 * Defaults from `addon/prefs.js`. Keep in sync when adding prefs.
 * Used after reset so UI/code never see `undefined` (clearing a user value
 * does not always surface the Mozilla default branch to `Zotero.Prefs.get`).
 */
export const PLUGIN_PREF_DEFAULTS: {
  [K in keyof PluginPrefsMap]: PluginPrefsMap[K];
} = {
  showBibliography: false,
  defaultItemDensity: "expanded",
  readerMode: false,
  shouldColourSyllabusRows: false,
  debugMode: false,
  wpm: 220,
  enableSyllabus: true,
  enableGallery: false,
  enableExplorer: false,
  enableReadingSchedule: false,
  enableAnnotations: false,
  myAnnotationsCopyBlockquote: false,
  myAnnotationsCopyCiteKey: false,
  optionalFeaturesPromptDone: false,
  latestTourVersion: 0,
  latestGalleryTourVersion: 0,
  defaultGalleryLayout: "cover",
  defaultGallerySort: "auto",
  defaultGalleryGroupBy: "auto",
  myAnnotationsLayout: "grid",
  myAnnotationsSort: "lastRead",
  myAnnotationsGroupBy: "none",
  myAnnotationsOrder: "newestLast",
  annotationsQuoteOrder: "location",
  galleryShowItemsWithoutAnnotations: true,
  magazineTypeSize: "small",
  magazinePacking: "packed",
  generateReadingScheduleCollection: false,
  readingScheduleCollectionKey: "",
  customIcons: true,
  publishApiBaseUrl: "https://read.zotero-syllabus.workers.dev",
  publishJwt: "",
  publishUserId: "",
  publishJwtExpiresAt: 0,
  defaultPriorities: "",
};

const PREFS_PREFIX = config.prefsPrefix;

/**
 * Get preference value (cached).
 * Wrapper of `Zotero.Prefs.get` with caching.
 * @param key
 */
export function getPref<K extends keyof PluginPrefsMap>(key: K) {
  return getCachedPref(`${PREFS_PREFIX}.${key}`) as PluginPrefsMap[K];
}

export function getPrefValue<K extends keyof PluginPrefsMap>(key: K) {
  return Zotero.Prefs.get(`${PREFS_PREFIX}.${key}`, true) as PluginPrefsMap[K];
}

/**
 * Set preference value.
 * Wrapper of `Zotero.Prefs.set`.
 * @param key
 * @param value
 */
export function setPref<K extends keyof PluginPrefsMap>(
  key: K,
  value: PluginPrefsMap[K],
) {
  return Zotero.Prefs.set(`${PREFS_PREFIX}.${key}`, value, true);
}

/**
 * Clear preference value.
 * Wrapper of `Zotero.Prefs.clear`.
 * @param key
 */
export function clearPref(key: string) {
  return Zotero.Prefs.clear(`${PREFS_PREFIX}.${key}`, true);
}

/**
 * Relative pref names under the plugin branch (including nested keys like
 * `galleryLayout.<id>`). Forward-looking: whatever is currently stored.
 */
export function listPluginPrefNames(): string[] {
  try {
    const branch = Services.prefs.getBranch(`${PREFS_PREFIX}.`);
    return branch.getChildList("");
  } catch (error) {
    ztoolkit.log("listPluginPrefNames failed:", error);
    return [];
  }
}

/**
 * Clear every user-set value under the plugin prefs prefix (including nested
 * keys like `galleryLayout.<id>`), then re-apply `PLUGIN_PREF_DEFAULTS`.
 * Does not delete library data (syllabus notes, items, collections).
 */
export function resetAllPluginPrefs(): string[] {
  const names = listPluginPrefNames();
  const cleared: string[] = [];
  for (const name of names) {
    const fullKey = `${PREFS_PREFIX}.${name}`;
    try {
      if (Services.prefs.prefHasUserValue(fullKey)) {
        // Prefer Zotero.Prefs.clear so plugin/Zotero caches stay consistent.
        Zotero.Prefs.clear(fullKey, true);
        cleared.push(name);
      }
    } catch (error) {
      ztoolkit.log("Failed to clear pref:", fullKey, error);
    }
    zoteroCache.invalidatePref(fullKey);
  }

  // Explicitly write defaults: after clear, Prefs.get often returns undefined
  // for plugin keys, and preference-bound checkboxes then persist `false`.
  for (const key of Object.keys(
    PLUGIN_PREF_DEFAULTS,
  ) as (keyof PluginPrefsMap)[]) {
    try {
      setPref(key, PLUGIN_PREF_DEFAULTS[key]);
    } catch (error) {
      ztoolkit.log("Failed to restore default pref:", key, error);
    }
    zoteroCache.invalidatePref(getPrefKey(key));
  }

  return cleared;
}

/**
 * Get the full preference key with prefix.
 * @param key
 */
export function getPrefKey<K extends keyof PluginPrefsMap>(key: K): string {
  return `${PREFS_PREFIX}.${key}`;
}
