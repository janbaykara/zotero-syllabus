/**
 * Soft integration with paulMrG2/zotero-highlight-descriptions.
 * Reads that plugin's colour-label prefs when installed; otherwise returns null.
 *
 * Pref contract:
 * https://github.com/paulMrG2/zotero-highlight-descriptions
 */
import { getCachedPref } from "../utils/cache";
import { parseAnnotationColorHex } from "../utils/annotationColors";

const PREF_PREFIX = "extensions.highlightdescriptions";

/** HD uses "-" as the gray default; treat that and blanks as no label. */
function normalizeDescription(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") {
    return null;
  }
  return trimmed;
}

/**
 * Highlight Descriptions label for a highlight colour, or null when the
 * plugin is not installed / the colour has no useful label.
 */
export function getHighlightColorDescription(hex: string): string | null {
  const normalized = parseAnnotationColorHex(hex);
  if (!normalized) {
    return null;
  }
  const key = `${PREF_PREFIX}.color_${normalized.slice(1)}`;
  return normalizeDescription(getCachedPref(key));
}

/** True when at least one colour has a usable HD label (show named swatch UI). */
export function anyHighlightColorDescriptions(
  hexes: readonly string[],
): boolean {
  return hexes.some((hex) => getHighlightColorDescription(hex) != null);
}
