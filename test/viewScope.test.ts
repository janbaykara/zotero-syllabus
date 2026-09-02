import { assert } from "chai";
import {
  collectionTreeRowKind,
  isLibraryRootRow,
  isSpecialViewPrefKey,
  specialGalleryTypeFromRow,
  treeViewIDFromRow,
  viewScopeSupportsGallery,
  type CollectionTreeRowLike,
} from "../src/utils/viewScope";

function row(partial: CollectionTreeRowLike): CollectionTreeRowLike {
  return partial;
}

describe("viewScope", function () {
  it("treats saved searches and specials including feeds as gallery-capable", function () {
    const cases: Array<[CollectionTreeRowLike, string, string]> = [
      [
        row({ type: "search", id: "S12", isSearch: () => true }),
        "search",
        "S12",
      ],
      [
        row({
          type: "duplicates",
          id: "D1",
          isDuplicates: () => true,
          ref: { libraryID: 1 },
        }),
        "duplicates",
        "D1",
      ],
      [
        row({
          type: "unfiled",
          isUnfiled: () => true,
          ref: { libraryID: 1 },
        }),
        "unfiled",
        "U1",
      ],
      [
        row({
          type: "retracted",
          isRetracted: () => true,
          ref: { libraryID: 1 },
        }),
        "retracted",
        "R1",
      ],
      [
        row({
          type: "publications",
          isPublications: () => true,
          ref: { libraryID: 1 },
        }),
        "publications",
        "P1",
      ],
      [
        row({ type: "trash", isTrash: () => true, ref: { libraryID: 1 } }),
        "trash",
        "T1",
      ],
      [
        row({
          type: "recentlyRead",
          isRecentlyRead: () => true,
          ref: { libraryID: 1 },
        }),
        "recentlyRead",
        "Y1",
      ],
      [
        row({
          type: "feed",
          isFeed: () => true,
          ref: { libraryID: 42 },
        }),
        "feed",
        "L42",
      ],
      [row({ type: "feeds", isFeeds: () => true, id: "F1" }), "feeds", "F1"],
    ];

    for (const [treeRow, type, treeViewID] of cases) {
      assert.equal(specialGalleryTypeFromRow(treeRow), type, type);
      assert.equal(collectionTreeRowKind(treeRow), "special", type);
      assert.equal(treeViewIDFromRow(treeRow), treeViewID, type);
      assert.isTrue(viewScopeSupportsGallery({ kind: "special" }), type);
    }
  });

  it("does not treat library root, groups, or headers as gallery-capable specials", function () {
    const library = row({
      type: "library",
      id: "L1",
      isLibrary: () => true,
      ref: { libraryID: 1 },
    });
    const group = row({
      type: "group",
      id: "L2",
      isGroup: () => true,
      ref: { libraryID: 2 },
    });
    const header = row({ type: "header", isHeader: () => true, id: "HF" });

    assert.isTrue(isLibraryRootRow(library));
    assert.equal(collectionTreeRowKind(library), "library");
    assert.isFalse(viewScopeSupportsGallery({ kind: "library" }));

    assert.isTrue(isLibraryRootRow(group));
    assert.equal(collectionTreeRowKind(group), "library");

    assert.equal(collectionTreeRowKind(header), "other");
    assert.isNull(specialGalleryTypeFromRow(header));
    assert.isFalse(viewScopeSupportsGallery({ kind: "other" }));
  });

  it("treats real collections as gallery-capable", function () {
    const collection = row({
      type: "collection",
      id: "C9",
      isCollection: () => true,
      ref: { id: 9 },
    });
    assert.equal(collectionTreeRowKind(collection), "collection");
    assert.isTrue(viewScopeSupportsGallery({ kind: "collection" }));
    assert.equal(treeViewIDFromRow(collection), "C9");
  });

  it("recognizes special view pref keys but not numeric collection ids or library L keys", function () {
    assert.isTrue(isSpecialViewPrefKey("S12"));
    assert.isTrue(isSpecialViewPrefKey("T1"));
    assert.isTrue(isSpecialViewPrefKey("F1"));
    assert.isTrue(isSpecialViewPrefKey("Y1"));
    assert.isFalse(isSpecialViewPrefKey("12"));
    assert.isFalse(isSpecialViewPrefKey("L42"));
    assert.isFalse(isSpecialViewPrefKey("C9"));
  });
});
