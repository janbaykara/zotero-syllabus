/**
 * Get all available CSL styles
 * @returns Array of style objects with name and url
 */
export function getAvailableStyles(): Array<{ name: string; url: string }> {
  try {
    const styles = Zotero.Styles.getVisible() as Array<{
      title?: string;
      name?: string;
      url: string;
    }>;
    return styles.map((style) => ({
      name: style.title || style.name || "Unknown Style",
      url: style.url,
    }));
  } catch (error) {
    ztoolkit.log("Error getting available styles:", error);
    return [];
  }
}

/**
 * Get the name of a CSL style from its URL
 * @param styleUrl - The style URL to get the name for
 * @returns The style name or null if not found
 */
export function getStyleName(styleUrl: string | null): string | null {
  if (!styleUrl) {
    return null;
  }

  try {
    // Try to find the style name from available styles
    const styles = Zotero.Styles.getVisible() as Array<{
      title?: string;
      name?: string;
      url: string;
    }>;
    const style = styles.find((s) => s.url === styleUrl);
    if (style) {
      return style.title || style.name || null;
    }

    // If not found in visible styles, extract from URL
    const urlMatch = styleUrl.match(/styles\/([^/]+)$/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return null;
  } catch (error) {
    ztoolkit.log("Error getting style name:", error);
    return null;
  }
}

/**
 * Get the quick copy CSL style from Zotero's export settings
 * @returns The style URL or null if not found
 */
export function getQuickCopyStyle(): string | null {
  try {
    // Get the quick copy setting from Zotero preferences
    // The preference format is typically like "bibliography=http://www.zotero.org/styles/apa"
    const quickCopySetting = Zotero.Prefs.get(
      "export.quickCopy.setting",
    ) as string;
    ztoolkit.log("getQuickCopyStyle: quickCopySetting:", quickCopySetting);
    if (!quickCopySetting) {
      return null;
    }

    // Parse the setting to extract the style URL
    // Format is typically "bibliography=http://www.zotero.org/styles/apa" or just the URL
    const match = quickCopySetting.match(/bibliography=(.+)/);
    if (match && Array.isArray(match) && match.length > 1 && match[1]) {
      return match[1];
    }

    // If it's just a URL, return it directly
    // if (quickCopySetting.startsWith("http://") || quickCopySetting.startsWith("https://")) {
    //   return quickCopySetting;
    // }

    return null;
  } catch (error) {
    ztoolkit.log("Error getting quick copy style:", error);
    return null;
  }
}

/**
 * Generate a bibliographic reference for an item using Zotero's CSL processor
 * and the user's preferred citation style (defaults to quick copy style from Settings > Export).
 * @param item - The Zotero item to generate a reference for
 * @param fallback - Whether to use fallback formatting if style generation fails
 * @param styleUrl - Optional CSL style URL to use instead of the default style
 * @returns The formatted bibliographic reference, or null if generation fails
 */
export async function generateBibliographicReference(
  item: Zotero.Item | Zotero.Item[],
  fallback = true,
  styleUrl?: string | null,
): Promise<string | null> {
  const itemArray = Array.isArray(item) ? item : [item];

  // Helper function to try generating with a specific style URL
  const tryWithStyle = async (url: string): Promise<string | null> => {
    try {
      const result = await Zotero.QuickCopy.getContentFromItems(
        itemArray,
        `bibliography=${url}`,
      );
      if (result?.text) {
        return result.text;
      }
    } catch (error) {
      ztoolkit.log(
        `Error generating bibliographic reference with style ${url}:`,
        error,
      );
    }
    return null;
  };

  // If a custom style URL is provided, try it first
  if (styleUrl) {
    const result = await tryWithStyle(styleUrl);
    if (result) {
      return result;
    }
    // If custom style fails, fallback to default style chain
    ztoolkit.log(
      `Custom CSL style ${styleUrl} failed to load, falling back to default style`,
    );
  }

  // Try to get the quick copy style from export settings
  const quickCopyStyle = getQuickCopyStyle();
  if (quickCopyStyle) {
    const result = await tryWithStyle(quickCopyStyle);
    if (result) {
      return result;
    }
  }

  // Fallback to the last visible style if quick copy style is not set or failed
  const styles = Zotero.Styles.getVisible() as Array<{ url: string }>;
  if (styles.length > 0) {
    const result = await tryWithStyle(styles[styles.length - 1].url);
    if (result) {
      return result;
    }
  }

  // If all style attempts failed, use fallback formatting if enabled
  return fallback ? generateFallbackBibliographicReference(item) : null;
}

export function generateFallbackBibliographicReference(
  item: Zotero.Item | Zotero.Item[],
): string {
  const itemArray = Array.isArray(item) ? item : [item];
  return itemArray
    .sort((a, b) =>
      a
        .getCreators()?.[0]
        ?.lastName.localeCompare(b.getCreators()?.[0]?.lastName || ""),
    )
    .map(buildFallbackBibliographicReference)
    .join("\n\n");
}

export function buildFallbackBibliographicReference(item: Zotero.Item): string {
  const author = item
    .getCreators()
    .map((creator) => creator.lastName)
    .join(", ");
  const date = item.getField("date");
  const title = item.getField("title");
  const publicationName = item.getField("publicationTitle");

  const citationParts: string[] = [];
  if (author) citationParts.push(author);
  if (date) {
    const year = date.substring(0, 4);
    if (year && year !== "0000") citationParts.push(`(${year})`);
  }
  if (title) citationParts.push(title);
  if (publicationName) citationParts.push(`In ${publicationName}`);

  // Add additional citation details
  const volume = item.getField("volume");
  const issue = item.getField("issue");
  const pages = item.getField("pages");
  const publisher = item.getField("publisher");
  const place = item.getField("place");

  if (volume) {
    citationParts.push(`Vol. ${volume}`);
    if (issue) citationParts.push(`No. ${issue}`);
  }
  if (pages) citationParts.push(`pp. ${pages}`);
  if (publisher) {
    const publisherInfo = place ? `${place}: ${publisher}` : publisher;
    citationParts.push(publisherInfo);
  }

  return citationParts.join(" ");
}
