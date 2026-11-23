import { assert } from "chai";
import {
  groupsWithoutDone,
  itemsMostRecentlyDone,
  itemsThatAreDone,
  itemsWithoutDone,
  mergeReadingOrderPreservingDone,
  omitDoneItemIds,
} from "../src/modules/galleryDoneSplit";

describe("galleryDoneSplit", function () {
  const done = new Set(["d1", "d2"]);

  it("leaves the list unchanged when nothing is done", function () {
    const items = [{ key: "a" }, { key: "b" }];
    assert.strictEqual(itemsWithoutDone(items, new Set()), items);
    assert.deepEqual(itemsThatAreDone(items, new Set()), []);
  });

  it("splits done items out while keeping relative order", function () {
    const items = [{ key: "a" }, { key: "d1" }, { key: "b" }, { key: "d2" }];
    assert.deepEqual(
      itemsWithoutDone(items, done).map((item) => item.key),
      ["a", "b"],
    );
    assert.deepEqual(
      itemsThatAreDone(items, done).map((item) => item.key),
      ["d1", "d2"],
    );
  });

  it("lists done items most recently done first", function () {
    const items = [{ key: "a" }, { key: "d1" }, { key: "b" }, { key: "d2" }];
    assert.deepEqual(
      itemsMostRecentlyDone(items, ["d1", "d2"]).map((item) => item.key),
      ["d2", "d1"],
    );
    assert.deepEqual(itemsMostRecentlyDone(items, []), []);
  });

  it("drops empty groups after removing done items", function () {
    const groups = groupsWithoutDone(
      [
        { id: "books", items: [{ key: "a" }, { key: "d1" }] },
        { id: "films", items: [{ key: "d2" }] },
      ],
      done,
    );
    assert.deepEqual(groups, [{ id: "books", items: [{ key: "a" }] }]);
  });

  it("prunes subcollection branches that only held done items", function () {
    const root = omitDoneItemIds(
      {
        collectionId: 1,
        name: "Root",
        itemIds: [1, 2],
        children: [
          {
            collectionId: 2,
            name: "Child",
            itemIds: [3],
            children: [],
          },
        ],
      },
      new Set([2, 3]),
    );
    assert.deepEqual(root, {
      collectionId: 1,
      name: "Root",
      itemIds: [1],
      children: [],
    });
    assert.equal(
      omitDoneItemIds(
        { collectionId: 1, name: "Root", itemIds: [3], children: [] },
        new Set([3]),
      ),
      null,
    );
  });

  it("places a done key in the active list once it is no longer done", function () {
    assert.deepEqual(
      mergeReadingOrderPreservingDone(
        ["a", "d1", "d2", "b"],
        ["d1", "a", "b"],
        new Set(["d2"]),
      ),
      ["d1", "a", "d2", "b"],
    );
  });

  it("keeps done keys in place when the active reading order changes", function () {
    assert.deepEqual(
      mergeReadingOrderPreservingDone(
        ["a", "d1", "b", "c", "d2"],
        ["c", "a", "b"],
        done,
      ),
      ["c", "d1", "a", "b", "d2"],
    );
  });

  it("drops active keys removed from the order and keeps done keys", function () {
    assert.deepEqual(
      mergeReadingOrderPreservingDone(["a", "d1", "b"], ["a"], done),
      ["a", "d1"],
    );
  });
});
