import { assert } from "chai";
import { config } from "../package.json";
import { zoteroCache } from "../src/utils/cache";
import {
  coerceExplorerShelves,
  createCollectionShelf,
  defaultExplorerShelves,
  explorerShelfGroupBy,
  explorerShelfSortBy,
  getExplorerShelves,
  isCollectionShelfOnHome,
  isExplorerShelfEnabled,
  layoutsForExplorerShelf,
  mergeExplorerCatalog,
  withToggledCollectionShelf,
} from "../src/modules/explorerConfig";

const SHELVES_PREF = `${config.prefsPrefix}.explorerShelves`;
const COLLECTION_COVER_MIGRATION_PREF = `${config.prefsPrefix}.explorerCollectionCoverDefault`;
const DEADLINES_COVER_MIGRATION_PREF = `${config.prefsPrefix}.explorerDeadlinesCoverDefault`;

describe("explorer shelves", function () {
  it("puts pinned and upcoming deadlines first on the default homepage", function () {
    assert.deepEqual(
      defaultExplorerShelves().map((shelf) => shelf.type),
      [
        "pinned",
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

  it("replaces the previous media default with pinned and deadlines first", function () {
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
      "pinned",
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

  it("keeps watch, listen, and pinned shelves on cover layout", function () {
    const shelves = coerceExplorerShelves([
      { id: "wn", type: "watch-now", layout: "magazine" },
      { id: "ln", type: "listen-now", layout: "card" },
      { id: "pin", type: "pinned", layout: "magazine" },
    ]);
    assert.deepEqual(
      shelves.map((shelf) => shelf.layout),
      ["cover", "cover", "cover"],
    );
    assert.deepEqual(layoutsForExplorerShelf("watch-now"), ["cover"]);
    assert.deepEqual(layoutsForExplorerShelf("listen-now"), ["cover"]);
    assert.deepEqual(layoutsForExplorerShelf("pinned"), ["cover"]);
    assert.deepEqual(layoutsForExplorerShelf("upcoming-deadlines"), [
      "card",
      "cover",
      "magazine",
    ]);
    assert.deepEqual(layoutsForExplorerShelf("recently-read"), [
      "card",
      "cover",
      "magazine",
    ]);
  });

  it("defaults upcoming deadlines to cover layout", function () {
    assert.equal(
      defaultExplorerShelves().find(
        (shelf) => shelf.type === "upcoming-deadlines",
      )?.layout,
      "cover",
    );
    const shelves = coerceExplorerShelves([
      { id: "upcoming-deadlines", type: "upcoming-deadlines" },
    ]);
    assert.equal(shelves[0]?.layout, "cover");
  });

  it("upgrades the pre-pinned default homepage to include Pinned", function () {
    const shelves = coerceExplorerShelves([
      {
        id: "upcoming-deadlines",
        type: "upcoming-deadlines",
        layout: "card",
      },
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

  it("keeps a fixed depth for recent-annotations shelves", function () {
    const shelf = coerceExplorerShelves([
      { id: "ann", type: "recent-annotations", size: "large", limit: 5 },
    ])[0];
    assert.equal(shelf.type, "recent-annotations");
    if (shelf.type === "recent-annotations") {
      assert.equal(shelf.limit, 20);
    }
    assert.deepEqual(layoutsForExplorerShelf("recent-annotations"), ["card"]);
  });

  it("defaults new collection shelves to Cover / classes / auto", function () {
    const shelf = createCollectionShelf("c1", 1, "ABC");
    assert.equal(shelf.layout, "cover");
    assert.equal(shelf.groupBy, "classes");
    assert.equal(shelf.sortBy, "auto");
    assert.equal(explorerShelfSortBy(shelf), "auto");
    assert.equal(
      explorerShelfGroupBy(shelf, { classes: true, magazine: false }),
      "classes",
    );
    assert.equal(
      explorerShelfGroupBy(shelf, { classes: false, magazine: false }),
      "none",
    );
  });

  it("coerces collection shelf groupBy and sortBy with Gallery gates", function () {
    const shelves = coerceExplorerShelves([
      {
        id: "c",
        type: "collection",
        libraryID: 1,
        collectionKey: "K",
        layout: "cover",
        groupBy: "auto",
        sortBy: "title",
      },
      {
        id: "c2",
        type: "collection",
        libraryID: 1,
        collectionKey: "K2",
        layout: "magazine",
        groupBy: "auto",
      },
      {
        id: "c3",
        type: "collection",
        libraryID: 1,
        collectionKey: "K3",
      },
    ]);
    const cover = shelves.find((s) => s.id === "c");
    const mag = shelves.find((s) => s.id === "c2");
    const legacy = shelves.find((s) => s.id === "c3");
    assert.ok(cover && cover.type === "collection");
    assert.ok(mag && mag.type === "collection");
    assert.ok(legacy && legacy.type === "collection");
    if (
      cover?.type === "collection" &&
      mag?.type === "collection" &&
      legacy?.type === "collection"
    ) {
      assert.equal(cover.groupBy, "auto");
      assert.equal(cover.sortBy, "title");
      assert.equal(
        explorerShelfGroupBy(cover, { classes: true, magazine: false }),
        "none",
      );
      assert.equal(explorerShelfSortBy(cover), "title");
      assert.equal(
        explorerShelfGroupBy(mag, { classes: true, magazine: true }),
        "auto",
      );
      assert.equal(explorerShelfSortBy(legacy), "auto");
      assert.equal(
        explorerShelfGroupBy(legacy, { classes: true, magazine: false }),
        "classes",
      );
    }
  });

  it("toggles a collection onto and off Home", function () {
    const base = defaultExplorerShelves();
    const added = withToggledCollectionShelf(base, 1, "NESTED");
    assert.isTrue(isCollectionShelfOnHome(added, 1, "NESTED"));
    const shelf = added.find(
      (row) => row.type === "collection" && row.collectionKey === "NESTED",
    );
    assert.ok(shelf);
    assert.equal(shelf!.id, "catalog:collection:1:NESTED");
    if (shelf!.type === "collection") {
      assert.equal(shelf.layout, "cover");
      assert.equal(shelf.groupBy, "classes");
      assert.equal(shelf.sortBy, "auto");
    }
    assert.equal(added.length, base.length + 1);

    const removed = withToggledCollectionShelf(added, 1, "NESTED");
    assert.isFalse(isCollectionShelfOnHome(removed, 1, "NESTED"));
    assert.equal(removed.length, base.length);
  });

  it("re-enables a disabled collection shelf instead of duplicating it", function () {
    const shelves = [
      ...defaultExplorerShelves(),
      {
        id: "catalog:collection:1:ROOT",
        type: "collection" as const,
        layout: "magazine" as const,
        libraryID: 1,
        collectionKey: "ROOT",
        enabled: false,
      },
    ];
    assert.isFalse(isCollectionShelfOnHome(shelves, 1, "ROOT"));
    const enabled = withToggledCollectionShelf(shelves, 1, "ROOT");
    assert.isTrue(isCollectionShelfOnHome(enabled, 1, "ROOT"));
    assert.equal(
      enabled.filter(
        (row) => row.type === "collection" && row.collectionKey === "ROOT",
      ).length,
      1,
    );
  });

  it("migrates stored Magazine collection shelves to Cover once", function () {
    const previousShelves = Zotero.Prefs.get(SHELVES_PREF, true);
    const previousCollectionFlag = Zotero.Prefs.get(
      COLLECTION_COVER_MIGRATION_PREF,
      true,
    );
    const previousDeadlinesFlag = Zotero.Prefs.get(
      DEADLINES_COVER_MIGRATION_PREF,
      true,
    );
    try {
      try {
        Zotero.Prefs.clear(COLLECTION_COVER_MIGRATION_PREF, true);
      } catch {
        /* already clear */
      }
      try {
        Zotero.Prefs.clear(DEADLINES_COVER_MIGRATION_PREF, true);
      } catch {
        /* already clear */
      }
      zoteroCache.invalidatePref(COLLECTION_COVER_MIGRATION_PREF);
      zoteroCache.invalidatePref(DEADLINES_COVER_MIGRATION_PREF);

      Zotero.Prefs.set(
        SHELVES_PREF,
        JSON.stringify([
          {
            id: "catalog:collection:1:OLD",
            type: "collection",
            layout: "magazine",
            libraryID: 1,
            collectionKey: "OLD",
            enabled: false,
          },
          {
            id: "catalog:collection:1:KEEP",
            type: "collection",
            layout: "card",
            libraryID: 1,
            collectionKey: "KEEP",
          },
        ]),
        true,
      );
      zoteroCache.invalidatePref(SHELVES_PREF);

      const shelves = getExplorerShelves();
      const oldShelf = shelves.find(
        (row) => row.type === "collection" && row.collectionKey === "OLD",
      );
      const keepShelf = shelves.find(
        (row) => row.type === "collection" && row.collectionKey === "KEEP",
      );
      assert.equal(oldShelf?.layout, "cover");
      assert.equal(keepShelf?.layout, "card");
      assert.isTrue(!!Zotero.Prefs.get(COLLECTION_COVER_MIGRATION_PREF, true));

      // Second load must not rewrite intentional Magazine after the bump.
      Zotero.Prefs.set(
        SHELVES_PREF,
        JSON.stringify([
          {
            id: "catalog:collection:1:CHOSEN",
            type: "collection",
            layout: "magazine",
            libraryID: 1,
            collectionKey: "CHOSEN",
          },
        ]),
        true,
      );
      zoteroCache.invalidatePref(SHELVES_PREF);
      const after = getExplorerShelves();
      assert.equal(
        after.find(
          (row) => row.type === "collection" && row.collectionKey === "CHOSEN",
        )?.layout,
        "magazine",
      );
    } finally {
      if (previousShelves === undefined) {
        try {
          Zotero.Prefs.clear(SHELVES_PREF, true);
        } catch {
          /* already clear */
        }
      } else {
        Zotero.Prefs.set(SHELVES_PREF, previousShelves as string, true);
      }
      if (previousCollectionFlag === undefined) {
        try {
          Zotero.Prefs.clear(COLLECTION_COVER_MIGRATION_PREF, true);
        } catch {
          /* already clear */
        }
      } else {
        Zotero.Prefs.set(
          COLLECTION_COVER_MIGRATION_PREF,
          previousCollectionFlag as boolean,
          true,
        );
      }
      if (previousDeadlinesFlag === undefined) {
        try {
          Zotero.Prefs.clear(DEADLINES_COVER_MIGRATION_PREF, true);
        } catch {
          /* already clear */
        }
      } else {
        Zotero.Prefs.set(
          DEADLINES_COVER_MIGRATION_PREF,
          previousDeadlinesFlag as boolean,
          true,
        );
      }
      zoteroCache.invalidatePref(SHELVES_PREF);
      zoteroCache.invalidatePref(COLLECTION_COVER_MIGRATION_PREF);
      zoteroCache.invalidatePref(DEADLINES_COVER_MIGRATION_PREF);
    }
  });
});
