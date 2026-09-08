import { useCallback, useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";
import { config } from "../../../package.json";
import { zoteroCache } from "../../utils/cache";
import { getPrefKey, getPrefValue, setPref } from "../../utils/prefs";

export const ITEM_DENSITIES = ["row", "standard", "expanded"] as const;

export type ItemDensity = (typeof ITEM_DENSITIES)[number];

/** Each click compresses; wrap from row back to expanded. */
export const ITEM_DENSITY_CYCLE: ItemDensity[] = [
  "expanded",
  "standard",
  "row",
];

const LEGACY_COMPACT_PREF = `${config.prefsPrefix}.compactMode`;
const LEGACY_ITEM_DENSITY_PREF = `${config.prefsPrefix}.itemDensity`;

export function coerceItemDensity(value: unknown): ItemDensity {
  if (value === "row" || value === "standard" || value === "expanded") {
    return value;
  }
  return "expanded";
}

export function getItemDensity(): ItemDensity {
  return coerceItemDensity(getPrefValue("defaultItemDensity"));
}

export function setItemDensity(density: ItemDensity): void {
  setPref("defaultItemDensity", density);
  zoteroCache.invalidatePref(getPrefKey("defaultItemDensity"));
}

export function nextItemDensity(current: ItemDensity): ItemDensity {
  const index = ITEM_DENSITY_CYCLE.indexOf(current);
  const from = index >= 0 ? index : 0;
  return ITEM_DENSITY_CYCLE[(from + 1) % ITEM_DENSITY_CYCLE.length];
}

export function cycleItemDensity(): ItemDensity {
  const next = nextItemDensity(getItemDensity());
  setItemDensity(next);
  return next;
}

/** Dense layouts (not the large expanded cards). */
export function isDenseDensity(density: ItemDensity): boolean {
  return density !== "expanded";
}

/**
 * One-time: migrate legacy prefs into `defaultItemDensity`.
 * - plain `itemDensity` string → same value on the new key
 * - `compactMode=true` → `standard` (pre-density installs)
 */
export function migrateCompactModeToItemDensity(): void {
  try {
    const legacyDensity = Zotero.Prefs.get(LEGACY_ITEM_DENSITY_PREF, true);
    if (
      legacyDensity === "row" ||
      legacyDensity === "standard" ||
      legacyDensity === "expanded"
    ) {
      setItemDensity(legacyDensity);
    } else {
      const legacyCompact = Zotero.Prefs.get(LEGACY_COMPACT_PREF, true);
      if (legacyCompact === true || legacyCompact === "true") {
        setItemDensity("standard");
      }
    }

    try {
      Zotero.Prefs.clear(LEGACY_ITEM_DENSITY_PREF, true);
    } catch {
      /* ignore */
    }
    try {
      Zotero.Prefs.clear(LEGACY_COMPACT_PREF, true);
    } catch {
      /* ignore */
    }
  } catch (err) {
    ztoolkit.log("migrateCompactModeToItemDensity failed", err);
  }
}

function createItemDensityStore() {
  const prefKey = getPrefKey("defaultItemDensity");

  function getSnapshot() {
    return getItemDensity();
  }

  function subscribe(onStoreChange: () => void) {
    const observerID = Zotero.Prefs.registerObserver(
      prefKey,
      () => {
        onStoreChange();
      },
      true,
    );

    return () => {
      Zotero.Prefs.unregisterObserver(observerID);
    };
  }

  return { getSnapshot, subscribe };
}

export function useZoteroItemDensity() {
  const store = useMemo(() => createItemDensityStore(), []);
  const density = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const setDensity = useCallback((next: ItemDensity) => {
    setItemDensity(next);
  }, []);

  const cycleDensity = useCallback(() => {
    return cycleItemDensity();
  }, []);

  return [density, setDensity, cycleDensity] as const;
}
