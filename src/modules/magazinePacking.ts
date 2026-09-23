import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";
import { getPref, getPrefKey, setPref } from "../utils/prefs";
import type { GalleryGlobalSetting } from "./galleryLayout";

/** Gallery / Reading Schedule Magazine packing (not Home shelves). */
export const MAGAZINE_PACKINGS = ["vertical", "grid", "packed"] as const;

export type MagazinePacking = (typeof MAGAZINE_PACKINGS)[number];

const MagazinePackingSchema = z.enum(MAGAZINE_PACKINGS);
const MagazinePackingMapSchema = z.record(z.string(), z.unknown());

function globalPrefKey() {
  return getPrefKey("magazinePacking");
}

function viewPrefKey() {
  return `${config.prefsPrefix}.galleryPacking`;
}

export function coerceMagazinePacking(value: unknown): MagazinePacking {
  const parsed = MagazinePackingSchema.safeParse(value);
  return parsed.success ? parsed.data : "packed";
}

export function getDefaultMagazinePacking(): MagazinePacking {
  return coerceMagazinePacking(getPref("magazinePacking"));
}

export function setDefaultMagazinePacking(packing: MagazinePacking): void {
  setPref("magazinePacking", packing);
  zoteroCache.invalidatePref(globalPrefKey());
}

export function getMagazinePacking(viewKey: string | number): MagazinePacking {
  const map = getCachedPref(viewPrefKey(), MagazinePackingMapSchema) || {};
  const key = String(viewKey);
  if (!(key in map)) {
    return getDefaultMagazinePacking();
  }
  return coerceMagazinePacking(map[key]);
}

export function setMagazinePacking(
  viewKey: string | number,
  packing: MagazinePacking,
): void {
  const key = viewPrefKey();
  const map = getCachedPref(key, MagazinePackingMapSchema) || {};
  map[String(viewKey)] = packing;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function saveMagazinePackingGlobally(
  viewKey: string | number,
  packing: MagazinePacking,
): void {
  setDefaultMagazinePacking(packing);
  setMagazinePacking(viewKey, packing);
}

export function useMagazinePacking(
  viewKey: string | number,
): [
  MagazinePacking,
  (packing: MagazinePacking) => void,
  GalleryGlobalSetting<MagazinePacking>,
] {
  const [packing, setPacking] = useState<MagazinePacking>(() =>
    getMagazinePacking(viewKey),
  );
  const [globalValue, setGlobalValue] = useState<MagazinePacking>(() =>
    getDefaultMagazinePacking(),
  );

  useEffect(() => {
    const refresh = () => {
      setPacking(getMagazinePacking(viewKey));
      setGlobalValue(getDefaultMagazinePacking());
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

  const setPackingMode = useCallback(
    (next: MagazinePacking) => {
      setPacking(next);
      setMagazinePacking(viewKey, next);
    },
    [viewKey],
  );

  const saveGlobally = useCallback(() => {
    saveMagazinePackingGlobally(viewKey, packing);
    setGlobalValue(packing);
  }, [packing, viewKey]);

  return [
    packing,
    setPackingMode,
    { isCustom: packing !== globalValue, saveGlobally, globalValue },
  ];
}
