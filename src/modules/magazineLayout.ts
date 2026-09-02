import type { MagazineSectionTemplate } from "./magazineDesks";

export type MagazineTileRole = "hero" | "wide" | "tall" | "compact";

export type MagazineItemFeatures = {
  id: number;
  itemType: string;
  abstractLength: number;
};

export const MAGAZINE_HERO_ABSTRACT_MIN = 400;
export const MAGAZINE_WIDE_ABSTRACT_MIN = 200;
export const MAGAZINE_MAX_CONSECUTIVE_COMPACT = 4;
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

function preferredRole(
  item: MagazineItemFeatures,
  isFirst: boolean,
): MagazineTileRole {
  const longAbstract = item.abstractLength >= MAGAZINE_HERO_ABSTRACT_MIN;
  const midAbstract = item.abstractLength >= MAGAZINE_WIDE_ABSTRACT_MIN;

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

function demoteHero(item: MagazineItemFeatures): MagazineTileRole {
  if (TALL_ITEM_TYPES.has(item.itemType)) {
    return "tall";
  }
  return "wide";
}

function rolesForTemplate(
  items: MagazineItemFeatures[],
  template: MagazineSectionTemplate,
): MagazineTileRole[] | null {
  if (template === "strip") {
    return items.map(() => "compact");
  }
  if (template === "essay") {
    return items.map((item, index) => {
      if (index === 0) {
        return item.abstractLength >= MAGAZINE_WIDE_ABSTRACT_MIN
          ? "wide"
          : "hero";
      }
      return "compact";
    });
  }
  return null;
}

/**
 * Assign editorial grid roles from sync metadata only (type, abstract length,
 * position). Cover resolution is async and must not change spans.
 */
export function assignMagazineRoles(
  items: MagazineItemFeatures[],
  options?: { template?: MagazineSectionTemplate },
): MagazineTileRole[] {
  const templated = rolesForTemplate(items, options?.template ?? "lead");
  if (templated) {
    return templated;
  }

  const roles: MagazineTileRole[] = [];
  let compactRun = 0;
  let heroRun = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let role = preferredRole(item, i === 0);

    if (role === "hero" && heroRun >= MAGAZINE_MAX_CONSECUTIVE_HERO) {
      role = demoteHero(item);
    }

    if (role === "compact") {
      compactRun += 1;
      const cadencePromote = (i + 1) % 5 === 0;
      if (compactRun > MAGAZINE_MAX_CONSECUTIVE_COMPACT || cadencePromote) {
        role = promoteCompact(item.id);
        compactRun = 0;
      }
    } else {
      compactRun = 0;
    }

    if (role === "hero") {
      heroRun += 1;
    } else {
      heroRun = 0;
    }

    roles.push(role);
  }

  return roles;
}
