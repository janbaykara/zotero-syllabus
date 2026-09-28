import { assert } from "chai";
import { pickLibraryItems } from "../src/utils/itemPicker";
import { resolveItemsForClassAssignment } from "../src/utils/items";

function fakeCollection(id: number, libraryID: number): Zotero.Collection {
  return { id, libraryID, deleted: false } as unknown as Zotero.Collection;
}

function fakeRegular(id: number, libraryID: number): Zotero.Item {
  return {
    id,
    libraryID,
    deleted: false,
    isRegularItem: () => true,
    isFeedItem: false,
  } as unknown as Zotero.Item;
}

function fakeChildAttachment(
  id: number,
  libraryID: number,
  parent: Zotero.Item,
): Zotero.Item {
  return {
    id,
    libraryID,
    deleted: false,
    isNote: () => false,
    isAttachment: () => true,
    isRegularItem: () => false,
    parentItemID: parent.id,
    parentItem: parent,
  } as unknown as Zotero.Item;
}

describe("add items to class helpers", function () {
  it("keeps same-library regular items and dedupes", function () {
    const collection = fakeCollection(5, 1);
    const book = fakeRegular(10, 1);
    const resolved = resolveItemsForClassAssignment([book, book], collection);
    assert.deepEqual(
      resolved.map((item) => item.id),
      [10],
    );
  });

  it("maps a child attachment to its parent", function () {
    const collection = fakeCollection(5, 1);
    const book = fakeRegular(10, 1);
    const pdf = fakeChildAttachment(11, 1, book);
    const resolved = resolveItemsForClassAssignment([pdf], collection);
    assert.deepEqual(
      resolved.map((item) => item.id),
      [10],
    );
  });

  it("drops items from another library", function () {
    const collection = fakeCollection(5, 1);
    const foreign = fakeRegular(12, 2);
    assert.deepEqual(resolveItemsForClassAssignment([foreign], collection), []);
  });

  it("returns no picker items in the test environment", async function () {
    const items = await pickLibraryItems({ libraryID: 1 });
    assert.deepEqual(items, []);
  });
});
