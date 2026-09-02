import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";
import { getPref, getPrefKey, setPref } from "../utils/prefs";
import type { GalleryGlobalSetting } from "./galleryLayout";

export const MAGAZINE_TYPE_SIZES = ["small", "large"] as const;

export type MagazineTypeSize = (typeof MAGAZINE_TYPE_SIZES)[number];

const MagazineTypeSizeSchema = z.enum(MAGAZINE_TYPE_SIZES);
const MagazineTypeSizeMapSchema = z.record(z.string(), z.unknown());

function globalPrefKey() {
  return getPrefKey("magazineTypeSize");
}

function viewPrefKey() {
  return `${config.prefsPrefix}.galleryTypeSize`;
}

export function coerceMagazineTypeSize(value: unknown): MagazineTypeSize {
  const parsed = MagazineTypeSizeSchema.safeParse(value);
  return parsed.success ? parsed.data : "small";
}

export function getDefaultMagazineTypeSize(): MagazineTypeSize {
  return coerceMagazineTypeSize(getPref("magazineTypeSize"));
}

export function setDefaultMagazineTypeSize(size: MagazineTypeSize): void {
  setPref("magazineTypeSize", size);
  zoteroCache.invalidatePref(globalPrefKey());
}

export function getMagazineTypeSize(
  viewKey: string | number,
): MagazineTypeSize {
  const map = getCachedPref(viewPrefKey(), MagazineTypeSizeMapSchema) || {};
  const key = String(viewKey);
  if (!(key in map)) {
    return getDefaultMagazineTypeSize();
  }
  return coerceMagazineTypeSize(map[key]);
}

export function setMagazineTypeSize(
  viewKey: string | number,
  size: MagazineTypeSize,
): void {
  const key = viewPrefKey();
  const map = getCachedPref(key, MagazineTypeSizeMapSchema) || {};
  map[String(viewKey)] = size;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function saveMagazineTypeSizeGlobally(
  viewKey: string | number,
  size: MagazineTypeSize,
): void {
  setDefaultMagazineTypeSize(size);
  setMagazineTypeSize(viewKey, size);
}

export function useMagazineTypeSize(
  viewKey: string | number,
): [
  MagazineTypeSize,
  (size: MagazineTypeSize) => void,
  GalleryGlobalSetting<MagazineTypeSize>,
] {
  const [size, setSize] = useState<MagazineTypeSize>(() =>
    getMagazineTypeSize(viewKey),
  );
  const [globalValue, setGlobalValue] = useState<MagazineTypeSize>(() =>
    getDefaultMagazineTypeSize(),
  );

  useEffect(() => {
    const refresh = () => {
      setSize(getMagazineTypeSize(viewKey));
      setGlobalValue(getDefaultMagazineTypeSize());
    };
    refresh();
    const observerIDs = [
      Zotero.Prefs.registerObserver(viewPrefKey(), refresh, true),
      Zotero.Prefs.registerObserver(globalPrefKey(), refresh, true),
    ];
    return () => {
      for (const observerID of observerIDs) {
        Zotero.Prefs.unregisterObserver(observerID);
      }
    };
  }, [viewKey]);

  const setTypeSize = useCallback(
    (next: MagazineTypeSize) => {
      setSize(next);
      setMagazineTypeSize(viewKey, next);
    },
    [viewKey],
  );

  const saveGlobally = useCallback(() => {
    saveMagazineTypeSizeGlobally(viewKey, size);
    setGlobalValue(size);
  }, [size, viewKey]);

  return [
    size,
    setTypeSize,
    { isCustom: size !== globalValue, saveGlobally, globalValue },
  ];
}
