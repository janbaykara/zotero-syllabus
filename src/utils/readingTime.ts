import { getPref } from "./prefs";
import { getItemField } from "./items";
import { getString } from "./locale";

// Sources:
//
// Medium — Read-time method (≈265 WPM)
// https://help.medium.com/hc/en-us/articles/214991667-Read-time
//
// Meta-analysis of adult reading speeds (≈238–260 WPM)
// https://www.sciencedirect.com/science/article/abs/pii/S0749596X19300786
//
// Wikipedia — Words per minute (reading speed overview)
// https://en.wikipedia.org/wiki/Words_per_minute
//
// Nielsen Norman Group — UX guidance on on-screen reading (~200–250 WPM)
// https://www.nngroup.com/articles/how-little-do-users-read/
//
// Wikipedia — Silent reading (typical speed ranges)
// https://en.wikipedia.org/wiki/Silent_reading
// Words per page constant (standard convention)
const WORDS_PER_PAGE = 350;
// Default words per minute (fallback if preference not set)
const DEFAULT_WPM = 230;

/**
 * Get words per minute from preferences
 */
function getWPM(): number {
  const wpm = getPref("wpm");
  return wpm ?? DEFAULT_WPM;
}

/**
 * Round to nearest 5 minutes
 */
function roundToNearest5(minutes: number): number {
  return Math.ceil(minutes / 5) * 5;
}

/**
 * Centralized reading time estimation function
 * @param options - Object with words and/or pages, and optional roundUp flag
 * @returns Estimated reading time in minutes, or null if no data
 */
function estimateReadingMinutes({
  words,
  pages,
  roundUp = false,
}: {
  words?: number | null;
  pages?: number | null;
  roundUp?: boolean;
}): number | null {
  const wpm = getWPM();

  let minutes: number | null = null;

  if (words) {
    minutes = Math.max(1, Math.round(words / wpm));
  } else if (pages) {
    minutes = Math.max(1, Math.round((pages * WORDS_PER_PAGE) / wpm));
  }

  if (minutes === null) {
    return null;
  }

  // Round up to nearest 5 minutes if requested
  if (roundUp) {
    minutes = roundToNearest5(minutes);
  }

  return minutes;
}

/**
 * Extract page count from item
 * @param item - Zotero item
 * @returns Page count, or null if not available
 */
export function getPageCount(item: Zotero.Item): number | null {
  const numPages = getItemField(item, "numPages");
  if (numPages) {
    const pages = parseInt(String(numPages), 10);
    if (!isNaN(pages) && pages > 0) {
      return pages;
    }
  }

  return pageCountFromPagesField(getItemField(item, "pages"));
}

/** "12-24", "iv, 1–200", or a single number. Prefers the last numeric range. */
export function pageCountFromPagesField(
  pagesField: string | null | undefined,
): number | null {
  const raw = String(pagesField || "").trim();
  if (!raw) {
    return null;
  }
  const ranges = [...raw.matchAll(/(\d+)\s*[-–—]\s*(\d+)/g)];
  const range = ranges[ranges.length - 1];
  if (range) {
    const startPage = parseInt(range[1], 10);
    const endPage = parseInt(range[2], 10);
    if (!isNaN(startPage) && !isNaN(endPage) && endPage >= startPage) {
      return endPage - startPage + 1;
    }
  }
  const singles = [...raw.matchAll(/\d+/g)];
  const last = singles[singles.length - 1];
  if (last) {
    const pages = parseInt(last[0], 10);
    if (!isNaN(pages) && pages > 0) {
      return pages;
    }
  }
  return null;
}

/**
 * Film/audio runningTime to minutes. "1:30:00" and "1:30" are hours:minutes,
 * not parseInt's "1".
 */
export function parseRunningTimeMinutes(
  raw: string | null | undefined,
): number | null {
  const value = String(raw || "").trim();
  if (!value) {
    return null;
  }
  const hms = value.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hms) {
    const hours = parseInt(hms[1], 10);
    const minutes = parseInt(hms[2], 10);
    const seconds = hms[3] ? parseInt(hms[3], 10) : 0;
    if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
      return null;
    }
    const total = hours * 60 + minutes + seconds / 60;
    return total > 0 ? Math.round(total) : null;
  }
  const hoursPart = value.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minutesPart = value.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/i);
  if (hoursPart || minutesPart) {
    const hours = hoursPart ? parseFloat(hoursPart[1]) : 0;
    const minutes = minutesPart ? parseFloat(minutesPart[1]) : 0;
    const total = hours * 60 + minutes;
    return total > 0 ? Math.round(total) : null;
  }
  if (/^\d+$/.test(value)) {
    const bare = parseInt(value, 10);
    return bare > 0 ? bare : null;
  }
  return null;
}

/**
 * Format reading time for display
 * @param minutes - Reading time in minutes
 * @returns Formatted string (e.g., "5 min", "1 hr 30 min", "2 hrs")
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return getString("reading-time-minutes", { args: { minutes } });
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return getString("reading-time-hours", { args: { hours } });
  }

  return getString("reading-time-hours-and-minutes", {
    args: { hours, minutes: remainingMinutes },
  });
}

/**
 * Get reading time synchronously (uses page data only, no PDF scanning)
 * Useful for column data providers that need to be fast
 *
 * @param item - Zotero item
 * @param options - Configuration options
 * @returns Reading time in minutes, or null if unable to estimate
 */
export function getReadingTimeSync(
  item: Zotero.Item,
  options: { roundUp?: boolean } = {},
): number | null {
  const { roundUp = false } = options;

  // For video, audio
  const duration = parseRunningTimeMinutes(item.getField("runningTime"));
  if (duration !== null) {
    return duration;
  }

  // Try page-based estimation (synchronous)
  const pageCount = getPageCount(item);
  if (pageCount !== null) {
    const minutes = estimateReadingMinutes({ pages: pageCount, roundUp });
    if (minutes !== null) {
      return minutes;
    }
  }

  return null;
}
