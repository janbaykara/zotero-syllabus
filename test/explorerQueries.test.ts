import { assert } from "chai";
import {
  dedupeMyAnnotationStreamRows,
  groupAdjacentAnnotations,
  normalizeMyAnnotationsSearchQuery,
  isMyAnnotationsSearchActive,
  pickNewestItems,
  pickRecentlyReadIds,
  uniqueParentsFromSearchHits,
  type MyAnnotationStreamEntry,
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

function fakeItem(opts: {
  id: number;
  deleted?: boolean;
  regular?: boolean;
  attachment?: boolean;
  annotation?: boolean;
  parent?: Zotero.Item | false | null;
}): Zotero.Item {
  return {
    id: opts.id,
    deleted: opts.deleted ?? false,
    isRegularItem: () => !!opts.regular,
    isAttachment: () => !!opts.attachment,
    isAnnotation: () => !!opts.annotation,
    isNote: () => false,
    isFeedItem: false,
    parentItem: opts.parent ?? false,
    parentItemID: opts.parent ? opts.parent.id : false,
  } as unknown as Zotero.Item;
}

function streamRow(id: number): MyAnnotationStreamEntry {
  return {
    id,
    quote: `q${id}`,
    comment: "",
    color: "#ffd400",
    dateAdded: "",
    dateModified: "",
    pageLabel: "",
    sortIndex: "",
    parent: null,
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

  describe("normalizeMyAnnotationsSearchQuery", function () {
    it("treats empty and whitespace as no search", function () {
      assert.equal(normalizeMyAnnotationsSearchQuery(""), "");
      assert.equal(normalizeMyAnnotationsSearchQuery("   "), "");
      assert.equal(normalizeMyAnnotationsSearchQuery(null), "");
      assert.equal(normalizeMyAnnotationsSearchQuery(undefined), "");
      assert.isFalse(isMyAnnotationsSearchActive("  \t "));
      assert.equal(normalizeMyAnnotationsSearchQuery("  climate  "), "climate");
      assert.isTrue(isMyAnnotationsSearchActive("climate"));
    });
  });

  describe("uniqueParentsFromSearchHits", function () {
    it("maps regular, attachment, and annotation hits to unique parents", function () {
      const work = fakeItem({ id: 10, regular: true });
      const other = fakeItem({ id: 20, regular: true });
      const att = fakeItem({ id: 11, attachment: true, parent: work });
      const ann = fakeItem({ id: 12, annotation: true, parent: att });
      const deleted = fakeItem({ id: 30, regular: true, deleted: true });
      assert.deepEqual(
        uniqueParentsFromSearchHits([work, att, ann, other, work, deleted]).map(
          (item) => item.id,
        ),
        [10, 20],
      );
    });
  });

  describe("dedupeMyAnnotationStreamRows", function () {
    it("keeps the first row for each annotation id", function () {
      const first = streamRow(1);
      const second = streamRow(1);
      second.quote = "later";
      const rows = dedupeMyAnnotationStreamRows([
        first,
        streamRow(2),
        second,
        streamRow(3),
        streamRow(2),
      ]);
      assert.deepEqual(
        rows.map((row) => row.id),
        [1, 2, 3],
      );
      assert.equal(rows[0].quote, "q1");
    });
  });
});
