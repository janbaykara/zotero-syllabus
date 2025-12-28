/**
 * Utility functions for CSS management and cache busting
 */

/**
 * Reads the CSS hash from the hash file
 * @returns The CSS hash string, or null if not found
 */
export function getCSSHash(): string | null {
  try {
    const hashUrl = `chrome://${addon.data.config.addonRef}/content/tailwind-hash.json`;

    // Use XMLHttpRequest to read the JSON file synchronously
    const xhr = new XMLHttpRequest();
    xhr.open("GET", hashUrl, false); // synchronous
    xhr.send(null);

    if (xhr.status === 200 || xhr.status === 0) {
      const data = JSON.parse(xhr.responseText);
      return data.hash || data.version || null;
    }
  } catch (e) {
    ztoolkit.log("Error reading CSS hash:", e);
  }

  return null;
}

/**
 * Gets the CSS URL with cache-busting hash
 * @returns The CSS URL with query parameter hash
 */
export function getCSSUrl(): string {
  const hash = getCSSHash();
  const baseUrl = `chrome://${addon.data.config.addonRef}/content/tailwind.css`;

  if (hash) {
    return `${baseUrl}?v=${hash}`;
  }

  // Fallback: use timestamp if hash file not found (development edge case)
  // In production, the hash file should always exist after build
  return `${baseUrl}?v=${Date.now()}`;
}
