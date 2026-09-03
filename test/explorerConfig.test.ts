import { assert } from "chai";
import {
  coerceExplorerShelves,
  defaultExplorerShelves,
  isExplorerShelfEnabled,
  layoutsForExplorerShelf,
  mergeExplorerCatalog,
} from "../src/modules/explorerConfig";

describe("explorer shelves", function () {
  it("puts upcoming deadlines first on the default homepage", function () {
    assert.deepEqual(
      defaultExplorerShelves().map((shelf) => shelf.type),
      [
        "upcoming-deadlines",
        "watch-now",
        "listen-now",
        "recently-read",
        "recently-added",
      ],
    );
  });

  it("maps recent articles onto Recently added", function () {
    const shelves = coerceExplorerShelves([
      { id: "ra", type: "recent-articles", days: 14, groupBy: "auto" },
      { id: "added", type: "recently-added", days: 14 },
    ]);
    assert.deepEqual(
      shelves.map((shelf) => shelf.type),
      ["recently-added"],
    );
  });

  it("maps featured video/audio onto Watch/Listen now and drops featured books", function () {
    const shelves = coerceExplorerShelves([
      { id: "fv", type: "featured-video" },
      { id: "wn", type: "watch-now", days: 7 },
      { id: "fa", type: "featured-audio" },
      { id: "ln", type: "listen-now", days: 7 },
      { id: "books", type: "featured-books" },
    ]);
    assert.deepEqual(
      shelves.map((shelf) => shelf.type),
      ["watch-now", "listen-now"],
    );
  });

  it("replaces the previous media default with upcoming deadlines first", function () {
    const shelves = coerceExplorerShelves([
      { id: "watch-now", type: "watch-now", layout: "cover" },
      { id: "listen-now", type: "listen-now", layout: "cover" },
      {
        id: "recently-read",
        type: "recently-read",
        layout: "cover",
        days: 30,
        limit: 10,
      },
      {
        id: "recently-added",
        type: "recently-added",
        layout: "magazine",
        days: 14,
      },
    ]);
    assert.deepEqual(
      shelves.map((shelf) => shelf.type),
      defaultExplorerShelves().map((shelf) => shelf.type),
    );
  });

  it("replaces the shipped seven-shelf default with the current homepage", function () {
    const shelves = coerceExplorerShelves([
      {
        id: "recently-read",
        type: "recently-read",
        layout: "cover",
        days: 30,
        limit: 10,
      },
      {
        id: "recent-articles",
        type: "recent-articles",
        layout: "magazine",
        days: 14,
        groupBy: "auto",
      },
      { id: "featured-books", type: "featured-books", layout: "magazine" },
      { id: "featured-video", type: "featured-video", layout: "cover" },
      { id: "watch-now", type: "watch-now", layout: "cover", days: 7 },
      { id: "featured-audio", type: "featured-audio", layout: "cover" },
      { id: "listen-now", type: "listen-now", layout: "cover", days: 7 },
    ]);
    assert.deepEqual(
      shelves.map((shelf) => shelf.type),
      defaultExplorerShelves().map((shelf) => shelf.type),
    );
  });

  it("keeps disabled shelves when coercing", function () {
    const shelves = coerceExplorerShelves([
      { id: "wn", type: "watch-now", enabled: false },
      { id: "ln", type: "listen-now" },
    ]);
    assert.isFalse(isExplorerShelfEnabled(shelves[0]));
    assert.isTrue(isExplorerShelfEnabled(shelves[1]));
  });

  it("fills missing presets and top-level collections into the catalog", function () {
    const merged = mergeExplorerCatalog(
      [
        { id: "wn", type: "watch-now", layout: "cover" },
        {
          id: "nested",
          type: "collection",
          layout: "magazine",
          libraryID: 1,
          collectionKey: "NESTED",
          enabled: false,
        },
      ],
      1,
      ["ROOT"],
    );
    assert.include(
      merged.map((shelf) => shelf.type),
      "upcoming-deadlines",
    );
    assert.isFalse(
      merged.some(
        (shelf) =>
          shelf.type === "collection" && shelf.collectionKey === "NESTED",
      ),
    );
    const root = merged.find(
      (shelf) => shelf.type === "collection" && shelf.collectionKey === "ROOT",
    );
    assert.ok(root);
    assert.isFalse(isExplorerShelfEnabled(root!));
    assert.isTrue(
      isExplorerShelfEnabled(
        merged.find((shelf) => shelf.type === "watch-now")!,
      ),
    );
  });

  it("fills saved searches into the catalog and drops disabled ones from other libraries", function () {
    const merged = mergeExplorerCatalog(
      [
        { id: "wn", type: "watch-now", layout: "cover" },
        {
          id: "other",
          type: "saved-search",
          layout: "magazine",
          libraryID: 2,
          searchKey: "GONE",
          enabled: false,
        },
        {
          id: "mine",
          type: "saved-search",
          layout: "magazine",
          libraryID: 1,
          searchKey: "MINE",
        },
      ],
      1,
      [],
      ["MINE", "NEW"],
    );
    assert.isFalse(
      merged.some(
        (shelf) => shelf.type === "saved-search" && shelf.searchKey === "GONE",
      ),
    );
    const mine = merged.find(
      (shelf) => shelf.type === "saved-search" && shelf.searchKey === "MINE",
    );
    assert.ok(mine);
    assert.isTrue(isExplorerShelfEnabled(mine!));
    const added = merged.find(
      (shelf) => shelf.type === "saved-search" && shelf.searchKey === "NEW",
    );
    assert.ok(added);
    assert.isFalse(isExplorerShelfEnabled(added!));
  });

  it("keeps a saved search that is missing keys out of coerced shelves", function () {
    const shelves = coerceExplorerShelves([
      { id: "ss", type: "saved-search", libraryID: 1 },
      { id: "wn", type: "watch-now" },
    ]);
    assert.deepEqual(
      shelves.map((shelf) => shelf.type),
      ["watch-now"],
    );
  });

  it("keeps watch and listen shelves on cover layout", function () {
    const shelves = coerceExplorerShelves([
      { id: "wn", type: "watch-now", layout: "magazine" },
      { id: "ln", type: "listen-now", layout: "card" },
    ]);
    assert.deepEqual(
      shelves.map((shelf) => shelf.layout),
      ["cover", "cover"],
    );
    assert.deepEqual(layoutsForExplorerShelf("watch-now"), ["cover"]);
    assert.deepEqual(layoutsForExplorerShelf("listen-now"), ["cover"]);
    assert.deepEqual(layoutsForExplorerShelf("recently-read"), [
      "cover",
      "magazine",
      "card",
    ]);
  });

  it("defaults recent-annotations size to small and large to limit 7", function () {
    const small = coerceExplorerShelves([
      { id: "ann", type: "recent-annotations" },
    ])[0];
    assert.equal(small.type, "recent-annotations");
    if (small.type === "recent-annotations") {
      assert.equal(small.size, "small");
      assert.equal(small.limit, 20);
    }
    const large = coerceExplorerShelves([
      { id: "ann", type: "recent-annotations", size: "large" },
    ])[0];
    assert.equal(large.type, "recent-annotations");
    if (large.type === "recent-annotations") {
      assert.equal(large.size, "large");
      assert.equal(large.limit, 7);
    }
  });
});
