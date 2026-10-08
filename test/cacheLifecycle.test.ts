import { assert } from "chai";
import { getDefaultStore } from "jotai";
import { itemVersionAtomFamily } from "../src/modules/react-zotero-sync/item";
import { isItemRemovalEvent, isObjectLifecycleEvent } from "../src/utils/cache";

describe("cacheLifecycle", function () {
  describe("object lifecycle notifiers", function () {
    it("treats trash and restore as lifecycle events", function () {
      assert.isTrue(isObjectLifecycleEvent("trash"));
      assert.isTrue(isObjectLifecycleEvent("restore"));
      assert.isTrue(isObjectLifecycleEvent("delete"));
      assert.isTrue(isObjectLifecycleEvent("modify"));
      assert.isFalse(isObjectLifecycleEvent("refresh"));
      assert.isTrue(isItemRemovalEvent("trash"));
      assert.isTrue(isItemRemovalEvent("delete"));
      assert.isFalse(isItemRemovalEvent("modify"));
      assert.isFalse(isItemRemovalEvent("restore"));
    });
  });

  describe("itemVersionAtomFamily", function () {
    this.timeout(30_000);

    const items: Zotero.Item[] = [];

    afterEach(async function () {
      const ids = items.map((item) => item.id).filter(Boolean);
      items.length = 0;
      if (ids.length) {
        try {
          await Zotero.Items.erase(ids);
        } catch {
          /* profile is discarded after the run */
        }
      }
    });

    it("notifies subscribers when an item is trashed", async function () {
      const item = new Zotero.Item("book");
      item.libraryID = Zotero.Libraries.userLibraryID;
      item.setField("title", "Trashed from syllabus cache");
      await item.saveTx();
      items.push(item);

      const store = getDefaultStore();
      const versionAtom = itemVersionAtomFamily(item.id);
      let notifications = 0;
      const unsubscribe = store.sub(versionAtom, () => {
        notifications += 1;
      });
      try {
        // Mount the atom so onMount registers the Zotero notifier.
        store.get(versionAtom);

        item.deleted = true;
        await item.saveTx();
        const started = Date.now();
        while (notifications < 1 && Date.now() - started < 3000) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.isAtLeast(
          notifications,
          1,
          "item version atom should refresh on trash, not only delete",
        );
      } finally {
        unsubscribe();
      }
    });
  });
});
