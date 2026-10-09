import type {
  ShareGalleryGroupBy,
  ShareGallerySortBy,
  ShareItem,
  ShareTag,
} from "./types";

/** Normalize tags from share.json (string[] legacy or ShareTag[]). */
export function normalizeShareTags(
  tags: ShareItem["tags"] | string[] | undefined,
): ShareTag[] {
  if (!tags?.length) return [];
  return (tags as (ShareTag | string)[]).map((entry) =>
    typeof entry === "string" ? { tag: entry } : entry,
  );
}

function yearFromDate(date: string): number {
  const m = /(\d{4})/.exec(date || "");
  return m ? Number(m[1]) : 0;
}

export function sortShareItems(
  items: ShareItem[],
  sortBy: ShareGallerySortBy,
  personalOrder: string[],
): ShareItem[] {
  const byKey = new Map(items.map((i) => [i.key, i]));
  if (sortBy === "personalOrder" && personalOrder.length) {
    const ordered: ShareItem[] = [];
    const seen = new Set<string>();
    for (const key of personalOrder) {
      const item = byKey.get(key);
      if (item) {
        ordered.push(item);
        seen.add(key);
      }
    }
    const rest = items
      .filter((i) => !seen.has(i.key))
      .sort((a, b) => a.title.localeCompare(b.title));
    return [...ordered, ...rest];
  }

  const copy = [...items];
  copy.sort((a, b) => {
    if (sortBy === "date") {
      return (
        yearFromDate(b.date) - yearFromDate(a.date) ||
        a.title.localeCompare(b.title)
      );
    }
    if (sortBy === "dateAdded") {
      return (
        (b.dateAdded || "").localeCompare(a.dateAdded || "") ||
        a.title.localeCompare(b.title)
      );
    }
    return a.title.localeCompare(b.title);
  });
  return copy;
}

export type ShareGroup = {
  id: string;
  label: string;
  items: ShareItem[];
  /** Zotero item-type id when grouping by type (for heading icons). */
  itemType?: string;
};

export function groupShareItems(
  items: ShareItem[],
  groupBy: ShareGalleryGroupBy,
  opts?: { includeAutomaticTags?: boolean },
): ShareGroup[] {
  if (
    groupBy === "none" ||
    groupBy === "auto" ||
    groupBy === "subcollections"
  ) {
    return [{ id: "all", label: "", items }];
  }

  const includeAutomaticTags = opts?.includeAutomaticTags ?? false;
  const map = new Map<string, ShareItem[]>();
  const push = (key: string, item: ShareItem) => {
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  };

  for (const item of items) {
    if (groupBy === "type") {
      // Key by machine itemType so we can resolve itemTypeIcons.
      push(item.itemType || "document", item);
    } else if (groupBy === "creator") {
      push(item.creators || "—", item);
    } else if (groupBy === "tags") {
      const tags = normalizeShareTags(item.tags).filter(
        (t) => includeAutomaticTags || !t.automatic,
      );
      if (!tags.length) {
        push("—", item);
        continue;
      }
      for (const { tag } of tags) {
        push(tag, item);
      }
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => {
      if (groupBy === "type") {
        const labelA = map.get(a)?.[0]?.itemTypeLabel || a;
        const labelB = map.get(b)?.[0]?.itemTypeLabel || b;
        return labelA.localeCompare(labelB);
      }
      return a.localeCompare(b);
    })
    .map(([key, groupItems]) => {
      if (groupBy === "type") {
        return {
          id: `type-${key}`,
          label: groupItems[0]?.itemTypeLabel || key,
          itemType: key,
          items: groupItems,
        };
      }
      return {
        id: key,
        label: key,
        items: groupItems,
      };
    });
}

export function personalOrderZones(
  items: ShareItem[],
  personalOrder: string[],
  unorderedLabel: string,
): ShareGroup[] {
  const byKey = new Map(items.map((i) => [i.key, i]));
  const ordered: ShareItem[] = [];
  const seen = new Set<string>();
  for (const key of personalOrder) {
    const item = byKey.get(key);
    if (item) {
      ordered.push(item);
      seen.add(key);
    }
  }
  const rest = items
    .filter((i) => !seen.has(i.key))
    .sort((a, b) => a.title.localeCompare(b.title));
  const groups: ShareGroup[] = [];
  if (ordered.length) {
    groups.push({ id: "ordered", label: "", items: ordered });
  }
  if (rest.length) {
    groups.push({ id: "unordered", label: unorderedLabel, items: rest });
  }
  if (!groups.length) {
    groups.push({ id: "all", label: "", items: [] });
  }
  return groups;
}
