import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";

export const MAGAZINE_TYPE_SIZES = ["small", "large"] as const;

export type MagazineTypeSize = (typeof MAGAZINE_TYPE_SIZES)[number];

const MagazineTypeSizeSchema = z.enum(MAGAZINE_TYPE_SIZES);

function prefKey() {
  return `${config.prefsPrefix}.magazineTypeSize`;
}

export function coerceMagazineTypeSize(value: unknown): MagazineTypeSize {
  const parsed = MagazineTypeSizeSchema.safeParse(value);
  return parsed.success ? parsed.data : "small";
}

export function getMagazineTypeSize(): MagazineTypeSize {
  return coerceMagazineTypeSize(getCachedPref(prefKey()));
}

export function setMagazineTypeSize(size: MagazineTypeSize): void {
  const key = prefKey();
  Zotero.Prefs.set(key, size, true);
  zoteroCache.invalidatePref(key);
}

export function useMagazineTypeSize(): [
  MagazineTypeSize,
  (size: MagazineTypeSize) => void,
] {
  const [size, setSize] = useState<MagazineTypeSize>(() =>
    getMagazineTypeSize(),
  );

  useEffect(() => {
    setSize(getMagazineTypeSize());
  }, []);

  const setTypeSize = useCallback((next: MagazineTypeSize) => {
    setSize(next);
    setMagazineTypeSize(next);
  }, []);

  return [size, setTypeSize];
}
