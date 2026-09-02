import { useCallback, useEffect, useState } from "preact/hooks";
import * as z from "zod";
import { config } from "../../package.json";
import { getCachedPref, zoteroCache } from "../utils/cache";

export const GALLERY_LAYOUT_MODES = ["cover", "card"] as const;

export type GalleryLayout = (typeof GALLERY_LAYOUT_MODES)[number];

const GalleryLayoutSchema = z.enum(GALLERY_LAYOUT_MODES);
const GalleryLayoutMapSchema = z.record(z.string(), z.unknown());

function prefKey() {
  return `${config.prefsPrefix}.galleryLayout`;
}

function coerceGalleryLayout(value: unknown): GalleryLayout {
  const parsed = GalleryLayoutSchema.safeParse(value);
  return parsed.success ? parsed.data : "cover";
}

export function getGalleryLayout(viewKey: string | number): GalleryLayout {
  const map = getCachedPref(prefKey(), GalleryLayoutMapSchema) || {};
  return coerceGalleryLayout(map[String(viewKey)]);
}

export function setGalleryLayout(
  viewKey: string | number,
  mode: GalleryLayout,
): void {
  const key = prefKey();
  const map = getCachedPref(key, GalleryLayoutMapSchema) || {};
  map[String(viewKey)] = mode;
  Zotero.Prefs.set(key, JSON.stringify(map), true);
  zoteroCache.invalidatePref(key);
}

export function useGalleryLayout(
  viewKey: string | number,
): [GalleryLayout, (mode: GalleryLayout) => void] {
  const [mode, setMode] = useState<GalleryLayout>(() =>
    getGalleryLayout(viewKey),
  );

  useEffect(() => {
    setMode(getGalleryLayout(viewKey));
  }, [viewKey]);

  const setLayout = useCallback(
    (next: GalleryLayout) => {
      setMode(next);
      setGalleryLayout(viewKey, next);
    },
    [viewKey],
  );

  return [mode, setLayout];
}
