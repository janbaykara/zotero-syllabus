import type { MagazineSectionTemplate } from "./magazineDesks";

export type MagazineTileRole = "hero" | "wide" | "tall" | "compact";

export type MagazineItemFeatures = {
  id: number;
  itemType: string;
  abstractLength: number;
};

export const MAGAZINE_HERO_ABSTRACT_MIN = 400;
export const MAGAZINE_WIDE_ABSTRACT_MIN = 200;
export const MAGAZINE_MAX_CONSECUTIVE_COMPACT = 2;
export const MAGAZINE_MAX_CONSECUTIVE_SAME = 2;
export const MAGAZINE_MAX_CONSECUTIVE_HERO = 2;

const TALL_ITEM_TYPES = new Set([
  "book",
  "bookSection",
  "thesis",
  "report",
  "manuscript",
  "document",
]);

const WIDE_ITEM_TYPES = new Set([
  "webpage",
  "blogPost",
  "newspaperArticle",
  "magazineArticle",
  "encyclopediaArticle",
  "film",
  "videoRecording",
  "tvBroadcast",
  "radioBroadcast",
  "audioRecording",
  "podcast",
]);

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function promoteCompact(id: number): MagazineTileRole {
  return hashString(String(id)) % 2 === 0 ? "tall" : "wide";
}

function demoteHero(item: MagazineItemFeatures): MagazineTileRole {
  if (TALL_ITEM_TYPES.has(item.itemType)) {
    return "tall";
  }
  return "wide";
}

function preferredRole(
  item: MagazineItemFeatures,
  index: number,
  template: MagazineSectionTemplate,
): MagazineTileRole {
  const isFirst = index === 0;
  const longAbstract = item.abstractLength >= MAGAZINE_HERO_ABSTRACT_MIN;
  const midAbstract = item.abstractLength >= MAGAZINE_WIDE_ABSTRACT_MIN;

  if (template === "essay") {
    if (isFirst) {
      return midAbstract ? "wide" : "hero";
    }
    if (TALL_ITEM_TYPES.has(item.itemType)) {
      return "tall";
    }
    if (WIDE_ITEM_TYPES.has(item.itemType)) {
      return "wide";
    }
    return "compact";
  }

  if (template === "strip") {
    if (isFirst) {
      if (TALL_ITEM_TYPES.has(item.itemType)) {
        return "tall";
      }
      if (WIDE_ITEM_TYPES.has(item.itemType) || midAbstract) {
        return "wide";
      }
      return promoteCompact(item.id);
    }
    if (WIDE_ITEM_TYPES.has(item.itemType)) {
      return "wide";
    }
    if (TALL_ITEM_TYPES.has(item.itemType)) {
      return "tall";
    }
    if (longAbstract || midAbstract) {
      return "wide";
    }
    return "compact";
  }

  if (isFirst) {
    return "hero";
  }
  if (WIDE_ITEM_TYPES.has(item.itemType)) {
    return longAbstract ? "hero" : "wide";
  }
  if (TALL_ITEM_TYPES.has(item.itemType)) {
    return "tall";
  }
  if (longAbstract) {
    return "hero";
  }
  if (midAbstract) {
    return "wide";
  }
  return "compact";
}

function alternateRole(
  item: MagazineItemFeatures,
  role: MagazineTileRole,
  template: MagazineSectionTemplate,
): MagazineTileRole {
  if (role === "compact") {
    return promoteCompact(item.id);
  }
  if (role === "hero") {
    return demoteHero(item);
  }
  if (role === "tall") {
    return "wide";
  }
  if (template === "strip" || template === "essay") {
    return "tall";
  }
  if (TALL_ITEM_TYPES.has(item.itemType)) {
    return "tall";
  }
  return "hero";
}

/**
 * Assign editorial grid roles from sync metadata only (type, abstract length,
 * position). Cover resolution is async and must not change spans.
 */
export function assignMagazineRoles(
  items: MagazineItemFeatures[],
  options?: { template?: MagazineSectionTemplate },
): MagazineTileRole[] {
  const template = options?.template ?? "lead";
  const roles: MagazineTileRole[] = [];
  let compactRun = 0;
  let heroRun = 0;
  let sameRun = 0;
  let lastRole: MagazineTileRole | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let role = preferredRole(item, i, template);

    if (template === "strip" && role === "hero") {
      role = demoteHero(item);
    }

    if (role === "hero" && heroRun >= MAGAZINE_MAX_CONSECUTIVE_HERO) {
      role = demoteHero(item);
    }

    if (role === "compact") {
      compactRun += 1;
      const cadencePromote = (i + 1) % 4 === 0;
      if (compactRun > MAGAZINE_MAX_CONSECUTIVE_COMPACT || cadencePromote) {
        role = promoteCompact(item.id);
        compactRun = 0;
      }
    } else {
      compactRun = 0;
    }

    if (lastRole && role === lastRole) {
      sameRun += 1;
      if (sameRun > MAGAZINE_MAX_CONSECUTIVE_SAME) {
        role = alternateRole(item, role, template);
        if (template === "strip" && role === "hero") {
          role = "tall";
        }
        sameRun = 1;
      }
    } else {
      sameRun = 1;
    }

    if (role === "hero") {
      heroRun += 1;
    } else {
      heroRun = 0;
    }

    lastRole = role;
    roles.push(role);
  }

  return roles;
}
