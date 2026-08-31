import { assert } from "chai";
import {
  dedupeCollectionsByLibraryAndKey,
  libraryIsEditable,
} from "../src/utils/zotero";

describe("dedupeCollectionsByLibraryAndKey", function () {
  it("keeps collections that share a key across libraries", function () {
    const user = { libraryID: 1, key: "AAAAAAAA", name: "Course A" };
    const group = { libraryID: 2, key: "AAAAAAAA", name: "Course B" };
    const result = dedupeCollectionsByLibraryAndKey([user, group, user]);
    assert.lengthOf(result, 2);
    assert.includeMembers(
      result.map((collection) => collection.name),
      ["Course A", "Course B"],
    );
  });

  it("collapses true duplicates in the same library", function () {
    const first = { libraryID: 1, key: "AAAAAAAA", name: "first" };
    const copy = { libraryID: 1, key: "AAAAAAAA", name: "copy" };
    const result = dedupeCollectionsByLibraryAndKey([first, copy]);
    assert.lengthOf(result, 1);
    assert.equal(result[0].name, "copy");
  });
});

describe("libraryIsEditable", function () {
  this.timeout(30_000);

  it("is true for My Library and false for missing libraries", function () {
    assert.isTrue(libraryIsEditable(Zotero.Libraries.userLibraryID));
    assert.isFalse(libraryIsEditable(99999999));
    assert.isFalse(libraryIsEditable(null));
  });
});
