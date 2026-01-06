/**
 * Get the quick copy CSL style from Zotero's export settings
 * @returns The style URL or null if not found
 */
function getQuickCopyStyle(): string | null {
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
 * @returns The formatted bibliographic reference, or null if generation fails
 */
export async function generateBibliographicReference(
  item: Zotero.Item | Zotero.Item[],
  fallback = true,
): Promise<string | null> {
  const itemArray = Array.isArray(item) ? item : [item];
  try {
    // Try to get the quick copy style from export settings first
    let styleUrl: string | null = getQuickCopyStyle();

    // Fallback to the last visible style if quick copy style is not set
    if (!styleUrl) {
      const styles = Zotero.Styles.getVisible();
      if (styles.length > 0) {
        styleUrl = styles[styles.length - 1].url;
      }
    }

    if (!styleUrl) {
      throw new Error("No style available");
    }

    const result = await Zotero.QuickCopy.getContentFromItems(
      itemArray,
      `bibliography=${styleUrl}`,
    );
    if (result?.text) {
      return result.text;
    }
  } catch (error) {
    ztoolkit.log("Error generating bibliographic reference:", error);
  }

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
