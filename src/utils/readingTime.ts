import { getPref } from "./prefs";

// ztoolkit is available as a global
declare const ztoolkit: ZToolkit;

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
function getPageCount(item: Zotero.Item): number | null {
  // Try numPages field first
  const numPages = item.getField("numPages");
  if (numPages) {
    const pages = parseInt(String(numPages), 10);
    if (!isNaN(pages) && pages > 0) {
      return pages;
    }
  }

  // Try pages field (e.g., "1-10" or "10")
  const pagesField = item.getField("pages");
  if (pagesField) {
    // Try to extract page count from range (e.g., "1-10" -> 10)
    const pageMatch = pagesField.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (pageMatch) {
      const startPage = parseInt(pageMatch[1], 10);
      const endPage = pageMatch[2] ? parseInt(pageMatch[2], 10) : startPage;
      if (!isNaN(startPage) && !isNaN(endPage) && endPage >= startPage) {
        return endPage - startPage + 1;
      }
    }
  }

  return null;
}

/**
 * Extract word count from PDF attachment
 * @param item - Zotero item
 * @returns Promise resolving to word count, or null if not available
 */
async function getWordCountForItem(item: Zotero.Item): Promise<number | null> {
  try {
    const attachmentText = await item.attachmentText;
    if (attachmentText) {
      const words = attachmentText
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      ztoolkit.log("Word count for item:", words, item);
      return words > 0 ? words : null;
    }
  } catch (error) {
    ztoolkit.log("Error getting word count for item:", error);
    return null;
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
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? "1 hr" : `${hours} hrs`;
  }

  if (hours === 1) {
    return `1 hr ${remainingMinutes} min`;
  }

  return `${hours} hrs ${remainingMinutes} min`;
}

/**
 * Get reading time for an item using a hybrid approach:
 * 1. Try word count from PDF if available
 * 2. Fall back to page-based estimation
 *
 * @param item - Zotero item
 * @param options - Configuration options
 * @returns Promise resolving to reading time in minutes, or null if unable to estimate
 */
export async function getReadingTime(
  item: Zotero.Item,
  options: {
    roundUp?: boolean;
  } = {},
): Promise<number | null> {
  const { roundUp = false } = options;

  // Try word count from PDF first (most accurate)
  const wordCount = await getWordCountForItem(item);
  ztoolkit.log("Word count via PDF:", wordCount, item);
  if (wordCount !== null) {
    const minutes = estimateReadingMinutes({ words: wordCount, roundUp });
    if (minutes !== null) {
      return minutes;
    }
  }

  // Fall back to page-based estimation
  const pageCount = getPageCount(item);
  if (pageCount !== null) {
    const minutes = estimateReadingMinutes({ pages: pageCount, roundUp });
    if (minutes !== null) {
      return minutes;
    }
  }

  return null;
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
  const duration = item.getField("runningTime");
  if (duration) {
    const minutes = parseInt(String(duration), 10);
    if (!isNaN(minutes) && minutes > 0) {
      return minutes;
    }
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
