import { assert } from "chai";
import { coerceGalleryLayout } from "../src/modules/galleryLayout";
import {
  assignMagazineRoles,
  MAGAZINE_HERO_ABSTRACT_MIN,
  MAGAZINE_MAX_CONSECUTIVE_HERO,
  MAGAZINE_WIDE_ABSTRACT_MIN,
  type MagazineItemFeatures,
  type MagazineTileRole,
} from "../src/modules/magazineLayout";
import { snippetFromAbstractNote } from "../src/utils/items";

function item(
  id: number,
  itemType: string,
  abstractLength: number,
): MagazineItemFeatures {
  return { id, itemType, abstractLength };
}

function maxRun(roles: MagazineTileRole[], role: MagazineTileRole): number {
  let best = 0;
  let current = 0;
  for (const value of roles) {
    if (value === role) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

describe("magazineLayout", function () {
  it("coerces magazine as a gallery layout", function () {
    assert.equal(coerceGalleryLayout("magazine"), "magazine");
    assert.equal(coerceGalleryLayout("cover"), "cover");
    assert.equal(coerceGalleryLayout("nope"), "cover");
  });

  it("makes the first item a hero", function () {
    const roles = assignMagazineRoles([
      item(1, "book", 0),
      item(2, "journalArticle", 0),
    ]);
    assert.equal(roles[0], "hero");
  });

  it("prefers tall for books, theses, and reports", function () {
    const roles = assignMagazineRoles([
      item(1, "journalArticle", 0),
      item(2, "book", 40),
      item(3, "thesis", 0),
      item(4, "report", 80),
    ]);
    assert.equal(roles[1], "tall");
    assert.equal(roles[2], "tall");
    assert.equal(roles[3], "tall");
  });

  it("prefers hero or wide for long abstracts", function () {
    const roles = assignMagazineRoles([
      item(1, "journalArticle", MAGAZINE_HERO_ABSTRACT_MIN),
      item(2, "journalArticle", MAGAZINE_HERO_ABSTRACT_MIN),
      item(3, "journalArticle", MAGAZINE_WIDE_ABSTRACT_MIN),
    ]);
    assert.include(["hero", "wide"], roles[0]);
    assert.include(["hero", "wide"], roles[1]);
    assert.equal(roles[2], "wide");
  });

  it("does not assign eight heroes in a row", function () {
    const items = Array.from({ length: 8 }, (_, index) =>
      item(index + 1, "journalArticle", MAGAZINE_HERO_ABSTRACT_MIN),
    );
    const roles = assignMagazineRoles(items);
    assert.isAtMost(maxRun(roles, "hero"), MAGAZINE_MAX_CONSECUTIVE_HERO);
    assert.isBelow(
      roles.filter((role) => role === "hero").length,
      items.length,
    );
  });

  it("promotes compact tiles on a cadence so uniform lists stay varied", function () {
    const items = Array.from({ length: 12 }, (_, index) =>
      item(index + 10, "journalArticle", 0),
    );
    const roles = assignMagazineRoles(items);
    assert.isAtMost(maxRun(roles, "compact"), 4);
    const promoted = roles.filter(
      (role) => role === "tall" || role === "wide" || role === "hero",
    );
    assert.isAtLeast(promoted.length, 3);
  });

  it("treats web and video types as wide when they are not the lead", function () {
    const roles = assignMagazineRoles([
      item(1, "journalArticle", 0),
      item(2, "webpage", 80),
      item(3, "videoRecording", 20),
    ]);
    assert.equal(roles[1], "wide");
    assert.equal(roles[2], "wide");
  });

  it("uses essay and strip templates for grouped desks", function () {
    const items = Array.from({ length: 5 }, (_, index) =>
      item(index + 1, "journalArticle", MAGAZINE_WIDE_ABSTRACT_MIN),
    );
    assert.deepEqual(
      assignMagazineRoles(items, { template: "strip" }),
      items.map(() => "compact"),
    );
    const essay = assignMagazineRoles(items, { template: "essay" });
    assert.equal(essay[0], "wide");
    assert.deepEqual(essay.slice(1), [
      "compact",
      "compact",
      "compact",
      "compact",
    ]);
  });

  it("strips HTML and Abstract boilerplate from abstract notes", function () {
    assert.equal(
      snippetFromAbstractNote("<p>Abstract: Hello  world</p>"),
      "Hello world",
    );
  });
});
