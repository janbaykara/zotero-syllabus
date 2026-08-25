import { useMemo } from "preact/hooks";
import { sortItemsByTitle } from "../utils/items";

export type TagGroup = {
  tag: string;
  items: Zotero.Item[];
};

/**
 * Group collection items by Zotero tags. An item appears under every tag it has.
 */
export function useCollectionTagGroups(
  syllabusItems: {
    zoteroItem: Zotero.Item;
    assignments: unknown[];
  }[],
) {
  return useMemo(() => {
    const itemsByTag: Map<string, Zotero.Item[]> = new Map();
    const untaggedItems: Zotero.Item[] = [];

    for (const { zoteroItem: item } of syllabusItems) {
      if (!item.isRegularItem()) continue;

      const tags = item.getTags();
      if (!tags.length) {
        untaggedItems.push(item);
        continue;
      }

      for (const { tag } of tags) {
        if (!tag) continue;
        if (!itemsByTag.has(tag)) {
          itemsByTag.set(tag, []);
        }
        itemsByTag.get(tag)!.push(item);
      }
    }

    const tagGroups: TagGroup[] = Array.from(itemsByTag.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, items]) => ({
        tag,
        items: sortItemsByTitle(items),
      }));

    return {
      tagGroups,
      untaggedItems: sortItemsByTitle(untaggedItems),
    };
  }, [syllabusItems]);
}
