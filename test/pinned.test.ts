import { assert } from "chai";
import {
  getNextUpAssignment,
  isPinnedItem,
  noteHtmlToPlainText,
  PINNED_TAG,
  setPinnedItem,
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
      assert.equal(next!.item.id, second.id);
      assert.equal(next!.classNumber, 2);
      assert.equal(next!.assignment.id, "a2");
    } finally {
      try {
        await collection.eraseTx({ deleteItems: false });
      } catch {
        /* ignore */
      }
    }
  });
});
