/**
 * CSS URL helpers with cache-busting.
 * Hash comes from the build (cssHash.generated.ts) — never sync-XHR chrome://
 * at startup; that aborted onMainWindowLoad when the request threw.
 */

import { CSS_HASH } from "./cssHash.generated";

/**
 * Cache-busting hash for Tailwind CSS, or null if the build omitted one.
 */
export function getCSSHash(): string | null {
  return CSS_HASH || null;
}

/**
 * Gets the CSS URL with cache-busting hash
 */
export function getCSSUrl(): string {
  const hash = getCSSHash();
  const baseUrl = `chrome://${addon.data.config.addonRef}/content/tailwind.css`;

  if (hash) {
    return `${baseUrl}?v=${hash}`;
  }

  // Fallback when the generated module is empty (should not happen after build)
  return `${baseUrl}?v=${Date.now()}`;
}
