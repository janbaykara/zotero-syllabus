import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";

export const FURTHER_READING_SORT_MODES = ["title", "creator", "date"] as const;

export type FurtherReadingSortBy = (typeof FURTHER_READING_SORT_MODES)[number];

const FurtherReadingSortBySchema = z.enum(FURTHER_READING_SORT_MODES);
const FurtherReadingSortByMapSchema = z.record(z.string(), z.unknown());

function prefKey() {
  return `${config.prefsPrefix}.furtherReadingSort`;
}

function coerceFurtherReadingSortBy(value: unknown): FurtherReadingSortBy {
  const parsed = FurtherReadingSortBySchema.safeParse(value);
  return parsed.success ? parsed.data : "title";
}

export function getFurtherReadingSortBy(
  collectionId: number,
): FurtherReadingSortBy {
  const map = getCachedPref(prefKey(), FurtherReadingSortByMapSchema) || {};
  return coerceFurtherReadingSortBy(map[String(collectionId)]);
}

export function setFurtherReadingSortBy(
  collectionId: number,
  mode: FurtherReadingSortBy,
): void {
  const key = prefKey();
  const map = getCachedPref(key, FurtherReadingSortByMapSchema) || {};
  map[String(collectionId)] = mode;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function useFurtherReadingSortBy(
  collectionId: number,
): [FurtherReadingSortBy, (mode: FurtherReadingSortBy) => void] {
  const [mode, setMode] = useState<FurtherReadingSortBy>(() =>
    getFurtherReadingSortBy(collectionId),
  );

  useEffect(() => {
    setMode(getFurtherReadingSortBy(collectionId));
  }, [collectionId]);

  const setSortBy = useCallback(
    (next: FurtherReadingSortBy) => {
      setMode(next);
      setFurtherReadingSortBy(collectionId, next);
    },
    [collectionId],
  );

  return [mode, setSortBy];
}
