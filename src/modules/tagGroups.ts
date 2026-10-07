import { useMemo } from "preact/hooks";
import { compareLocale } from "../utils/locale";
import { isGalleryNoteTag } from "./galleryNote";
import {
  INTENTION_NOTE_TAG,
  PINNED_COLLECTION_TAG,
  PINNED_TAG,
} from "./pinned";
import { PERSONAL_READING_ORDER_NOTE_TAG } from "./personalReadingOrder";
import { SYLLABUS_NOTE_TAG } from "./syllabusNote";

export type TagGroup = {
  tag: string;
  items: Zotero.Item[];
};

/** Exact plugin-owned tags that must never appear as group-by buckets. */
const PLUGIN_OWNED_TAGS = new Set([
  SYLLABUS_NOTE_TAG,
  PERSONAL_READING_ORDER_NOTE_TAG,
  PINNED_TAG,
  INTENTION_NOTE_TAG,
  PINNED_COLLECTION_TAG,
]);

/** Zotero automatic tags (keywords / subject headings) use type 1. */
export function isAutomaticTag(tag: { type?: number }): boolean {
  return Number(tag.type) === 1;
}

/** Tags owned by Zotero Syllabus (stored identifiers — do not localize). */
export function isPluginOwnedTag(tag: string): boolean {
  return PLUGIN_OWNED_TAGS.has(tag) || isGalleryNoteTag(tag);
}

export type GroupItemsByTagsOptions = {
  includeAutomaticTags?: boolean;
};

/**
 * Group regular items by Zotero tags. An item appears under every tag it has.
 * Plugin-owned tags are always ignored. When `includeAutomaticTags` is false
 * (default), type-1 tags are ignored too; items left with no tags go to
 * `untaggedItems`.
 */
export function groupItemsByTags(
  items: Zotero.Item[],
  options: GroupItemsByTagsOptions = {},
): { tagGroups: TagGroup[]; untaggedItems: Zotero.Item[] } {
  const includeAutomaticTags = options.includeAutomaticTags ?? false;
  const itemsByTag: Map<string, Zotero.Item[]> = new Map();
  const untaggedItems: Zotero.Item[] = [];

  for (const item of items) {
    if (!item.isRegularItem()) continue;

    const tags = item.getTags().filter((entry) => {
      if (!entry.tag) return false;
      if (isPluginOwnedTag(entry.tag)) return false;
      if (!includeAutomaticTags && isAutomaticTag(entry)) return false;
      return true;
    });

    if (!tags.length) {
      untaggedItems.push(item);
      continue;
    }

    for (const { tag } of tags) {
      if (!itemsByTag.has(tag)) {
        itemsByTag.set(tag, []);
      }
      itemsByTag.get(tag)!.push(item);
    }
  }

  const tagGroups: TagGroup[] = Array.from(itemsByTag.entries())
    .sort(([a], [b]) => compareLocale(a, b))
    .map(([tag, groupItems]) => ({
      tag,
      items: groupItems,
    }));

  return { tagGroups, untaggedItems };
}

/**
 * Group collection items by Zotero tags. An item appears under every tag it has.
 */
export function useCollectionTagGroups(
  syllabusItems: {
    zoteroItem: Zotero.Item;
    assignments: unknown[];
  }[],
  includeAutomaticTags = false,
) {
  return useMemo(
    () =>
      groupItemsByTags(
        syllabusItems.map(({ zoteroItem }) => zoteroItem),
        { includeAutomaticTags },
      ),
    [syllabusItems, includeAutomaticTags],
  );
}
