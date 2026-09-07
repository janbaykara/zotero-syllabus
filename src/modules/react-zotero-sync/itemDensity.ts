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

export function coerceItemDensity(value: unknown): ItemDensity {
  if (value === "row" || value === "standard" || value === "expanded") {
    return value;
  }
  return "expanded";
}

export function getItemDensity(): ItemDensity {
  const raw = getPrefValue("itemDensity");
  if (raw === "row" || raw === "standard" || raw === "expanded") {
    return raw;
  }
  return "expanded";
}

export function setItemDensity(density: ItemDensity): void {
  setPref("itemDensity", density);
  zoteroCache.invalidatePref(getPrefKey("itemDensity"));
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
 * One-time: users who had compactMode enabled become `standard` density.
 * Clears the legacy boolean so defaults for the new pref are not overridden again.
 */
export function migrateCompactModeToItemDensity(): void {
  try {
    const legacy = Zotero.Prefs.get(LEGACY_COMPACT_PREF, true);
    if (legacy !== true && legacy !== "true") {
      return;
    }
    setPref("itemDensity", "standard");
    zoteroCache.invalidatePref(getPrefKey("itemDensity"));
    Zotero.Prefs.clear(LEGACY_COMPACT_PREF, true);
  } catch (err) {
    ztoolkit.log("migrateCompactModeToItemDensity failed", err);
  }
}

function createItemDensityStore() {
  const prefKey = getPrefKey("itemDensity");

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
