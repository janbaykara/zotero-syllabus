import { assert } from "chai";
import {
  classFolderNameMatches,
  classSubcollectionName,
  classSubcollectionNameBase,
} from "../src/modules/classSubcollections";

describe("classSubcollectionName", function () {
  it("keeps short titles unchanged", function () {
    assert.equal(
      classSubcollectionName("week", 1, "Seminar"),
      "Week 1: Seminar",
    );
  });

  it("never exceeds Zotero’s 255-character collection name limit", function () {
    const name = classSubcollectionName("class", 12, "A".repeat(400), {
      done: true,
      readingDate: "2026-08-28",
    });
    assert.isAtMost(name.length, 255);
    assert.match(name, /^Class 12:/);
  });
});

describe("classSubcollectionNameBase", function () {
  it("strips English and localized date suffixes", function () {
    assert.equal(
      classSubcollectionNameBase("Week 1: Seminar — Monday 28th Aug"),
      "Week 1: Seminar",
    );
    assert.equal(
      classSubcollectionNameBase("Week 1: Seminar — Freitag, 28. Aug."),
      "Week 1: Seminar",
    );
    assert.equal(
      classSubcollectionNameBase("Week 1: Seminar — Monday 28th Aug ✅"),
      "Week 1: Seminar",
    );
  });

  it("keeps an em dash in the title when it is not a date", function () {
    assert.equal(
      classSubcollectionNameBase("Week 1: Marx — Capital"),
      "Week 1: Marx — Capital",
    );
  });
});

describe("classFolderNameMatches", function () {
  const document = { nomenclature: "week" } as Parameters<
    typeof classFolderNameMatches
  >[0];
  const meta = {
    number: 1,
    title: "Seminar",
    status: null as const,
    readingDate: "2026-08-28",
  };

  it("adopts a folder dated in another locale", function () {
    assert.isTrue(
      classFolderNameMatches(
        document,
        meta,
        "Week 1: Seminar — Freitag, 28. Aug.",
      ),
    );
    assert.isTrue(classFolderNameMatches(document, meta, "Week 1: Seminar"));
  });
});
