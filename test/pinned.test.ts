import { assert } from "chai";
import {
  applyPinnedShelfOrder,
  getNextUpAssignment,
  getPinnedCollectionReading,
  getSyllabusItemProgress,
  isPinnedCollectionMarkerNote,
  isPinnedItem,
  isPinnedSyllabus,
  movePinnedShelfEntry,
  noteHtmlToPlainText,
  PINNED_COLLECTION_TAG,
  PINNED_TAG,
  pinnedShelfEntryKey,
  resolvePinnedOrderLibraryID,
  setPinnedItem,
  setPinnedSyllabus,
} from "../src/modules/pinned";
import { PINNED_FOLDER_NAME } from "../src/modules/readingScheduleCollection";
import { CollectionSyllabusDocumentSchema } from "../src/utils/schemas";
import { dateKeyFromFolderName } from "../src/modules/readingScheduleCollection";

describe("pinned", function () {
  this.timeout(30_000);

  const items: Zotero.Item[] = [];

  afterEach(async function () {
    const ids = items.map((item) => item.id).filter(Boolean);
    items.length = 0;
    if (ids.length) {
      try {
        await Zotero.Items.erase(ids);
      } catch {
        /* profile discarded after run */
      }
    }
  });

  it("uses a stable untranslated folder name", function () {
    assert.equal(PINNED_FOLDER_NAME, "Pinned");
    assert.isNull(dateKeyFromFolderName(PINNED_FOLDER_NAME));
  });

  it("orders pinned shelf entries by saved keys then remainder", function () {
    const entries = [
      { key: pinnedShelfEntryKey("item", "a"), label: "A" },
      { key: pinnedShelfEntryKey("collection", "b"), label: "B" },
      { key: pinnedShelfEntryKey("item", "c"), label: "C" },
    ];
    const ordered = applyPinnedShelfOrder(entries, (entry) => entry.key, [
      pinnedShelfEntryKey("item", "c"),
      pinnedShelfEntryKey("collection", "b"),
    ]);
    assert.deepEqual(
      ordered.map((entry) => entry.label),
      ["C", "B", "A"],
    );
  });

  it("moves a pinned shelf entry like the explorer catalog", function () {
    const entries = ["a", "b", "c"];
    assert.deepEqual(movePinnedShelfEntry(entries, 0, 2), ["b", "a", "c"]);
    assert.deepEqual(movePinnedShelfEntry(entries, 2, 0), ["c", "a", "b"]);
    assert.deepEqual(movePinnedShelfEntry(entries, 1, 1), entries);
  });

  it("resolves order library when the schedule tab omits libraryID", function () {
    assert.equal(
      resolvePinnedOrderLibraryID(
        undefined,
        [{ libraryID: 1 }, { libraryID: 1 }],
        [{ libraryID: 1 }],
      ),
      1,
    );
    assert.isUndefined(
      resolvePinnedOrderLibraryID(
        undefined,
        [{ libraryID: 1 }],
        [{ libraryID: 2 }],
      ),
    );
    assert.equal(
      resolvePinnedOrderLibraryID(3, [{ libraryID: 1 }], [{ libraryID: 2 }]),
      3,
    );
  });

  it("strips note HTML for intention display", function () {
    assert.equal(
      noteHtmlToPlainText("<p>Read chapter&nbsp;1</p><p>Then notes</p>"),
      "Read chapter 1\n\nThen notes",
    );
  });

  it("tags and untags a regular item as pinned", async function () {
    const book = new Zotero.Item("book");
    book.libraryID = Zotero.Libraries.userLibraryID;
    book.setField("title", "Pinned test book");
    await book.saveTx();
    items.push(book);

    assert.isFalse(isPinnedItem(book));
    await setPinnedItem(book, true);
    assert.isTrue(book.hasTag(PINNED_TAG));
    assert.isTrue(isPinnedItem(book));
    await setPinnedItem(book, false);
    assert.isFalse(isPinnedItem(book));
  });

  it("picks the first incomplete assignment in class order", async function () {
    const first = new Zotero.Item("book");
    first.libraryID = Zotero.Libraries.userLibraryID;
    first.setField("title", "First reading");
    await first.saveTx();
    items.push(first);

    const second = new Zotero.Item("book");
    second.libraryID = Zotero.Libraries.userLibraryID;
    second.setField("title", "Second reading");
    await second.saveTx();
    items.push(second);

    const collection = new Zotero.Collection();
    collection.libraryID = Zotero.Libraries.userLibraryID;
    collection.name = "Pinned next-up course";
    await collection.saveTx();

    try {
      // Next-up resolves by library+key; items need not be in the collection.
      // Do not call collection.addItems outside Zotero.DB.executeTransaction.
      const document = CollectionSyllabusDocumentSchema.parse({
        version: 2,
        classes: {
          "class-a": { number: 1, title: "Week 1" },
          "class-b": { number: 2, title: "Week 2" },
        },
        classOrder: ["class-a", "class-b"],
        items: {
          [first.key]: [
            {
              id: "a1",
              classId: "class-a",
              status: "done",
              priority: "essential",
            },
          ],
          [second.key]: [
            {
              id: "a2",
              classId: "class-b",
              status: null,
              priority: "essential",
            },
          ],
        },
      });

      const next = getNextUpAssignment(collection, document);
      assert.isNotNull(next);
      assert.isTrue(next!.isSyllabus);
      assert.equal(next!.item!.id, second.id);
      assert.equal(next!.classNumber, 2);
      assert.equal(next!.assignment!.id, "a2");
      assert.deepEqual(
        next!.unreadItems.map((item) => item.id),
        [second.id],
      );
      assert.deepEqual(next!.progress, { done: 1, total: 2, percent: 50 });
    } finally {
      try {
        await collection.eraseTx({ deleteItems: false });
      } catch {
        /* ignore */
      }
    }
  });

  it("counts all items in done classes toward progress", async function () {
    const live: Zotero.Item[] = [];
    for (const title of ["A", "B", "C", "D"]) {
      const item = new Zotero.Item("book");
      item.libraryID = Zotero.Libraries.userLibraryID;
      item.setField("title", title);
      await item.saveTx();
      live.push(item);
      items.push(item);
    }
    const [a, b, c, d] = live;

    const document = CollectionSyllabusDocumentSchema.parse({
      version: 2,
      classes: {
        "class-a": { number: 1, title: "Week 1", status: "done" },
        "class-b": { number: 2, title: "Week 2" },
      },
      classOrder: ["class-a", "class-b"],
      items: {
        [a.key]: [
          {
            id: "a1",
            classId: "class-a",
            status: null,
            priority: "essential",
          },
        ],
        [b.key]: [
          {
            id: "a2",
            classId: "class-a",
            status: null,
            priority: "essential",
          },
        ],
        [c.key]: [
          {
            id: "b1",
            classId: "class-b",
            status: "done",
            priority: "essential",
          },
        ],
        [d.key]: [
          {
            id: "b2",
            classId: "class-b",
            status: null,
            priority: "essential",
          },
        ],
        // Deleted / missing keys must not inflate the denominator.
        ZZDELETED: [
          {
            id: "gone",
            classId: "class-b",
            status: null,
            priority: "essential",
          },
        ],
      },
    });
    const collection = {
      libraryID: Zotero.Libraries.userLibraryID,
    } as Zotero.Collection;
    assert.deepEqual(getSyllabusItemProgress(collection, document), {
      done: 3,
      total: 4,
      percent: 75,
    });
  });

  it("pins a non-syllabus collection via a marker note", async function () {
    const collection = new Zotero.Collection();
    collection.libraryID = Zotero.Libraries.userLibraryID;
    collection.name = "Pinned plain collection";
    await collection.saveTx();

    try {
      assert.isFalse(isPinnedSyllabus(collection));
      const ok = await setPinnedSyllabus(collection, true);
      assert.isTrue(ok);
      assert.isTrue(isPinnedSyllabus(collection));

      const children = collection.getChildItems(false, false) || [];
      const marker = children.find((item) =>
        isPinnedCollectionMarkerNote(item),
      );
      assert.isOk(marker);
      assert.isTrue(marker!.hasTag(PINNED_COLLECTION_TAG));
      assert.isTrue(marker!.hasTag(PINNED_TAG));
      items.push(marker!);

      const reading = getPinnedCollectionReading(collection);
      assert.isFalse(reading.isSyllabus);
      assert.isNull(reading.progress);
      assert.isNull(reading.classNumber);

      await setPinnedSyllabus(collection, false);
      assert.isFalse(isPinnedSyllabus(collection));
    } finally {
      try {
        await collection.eraseTx({ deleteItems: true });
      } catch {
        /* ignore */
      }
    }
  });
});
