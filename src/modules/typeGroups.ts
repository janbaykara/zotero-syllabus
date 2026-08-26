import { useMemo } from "preact/hooks";

export type ItemTypeGroup = {
  itemType: string;
  label: string;
  items: Zotero.Item[];
};

function localizedItemType(itemType: string): string {
  try {
    return Zotero.ItemTypes.getLocalizedString(itemType) || itemType;
  } catch {
    return itemType;
  }
}

/**
 * Group collection items by Zotero item type (Book, Report, Webpage, …).
 */
export function useCollectionItemTypeGroups(
  syllabusItems: {
    zoteroItem: Zotero.Item;
    assignments: unknown[];
  }[],
) {
  return useMemo(() => {
    const itemsByType: Map<string, Zotero.Item[]> = new Map();

    for (const { zoteroItem: item } of syllabusItems) {
      if (!item.isRegularItem()) continue;
      const itemType = item.itemType || "unknown";
      if (!itemsByType.has(itemType)) {
        itemsByType.set(itemType, []);
      }
      itemsByType.get(itemType)!.push(item);
    }

    const typeGroups: ItemTypeGroup[] = Array.from(itemsByType.entries())
      .map(([itemType, items]) => ({
        itemType,
        label: localizedItemType(itemType),
        items,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { typeGroups };
  }, [syllabusItems]);
}
