import { normalizeHighlightColor } from "./itemHighlights";

/**
 * Zotero reader palette order. Used only to sort known hues first when
 * building the live filter list from colours that actually exist.
 */
export const ZOTERO_ANNOTATION_COLOR_ORDER = [
  "#ffd400",
  "#ff6666",
  "#5fb236",
  "#2ea8e5",
  "#a28ae5",
  "#e56eee",
  "#f19837",
  "#aaaaaa",
] as const;

/** Older named prefs (`yellow,red`) map onto hex. */
const LEGACY_COLOR_IDS: Record<string, string> = {
  yellow: "#ffd400",
  "light-yellow": "#f8c449",
  red: "#ff6666",
  green: "#5fb236",
  blue: "#2ea8e5",
  purple: "#a28ae5",
  magenta: "#e56eee",
  orange: "#f19837",
  gray: "#aaaaaa",
};

const HEX6 = /^#[0-9a-f]{6}$/;
const HEX3 = /^#[0-9a-f]{3}$/;

export function parseAnnotationColorHex(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw) {
    return null;
  }
  if (HEX6.test(raw)) {
    return raw;
  }
  if (HEX3.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return LEGACY_COLOR_IDS[raw] ?? null;
}

/** Empty list = no filter (show every colour). */
export function parseAnnotationColorFilter(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  const seen = new Set<string>();
  const hexes: string[] = [];
  for (const part of value.split(",")) {
    const hex = parseAnnotationColorHex(part);
    if (!hex || seen.has(hex)) {
      continue;
    }
    seen.add(hex);
    hexes.push(hex);
  }
  return hexes;
}

export function serializeAnnotationColorFilter(
  hexes: readonly string[],
): string {
  return parseAnnotationColorFilter(hexes.join(",")).join(",");
}

/** Per-surface map (`feed`, `explorer`, gallery `viewKey`). Legacy CSV is feed-only. */
export function annotationColorFilterFromMap(
  map: Record<string, unknown> | null | undefined,
  scope: string,
  legacyFeed?: unknown,
): string[] {
  const key = String(scope);
  if (!key) {
    return [];
  }
  if (map && Object.prototype.hasOwnProperty.call(map, key)) {
    return parseAnnotationColorFilter(map[key]);
  }
  if (key === "feed") {
    return parseAnnotationColorFilter(legacyFeed);
  }
  return [];
}

export function toggleAnnotationColorFilter(
  selected: readonly string[],
  hex: string,
): string[] {
  const next = parseAnnotationColorHex(hex);
  if (!next) {
    return [...selected];
  }
  if (selected.includes(next)) {
    return selected.filter((color) => color !== next);
  }
  return [...selected, next];
}

export function annotationMatchesColorFilter(
  color: string,
  selected: readonly string[],
): boolean {
  if (selected.length === 0) {
    return true;
  }
  return selected.includes(normalizeHighlightColor(color));
}

/** Unique hexes, Zotero palette first, then first-seen order. */
export function collectAnnotationColors(colors: readonly string[]): string[] {
  const present = new Set<string>();
  const extras: string[] = [];
  for (const raw of colors) {
    const hex = normalizeHighlightColor(raw);
    if (present.has(hex)) {
      continue;
    }
    present.add(hex);
    extras.push(hex);
  }
  const ordered: string[] = [];
  for (const hex of ZOTERO_ANNOTATION_COLOR_ORDER) {
    if (present.has(hex)) {
      ordered.push(hex);
    }
  }
  for (const hex of extras) {
    if (!ordered.includes(hex)) {
      ordered.push(hex);
    }
  }
  return ordered;
}

/** Dark check/mark on light swatches so the selected state stays readable. */
export function annotationSwatchUsesDarkMark(hex: string): boolean {
  const n = parseAnnotationColorHex(hex) || normalizeHighlightColor(hex);
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return r * 299 + g * 587 + b * 114 >= 160_000;
}
