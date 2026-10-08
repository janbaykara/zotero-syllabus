import { assert } from "chai";
import {
  ITEM_PATH_SEGMENT,
  isPrivateRelPath,
  parsePublicPath,
  publicItemFilePath,
  publicUrlForItem,
  publicUrlForSyllabus,
  r2KeyForPublicPath,
  userItemPrefix,
  userSyllabusPrefix,
} from "../cloud/src/paths";
import {
  EMPTY_REFS,
  normalizeItemRefs,
  parseItemKeysJson,
  refsAreEmpty,
} from "../cloud/src/itemRefs";

describe("cloud paths", function () {
  describe("public paths", function () {
    it("parses syllabus and item public URLs", function () {
      const syl = parsePublicPath("/u/42/1/ABCD1234/");
      assert.deepEqual(syl, {
        kind: "syllabus",
        userId: "42",
        libraryId: "1",
        collectionKey: "ABCD1234",
        relPath: "index.html",
      });

      const item = parsePublicPath("/u/42/1/item/ITEMKEY1/files/ATTKEY.pdf");
      assert.deepEqual(item, {
        kind: "item",
        userId: "42",
        libraryId: "1",
        itemKey: "ITEMKEY1",
        relPath: "files/ATTKEY.pdf",
      });
      assert.equal(ITEM_PATH_SEGMENT, "item");
    });

    it("maps public paths to R2 keys", function () {
      assert.equal(
        r2KeyForPublicPath({
          kind: "syllabus",
          userId: "42",
          libraryId: "1",
          collectionKey: "COLKEY01",
          relPath: "index.html",
        }),
        "users/42/syllabi/1/COLKEY01/index.html",
      );
      assert.equal(
        r2KeyForPublicPath({
          kind: "item",
          userId: "42",
          libraryId: "1",
          itemKey: "ITEMKEY1",
          relPath: "files/ATT.pdf",
        }),
        "users/42/items/1/ITEMKEY1/files/ATT.pdf",
      );
    });

    it("builds prefixes and public URLs", function () {
      assert.equal(
        userSyllabusPrefix("42", "1", "COL"),
        "users/42/syllabi/1/COL/",
      );
      assert.equal(userItemPrefix("42", "1", "ITEM"), "users/42/items/1/ITEM/");
      assert.equal(
        publicUrlForSyllabus("https://example.test", "42", "1", "COL"),
        "https://example.test/u/42/1/COL/",
      );
      assert.equal(
        publicUrlForItem("https://example.test", "42", "1", "ITEM"),
        "https://example.test/u/42/1/item/ITEM/",
      );
      assert.equal(
        publicItemFilePath("42", "1", "ITEM", "files/ATT.pdf"),
        "/u/42/1/item/ITEM/files/ATT.pdf",
      );
    });

    it("treats refs.json and itemKeys.json as private", function () {
      assert.isTrue(isPrivateRelPath("refs.json"));
      assert.isTrue(isPrivateRelPath("itemKeys.json"));
      assert.isFalse(isPrivateRelPath("index.html"));
    });
  });

  describe("item refs helpers", function () {
    it("normalizes and detects empty refs", function () {
      assert.deepEqual(normalizeItemRefs(null), EMPTY_REFS);
      assert.deepEqual(
        normalizeItemRefs({ syllabi: ["B", "A", "A"], page: true }),
        { syllabi: ["A", "B"], page: true },
      );
      assert.isTrue(refsAreEmpty({ syllabi: [], page: false }));
      assert.isFalse(refsAreEmpty({ syllabi: ["X"], page: false }));
      assert.isFalse(refsAreEmpty({ syllabi: [], page: true }));
    });

    it("parses itemKeys.json", function () {
      assert.deepEqual(parseItemKeysJson({ itemKeys: ["A", "B", "A"] }), [
        "A",
        "B",
      ]);
      assert.deepEqual(parseItemKeysJson({}), []);
    });
  });
});
