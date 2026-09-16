import { getPrefKey, getPrefValue, setPref } from "../utils/prefs";
import { zoteroCache } from "../utils/cache";
import { FEATURE_FLAG } from "./featureFlags";

export type OptionalFeatureId =
  "syllabus" | "gallery" | "explorer" | "readingSchedule";

export type OptionalFeatureChoices = Record<OptionalFeatureId, boolean>;

const ENABLE_PREF: Record<
  OptionalFeatureId,
  | "enableSyllabus"
  | "enableGallery"
  | "enableExplorer"
  | "enableReadingSchedule"
> = {
  syllabus: "enableSyllabus",
  gallery: "enableGallery",
  explorer: "enableExplorer",
  readingSchedule: "enableReadingSchedule",
};

const ENABLE_PREF_KEYS = [
  "enableSyllabus",
  "enableGallery",
  "enableExplorer",
  "enableReadingSchedule",
] as const;

let chromeRefresh: (() => void) | null = null;
let prefObserverIDs: symbol[] = [];

export function registerOptionalFeaturesChromeRefresh(fn: () => void): void {
  chromeRefresh = fn;
}

export function isOptionalFeatureEnabled(id: OptionalFeatureId): boolean {
  if (id === "readingSchedule" && !FEATURE_FLAG.READING_SCHEDULE) {
    return false;
  }
  return !!getPrefValue(ENABLE_PREF[id]);
}

export function getOptionalFeatureChoices(): OptionalFeatureChoices {
  return {
    syllabus: isOptionalFeatureEnabled("syllabus"),
    gallery: isOptionalFeatureEnabled("gallery"),
    explorer: isOptionalFeatureEnabled("explorer"),
    readingSchedule: isOptionalFeatureEnabled("readingSchedule"),
  };
}

/** Defaults shown in the first-run showcase (before prefs are written). */
export function getDefaultOptionalFeatureChoices(): OptionalFeatureChoices {
  return {
    syllabus: true,
    gallery: false,
    explorer: false,
    readingSchedule: false,
  };
}

export function applyOptionalFeatureChoices(
  choices: OptionalFeatureChoices,
): void {
  for (const id of Object.keys(ENABLE_PREF) as OptionalFeatureId[]) {
    const key = ENABLE_PREF[id];
    setPref(key, !!choices[id]);
    zoteroCache.invalidatePref(getPrefKey(key));
  }
  setPref("optionalFeaturesPromptDone", true);
  zoteroCache.invalidatePref(getPrefKey("optionalFeaturesPromptDone"));
  chromeRefresh?.();
}

export function isOptionalFeaturesPromptDone(): boolean {
  return !!getPrefValue("optionalFeaturesPromptDone");
}

/**
 * One-shot upgrade: existing installs keep all surfaces on and skip the showcase.
 * New installs keep prefs.js defaults (Syllabus on, extras off).
 */
export function migrateOptionalFeatures(): void {
  if (getPrefValue("optionalFeaturesPromptDone")) {
    return;
  }
  const isExisting =
    Number(getPrefValue("latestTourVersion") || 0) >= 1 ||
    Number(getPrefValue("latestGalleryTourVersion") || 0) >= 1;
  if (!isExisting) {
    return;
  }
  applyOptionalFeatureChoices({
    syllabus: true,
    gallery: true,
    explorer: true,
    readingSchedule: true,
  });
}

export function refreshOptionalFeatureChrome(): void {
  chromeRefresh?.();
}

export function registerOptionalFeaturesPrefObserver(): void {
  if (prefObserverIDs.length) {
    return;
  }
  for (const key of ENABLE_PREF_KEYS) {
    const id = Zotero.Prefs.registerObserver(
      getPrefKey(key),
      () => {
        zoteroCache.invalidatePref(getPrefKey(key));
        chromeRefresh?.();
      },
      true,
    );
    prefObserverIDs.push(id);
  }
}

export function unregisterOptionalFeaturesPrefObserver(): void {
  for (const id of prefObserverIDs) {
    Zotero.Prefs.unregisterObserver(id);
  }
  prefObserverIDs = [];
}

/** Whether any items-toolbar view radio besides native Table should appear. */
export function hasAnyOptionalViewRadio(): boolean {
  return (
    isOptionalFeatureEnabled("syllabus") ||
    isOptionalFeatureEnabled("gallery") ||
    isOptionalFeatureEnabled("explorer")
  );
}

export function isViewModeFeatureEnabled(mode: string): boolean {
  if (mode === "collection") {
    return true;
  }
  if (mode === "syllabus") {
    return isOptionalFeatureEnabled("syllabus");
  }
  if (mode === "gallery") {
    return isOptionalFeatureEnabled("gallery");
  }
  if (mode === "explorer") {
    return isOptionalFeatureEnabled("explorer");
  }
  return true;
}

/** Coerce a sticky view mode to Table when that feature is disabled. */
export function coerceEnabledViewMode(mode: string): string {
  if (!isViewModeFeatureEnabled(mode)) {
    return "collection";
  }
  return mode;
}
