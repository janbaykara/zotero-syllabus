import { useMemo } from "preact/hooks";
import { getItemPrimaryCreatorName } from "../utils/items";
import { compareLocale } from "../utils/locale";

export type CreatorGroup = {
  key: string;
  label: string;
  items: Zotero.Item[];
};

/**
 * Group items by first creator. Groups are ordered A–Z; items with no creator
 * are returned separately.
 */
export function groupItemsByCreator(items: Zotero.Item[]): {
  creatorGroups: CreatorGroup[];
  uncreditedItems: Zotero.Item[];
} {
  const itemsByCreator: Map<string, CreatorGroup> = new Map();
  const uncreditedItems: Zotero.Item[] = [];

  for (const item of items) {
    if (!item.isRegularItem()) continue;
    const creator = getItemPrimaryCreatorName(item);
    if (!creator) {
      uncreditedItems.push(item);
      continue;
    }
    const existing = itemsByCreator.get(creator.sortKey);
    if (existing) {
      existing.items.push(item);
    } else {
      itemsByCreator.set(creator.sortKey, {
        key: creator.sortKey,
        label: creator.label,
        items: [item],
      });
    }
  }

  const creatorGroups = Array.from(itemsByCreator.values()).sort((a, b) =>
    compareLocale(a.key, b.key),
  );

  return { creatorGroups, uncreditedItems };
}

export function useCollectionCreatorGroups(
  syllabusItems: {
    zoteroItem: Zotero.Item;
    assignments: unknown[];
  }[],
) {
  return useMemo(
    () =>
      groupItemsByCreator(syllabusItems.map(({ zoteroItem }) => zoteroItem)),
    [syllabusItems],
  );
}
