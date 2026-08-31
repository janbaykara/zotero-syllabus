import { useMemo } from "preact/hooks";
import { compareLocale } from "../utils/locale";

export type ItemTypeGroup = {
  itemType: string;
  label: string;
  items: Zotero.Item[];
};

/** Irregular plurals for localized (usually English) item-type labels. */
const IRREGULAR_TYPE_PLURALS: Record<string, string> = {
  Thesis: "Theses",
  Series: "Series",
};

function pluralizeWord(word: string): string {
  const irregular = IRREGULAR_TYPE_PLURALS[word];
  if (irregular) {
    return irregular;
  }
  if (/thesis$/i.test(word)) {
    return word.replace(/thesis$/i, (m) =>
      m[0] === "T" ? "Theses" : "theses",
    );
  }
  if (/[^aeiou]y$/i.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }
  if (/(?:s|x|z|ch|sh)$/i.test(word)) {
    return `${word}es`;
  }
  return `${word}s`;
}

function pluralizeItemTypeLabel(singular: string): string {
  if (IRREGULAR_TYPE_PLURALS[singular]) {
    return IRREGULAR_TYPE_PLURALS[singular];
  }
  const parts = singular.trim().split(/\s+/);
  if (parts.length === 0) {
    return singular;
  }
  parts[parts.length - 1] = pluralizeWord(parts[parts.length - 1]);
  return parts.join(" ");
}

function localizedItemTypePlural(itemType: string): string {
  try {
    const singular = Zotero.ItemTypes.getLocalizedString(itemType) || itemType;
    return pluralizeItemTypeLabel(singular);
  } catch {
    return pluralizeItemTypeLabel(itemType);
  }
}

/**
 * Group collection items by Zotero item type (Books, Reports, Web Pages, …).
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
        label: localizedItemTypePlural(itemType),
        items,
      }))
      .sort((a, b) => compareLocale(a.label, b.label));

    return { typeGroups };
  }, [syllabusItems]);
}
