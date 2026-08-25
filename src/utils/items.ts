export function sortItemsByTitle(items: Zotero.Item[]): Zotero.Item[] {
  return [...items].sort((a, b) => {
    const titleA = a.getField("title") || "";
    const titleB = b.getField("title") || "";
    return titleA.localeCompare(titleB);
  });
}
