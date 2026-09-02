import { assert } from "chai";
import { config } from "../package.json";
import {
  COLLECTION_ID_PREF_KEYS,
  liveSpecialViewKeySet,
  pruneStaleCollectionIdMap,
  pruneStaleCollectionPrefs,
} from "../src/utils/collectionPrefs";
import { zoteroCache } from "../src/utils/cache";

describe("collectionPrefs", function () {
  describe("pruneStaleCollectionIdMap", function () {
    it("drops keys that are not in the live id set", function () {
      const { next, removed } = pruneStaleCollectionIdMap(
        { "12": "gallery", "99": "syllabus", "3": "collection" },
        [12, 3],
      );
      assert.deepEqual(next, { "12": "gallery", "3": "collection" });
      assert.equal(removed, 1);
    });

    it("keeps saved-search and special-row keys that are in the live set", function () {
      const { next, removed } = pruneStaleCollectionIdMap(
        {
          "12": "gallery",
          S1: "gallery",
          T1: "gallery",
          Y1: "gallery",
          F1: "gallery",
          L42: "gallery",
          "99": "syllabus",
        },
        [12, "S1", "T1", "Y1", "F1", "L42"],
      );
      assert.deepEqual(next, {
        "12": "gallery",
        S1: "gallery",
        T1: "gallery",
        Y1: "gallery",
        F1: "gallery",
        L42: "gallery",
      });
      assert.equal(removed, 1);
    });

    it("can preserve unenumerated search keys", function () {
      const { next, removed } = pruneStaleCollectionIdMap(
        { "12": "gallery", S99: "gallery" },
        [12],
        { preserve: (key) => key.startsWith("S") },
      );
      assert.deepEqual(next, { "12": "gallery", S99: "gallery" });
      assert.equal(removed, 0);
    });

    it("keeps an empty map unchanged", function () {
      const { next, removed } = pruneStaleCollectionIdMap({}, [1]);
      assert.deepEqual(next, {});
      assert.equal(removed, 0);
    });
  });

  describe("liveSpecialViewKeySet", function () {
    it("includes the Feeds root and per-library specials", function () {
      const keys = liveSpecialViewKeySet();
      assert.isTrue(keys.has("F1"));
      const libraryID = Zotero.Libraries.userLibraryID;
      assert.isTrue(keys.has(`T${libraryID}`));
      assert.isTrue(keys.has(`D${libraryID}`));
      assert.isTrue(keys.has(`U${libraryID}`));
      assert.isTrue(keys.has(`Y${libraryID}`));
    });
  });

  describe("pruneStaleCollectionPrefs", function () {
    this.timeout(30_000);

    const previous = new Map<string, unknown>();
    const collections: Zotero.Collection[] = [];

    beforeEach(function () {
      previous.clear();
      for (const prefKey of COLLECTION_ID_PREF_KEYS) {
        previous.set(prefKey, Zotero.Prefs.get(prefKey, true));
      }
    });

    afterEach(async function () {
      const collectionIds = collections
        .map((collection) => collection.id)
        .filter(Boolean);
      collections.length = 0;
      if (collectionIds.length) {
        try {
          await Zotero.Collections.erase(collectionIds);
        } catch {
          /* profile is discarded after the run */
        }
      }
      for (const prefKey of COLLECTION_ID_PREF_KEYS) {
        const value = previous.get(prefKey);
        if (value === undefined) {
          try {
            Zotero.Prefs.clear(prefKey, true);
          } catch {
            /* already clear */
          }
        } else {
          Zotero.Prefs.set(prefKey, value as string | number | boolean, true);
        }
        zoteroCache.invalidatePref(prefKey);
      }
    });

    it("drops view-mode prefs for collections that no longer exist", async function () {
      const collection = new Zotero.Collection();
      collection.libraryID = Zotero.Libraries.userLibraryID;
      collection.name = "Stale pref collection";
      await collection.saveTx();
      collections.push(collection);

      const prefKey = `${config.prefsPrefix}.collectionViewModes`;
      const liveId = String(collection.id);
      Zotero.Prefs.set(
        prefKey,
        JSON.stringify({
          [liveId]: "gallery",
          "99999999": "syllabus",
          F1: "gallery",
          [`T${Zotero.Libraries.userLibraryID}`]: "gallery",
          [`Y${Zotero.Libraries.userLibraryID}`]: "gallery",
        }),
        true,
      );
      zoteroCache.invalidatePref(prefKey);

      const removed = pruneStaleCollectionPrefs(["99999999"]);
      assert.isAtLeast(removed, 1);

      const stored = JSON.parse(
        String(Zotero.Prefs.get(prefKey, true) || "{}"),
      );
      assert.equal(stored[liveId], "gallery");
      assert.notProperty(stored, "99999999");
      assert.equal(stored.F1, "gallery");
      assert.equal(stored[`T${Zotero.Libraries.userLibraryID}`], "gallery");
      assert.equal(stored[`Y${Zotero.Libraries.userLibraryID}`], "gallery");
    });
  });
});
