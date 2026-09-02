import { assert } from "chai";
import {
  findActiveGalleryGroupId,
  flattenSubcollectionNavGroups,
} from "../src/modules/galleryGroupNav";

describe("galleryGroupNav", function () {
  it("returns null when there are no groups", function () {
    assert.equal(findActiveGalleryGroupId([], 40), null);
  });

  it("keeps the first group until a later section crosses the activation line", function () {
    const groups = [
      { id: "a", top: 80 },
      { id: "b", top: 200 },
      { id: "c", top: 400 },
    ];
    assert.equal(findActiveGalleryGroupId(groups, 40), "a");
    assert.equal(findActiveGalleryGroupId(groups, 80), "a");
    assert.equal(findActiveGalleryGroupId(groups, 200), "b");
    assert.equal(findActiveGalleryGroupId(groups, 350), "b");
    assert.equal(findActiveGalleryGroupId(groups, 400), "c");
    assert.equal(findActiveGalleryGroupId(groups, 199), "b");
  });

  it("flattens subcollections in render order, with a root items pill first", function () {
    const groups = flattenSubcollectionNavGroups(
      {
        collectionId: 1,
        name: "Root",
        itemIds: [10],
        children: [
          {
            collectionId: 2,
            name: "Child",
            itemIds: [11],
            children: [
              {
                collectionId: 3,
                name: "Grandchild",
                itemIds: [12],
                children: [],
              },
            ],
          },
          {
            collectionId: 4,
            name: "Empty",
            itemIds: [],
            children: [],
          },
        ],
      },
      "In this collection",
    );
    assert.deepEqual(groups, [
      {
        id: "col-root-1",
        label: "In this collection",
        icon: { kind: "collection-root" },
      },
      { id: "col-2", label: "Child", icon: { kind: "collection" } },
      { id: "col-3", label: "Grandchild", icon: { kind: "collection" } },
    ]);
  });

  it("omits the root pill when the collection has no direct items", function () {
    const groups = flattenSubcollectionNavGroups(
      {
        collectionId: 1,
        name: "Root",
        itemIds: [],
        children: [
          {
            collectionId: 2,
            name: "Child",
            itemIds: [11],
            children: [],
          },
        ],
      },
      "In this collection",
    );
    assert.deepEqual(groups, [
      { id: "col-2", label: "Child", icon: { kind: "collection" } },
    ]);
  });
});
