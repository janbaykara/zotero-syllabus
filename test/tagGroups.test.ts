import { assert } from "chai";
import { groupItemsByTags } from "../src/modules/tagGroups";

function mockItem(
  id: number,
  tags: Array<{ tag: string; type?: number }>,
  options?: { regular?: boolean },
): Zotero.Item {
  return {
    id,
    isRegularItem: () => options?.regular !== false,
    getTags: () => tags,
  } as unknown as Zotero.Item;
}

describe("groupItemsByTags", function () {
  it("excludes automatic tags by default", function () {
    const manual = mockItem(1, [
      { tag: "History" },
      { tag: "Political Science / Anarchism", type: 1 },
    ]);
    const autoOnly = mockItem(2, [
      { tag: "Political Science / Communism", type: 1 },
    ]);
    const untagged = mockItem(3, []);

    const { tagGroups, untaggedItems } = groupItemsByTags([
      manual,
      autoOnly,
      untagged,
    ]);

    assert.deepEqual(
      tagGroups.map((group) => group.tag),
      ["History"],
    );
    assert.deepEqual(
      tagGroups[0].items.map((item) => item.id),
      [1],
    );
    assert.deepEqual(untaggedItems.map((item) => item.id).sort(), [2, 3]);
  });

  it("includes automatic tags when requested", function () {
    const mixed = mockItem(1, [
      { tag: "History", type: 0 },
      { tag: "Subject Heading", type: 1 },
    ]);

    const { tagGroups, untaggedItems } = groupItemsByTags([mixed], {
      includeAutomaticTags: true,
    });

    assert.deepEqual(
      tagGroups.map((group) => group.tag),
      ["History", "Subject Heading"],
    );
    assert.equal(untaggedItems.length, 0);
  });

  it("puts an item under every matching tag", function () {
    const item = mockItem(1, [{ tag: "A" }, { tag: "B" }]);

    const { tagGroups } = groupItemsByTags([item]);

    assert.deepEqual(
      tagGroups.map((group) => group.tag),
      ["A", "B"],
    );
    assert.deepEqual(
      tagGroups.map((group) => group.items.map((row) => row.id)),
      [[1], [1]],
    );
  });

  it("skips non-regular items", function () {
    const note = mockItem(1, [{ tag: "NoteTag" }], { regular: false });
    const book = mockItem(2, [{ tag: "BookTag" }]);

    const { tagGroups, untaggedItems } = groupItemsByTags([note, book]);

    assert.deepEqual(
      tagGroups.map((group) => group.tag),
      ["BookTag"],
    );
    assert.equal(untaggedItems.length, 0);
  });

  it("always excludes Zotero Syllabus plugin tags", function () {
    const item = mockItem(1, [
      { tag: "History" },
      { tag: "zotero-syllabus" },
      { tag: "zotero-syllabus-personal-reading-order" },
      { tag: "pinned" },
      { tag: "zotero-syllabus-pinned-intention" },
      { tag: "zotero-syllabus-pinned-collection" },
      { tag: "zotero-syllabus-gallery:ABCD1234" },
    ]);
    const pluginOnly = mockItem(2, [
      { tag: "pinned" },
      { tag: "zotero-syllabus-gallery:XYZ" },
    ]);

    const { tagGroups, untaggedItems } = groupItemsByTags([item, pluginOnly], {
      includeAutomaticTags: true,
    });

    assert.deepEqual(
      tagGroups.map((group) => group.tag),
      ["History"],
    );
    assert.deepEqual(
      untaggedItems.map((row) => row.id),
      [2],
    );
  });
});
