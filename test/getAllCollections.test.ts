import { assert } from "chai";
import {
  dedupeCollectionsByLibraryAndKey,
  getAllCollections,
  libraryIsEditable,
  zoteroLibraryID,
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

describe("zoteroLibraryID", function () {
  it("prefers libraryID over group id", function () {
    assert.equal(zoteroLibraryID({ id: 6340498, libraryID: 5 }), 5);
    assert.equal(zoteroLibraryID({ id: 1, libraryID: 1 }), 1);
    assert.equal(zoteroLibraryID({ id: 1 }), 1);
    assert.isNull(zoteroLibraryID(null));
  });
});

describe("getAllCollections", function () {
  this.timeout(30_000);

  it("includes collections from group libraries", function () {
    const group = Zotero.Libraries.getAll().find(
      (library) => library.libraryType === "group" && library.editable,
    );
    if (!group) {
      this.skip();
      return;
    }
    const libraryID = zoteroLibraryID(group);
    assert.isNotNull(libraryID);
    const inLibrary = Zotero.Collections.getByLibrary(libraryID!);
    if (!inLibrary.length) {
      this.skip();
      return;
    }
    const all = getAllCollections(false);
    const fromGroup = all.filter(
      (collection) => collection.libraryID === libraryID,
    );
    assert.isAtLeast(
      fromGroup.length,
      inLibrary.filter((collection) => !collection.parentID).length,
      "group collections must not be skipped via library.id/groupID",
    );
  });
});
