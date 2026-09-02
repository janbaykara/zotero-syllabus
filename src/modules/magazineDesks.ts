import { isAudioGalleryItem, isVideoGalleryItem } from "../utils/itemCover";

export type MagazineSectionTemplate = "lead" | "essay" | "strip";

export type MagazineMediaFeatures = {
  id: number;
  dateAdded: string;
  isVideo: boolean;
  isAudio: boolean;
};

export type MagazineDeskInput = {
  id: string;
  title: string;
  itemIds: number[];
};

export const MAGAZINE_SHELF_LIMIT = 10;
export const MAGAZINE_DESK_MAX = 4;
export const MAGAZINE_DESK_MIN_ITEMS = 2;

const SECTION_CYCLE: MagazineSectionTemplate[] = ["lead", "essay", "strip"];

export function magazineSectionTemplate(
  index: number,
): MagazineSectionTemplate {
  return SECTION_CYCLE[((index % 3) + 3) % 3];
}

function dateAddedMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function pickRecentMediaIds(
  items: MagazineMediaFeatures[],
  kind: "video" | "audio",
  limit = MAGAZINE_SHELF_LIMIT,
): number[] {
  return [...items]
    .filter((item) => (kind === "video" ? item.isVideo : item.isAudio))
    .sort(
      (a, b) =>
        dateAddedMs(b.dateAdded) - dateAddedMs(a.dateAdded) || a.id - b.id,
    )
    .slice(0, limit)
    .map((item) => item.id);
}

export function mediaFeaturesFromItem(
  item: Zotero.Item,
): MagazineMediaFeatures {
  let dateAdded = "";
  try {
    dateAdded = String(item.dateAdded || "");
  } catch {
    dateAdded = "";
  }
  return {
    id: item.id,
    dateAdded,
    isVideo: isVideoGalleryItem(item),
    isAudio: isAudioGalleryItem(item),
  };
}

export function pickRecentMediaItems(
  items: Zotero.Item[],
  kind: "video" | "audio",
  limit = MAGAZINE_SHELF_LIMIT,
): Zotero.Item[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return pickRecentMediaIds(items.map(mediaFeaturesFromItem), kind, limit)
    .map((id) => byId.get(id))
    .filter((item): item is Zotero.Item => !!item);
}

/**
 * Keep groups in the given order (subcollections, then tags). An item is
 * claimed by the first desk that includes it.
 */
export function pickMagazineDesks(
  groups: MagazineDeskInput[],
  options?: { minItems?: number; maxDesks?: number },
): MagazineDeskInput[] {
  const minItems = options?.minItems ?? MAGAZINE_DESK_MIN_ITEMS;
  const maxDesks = options?.maxDesks ?? MAGAZINE_DESK_MAX;
  const claimed = new Set<number>();
  const desks: MagazineDeskInput[] = [];
  for (const group of groups) {
    if (desks.length >= maxDesks) {
      break;
    }
    const itemIds: number[] = [];
    const seen = new Set<number>();
    for (const id of group.itemIds) {
      if (claimed.has(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      itemIds.push(id);
    }
    if (itemIds.length < minItems) {
      continue;
    }
    for (const id of itemIds) {
      claimed.add(id);
    }
    desks.push({ id: group.id, title: group.title, itemIds });
  }
  return desks;
}

export function remainderItemIds(
  allIds: number[],
  desks: MagazineDeskInput[],
  shelfIds: Iterable<number>,
): number[] {
  const used = new Set<number>(shelfIds);
  for (const desk of desks) {
    for (const id of desk.itemIds) {
      used.add(id);
    }
  }
  const seen = new Set<number>();
  const rest: number[] = [];
  for (const id of allIds) {
    if (used.has(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    rest.push(id);
  }
  return rest;
}
