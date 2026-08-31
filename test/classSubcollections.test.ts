import { assert } from "chai";
import { classSubcollectionName } from "../src/modules/classSubcollections";

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
