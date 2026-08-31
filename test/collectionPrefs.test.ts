import { assert } from "chai";
import { config } from "../package.json";
import {
  COLLECTION_ID_PREF_KEYS,
  pruneStaleCollectionIdMap,
  pruneStaleCollectionPrefs,
} from "../src/utils/collectionPrefs";
import { zoteroCache } from "../src/utils/cache";

describe("pruneStaleCollectionIdMap", function () {
  it("drops keys that are not in the live id set", function () {
    const { next, removed } = pruneStaleCollectionIdMap(
      { "12": "gallery", "99": "syllabus", "3": "collection" },
      [12, 3],
    );
    assert.deepEqual(next, { "12": "gallery", "3": "collection" });
    assert.equal(removed, 1);
  });

  it("keeps an empty map unchanged", function () {
    const { next, removed } = pruneStaleCollectionIdMap({}, [1]);
    assert.deepEqual(next, {});
    assert.equal(removed, 0);
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
      JSON.stringify({ [liveId]: "gallery", "99999999": "syllabus" }),
      true,
    );
    zoteroCache.invalidatePref(prefKey);

    const removed = pruneStaleCollectionPrefs(["99999999"]);
    assert.isAtLeast(removed, 1);

    const stored = JSON.parse(String(Zotero.Prefs.get(prefKey, true) || "{}"));
    assert.equal(stored[liveId], "gallery");
    assert.notProperty(stored, "99999999");
  });
});
