/**
 * Generate a bibliographic reference for an item using Zotero's CSL processor
 * and the user's preferred citation style.
 * @param item - The Zotero item to generate a reference for
 * @returns The formatted bibliographic reference, or null if generation fails
 */
export async function generateBibliographicReference(
  item: Zotero.Item | Zotero.Item[],
  fallback = true,
): Promise<string | null> {
  const itemArray = Array.isArray(item) ? item : [item];
  try {
    const styles = Zotero.Styles.getVisible();
    const style = styles[styles.length - 1];
    const result = await Zotero.QuickCopy.getContentFromItems(
      itemArray,
      // format,
      `bibliography=${style.url}`,
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
