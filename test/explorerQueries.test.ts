import { assert } from "chai";
import {
  groupAdjacentAnnotations,
  pickNewestItems,
  pickRecentlyReadIds,
} from "../src/modules/explorerQueries";

function annotationRow(id: number, parentId: number | null) {
  return {
    id,
    text: `t${id}`,
    color: "#ffd400",
    dateModified: "",
    parent: parentId == null ? null : ({ id: parentId } as Zotero.Item),
  };
}

describe("explorer queries", function () {
  describe("pickRecentlyReadIds", function () {
    it("orders by Last Read, keeps the latest attachment per parent, and caps the list", function () {
      assert.deepEqual(
        pickRecentlyReadIds(
          [
            { itemId: 1, lastRead: 1_700_000_100 },
            { itemId: 2, lastRead: 1_700_000_300 },
            { itemId: 1, lastRead: 1_700_000_200 },
            { itemId: 3, lastRead: 0 },
            { itemId: 4, lastRead: 1_700_000_050 },
          ],
          2,
        ),
        [2, 1],
      );
    });
  });

  describe("pickNewestItems", function () {
    it("returns the most recently added items up to the limit", function () {
      const items = [
        { id: 1, dateAdded: "2026-01-01" },
        { id: 2, dateAdded: "2026-08-01" },
        { id: 3, dateAdded: "2026-06-01" },
      ] as Zotero.Item[];
      assert.deepEqual(
        pickNewestItems(items, 2).map((item) => item.id),
        [2, 3],
      );
    });
  });

  describe("groupAdjacentAnnotations", function () {
    it("groups only neighbouring annotations from the same item", function () {
      const groups = groupAdjacentAnnotations([
        annotationRow(1, 10),
        annotationRow(2, 10),
        annotationRow(3, 20),
        annotationRow(4, 10),
        annotationRow(5, null),
        annotationRow(6, null),
      ]);
      assert.deepEqual(
        groups.map((group) => group.annotations.map((item) => item.id)),
        [[1, 2], [3], [4], [5], [6]],
      );
    });
  });
});
