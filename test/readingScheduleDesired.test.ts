import { assert } from "chai";
import {
  buildReadingScheduleDesiredByLibrary,
  buildReadingScheduleDesiredItems,
  parseReadingScheduleRootKeys,
} from "../src/modules/readingScheduleCollection";
import { CollectionSyllabusDocumentSchema } from "../src/utils/schemas";
import { toLocalDateKey } from "../src/utils/dates";

function datedDocument(itemKey: string) {
  const today = toLocalDateKey(new Date());
  return CollectionSyllabusDocumentSchema.parse({
    version: 2,
    classes: {
      "class-1": {
        number: 1,
        title: "Seminar",
        readingDate: today,
        status: null,
      },
    },
    items: {
      [itemKey]: [{ id: "a1", classId: "class-1", priority: "essential" }],
    },
  });
}

describe("parseReadingScheduleRootKeys", function () {
  it("treats a bare key as My Library", function () {
    assert.deepEqual(parseReadingScheduleRootKeys("AAAAAAAA", 1), {
      "1": "AAAAAAAA",
    });
  });

  it("reads a JSON map of library id to collection key", function () {
    assert.deepEqual(
      parseReadingScheduleRootKeys('{"1":"AAAAAAAA","2":"BBBBBBBB"}', 1),
      { "1": "AAAAAAAA", "2": "BBBBBBBB" },
    );
  });

  it("reads an already-parsed pref object", function () {
    assert.deepEqual(
      parseReadingScheduleRootKeys({ "1": "AAAAAAAA", "5": "CCCCCCCC" }, 1),
      { "1": "AAAAAAAA", "5": "CCCCCCCC" },
    );
  });

  it("returns an empty map for a blank pref", function () {
    assert.deepEqual(parseReadingScheduleRootKeys("", 1), {});
  });
});

describe("buildReadingScheduleDesiredByLibrary", function () {
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

  it("keeps group-library syllabi in a separate date map", async function () {
    const book = new Zotero.Item("book");
    book.libraryID = Zotero.Libraries.userLibraryID;
    book.setField("title", "Schedule grouping book");
    await book.saveTx();
    items.push(book);

    const userLibraryID = Zotero.Libraries.userLibraryID;
    const document = datedDocument(book.key);
    const result = buildReadingScheduleDesiredByLibrary([
      { libraryID: userLibraryID, document },
      { libraryID: 2, document },
    ]);

    assert.isTrue(result.has(userLibraryID));
    assert.isTrue(result.has(2), "group syllabi must not be dropped");
    const userDates = result.get(userLibraryID)!;
    assert.isAtLeast(userDates.size, 1);
    const today = toLocalDateKey(new Date());
    assert.include(userDates.get(today) || [], book.id);
  });

  it("includes items from a non-user library id in a single-library map", function () {
    const document = datedDocument("ITEMKEY1");
    const itemsByDate = buildReadingScheduleDesiredItems([
      { libraryID: 2, document },
    ]);
    assert.isAtLeast(itemsByDate.size, 1);
  });
});
