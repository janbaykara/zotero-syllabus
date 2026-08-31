import { assert } from "chai";
import { CollectionSyllabusDocumentSchema } from "../src/utils/schemas";
import {
  libraryIDFromDocumentCacheRef,
  remapDocumentItemKeys,
  remapDocumentItemKeysByMap,
  selectItemKeyRemapForDocument,
} from "../src/modules/syllabusNote";

function sampleDocument() {
  return CollectionSyllabusDocumentSchema.parse({
    version: 2,
    classes: {
      "class-1": { number: 1, title: "Intro", status: null },
      "class-2": { number: 2, title: "Next", status: null },
    },
    items: {
      oldKeyA: [
        {
          id: "a1",
          classId: "class-1",
          priority: "essential",
        },
      ],
      keepKey: [
        {
          id: "k1",
          classId: "class-2",
          priority: "optional",
        },
      ],
    },
    itemIndex: {
      oldKeyA: { title: "Merged Away", doi: "10.1234/foo" },
      keepKey: { title: "Stays" },
    },
  });
}

describe("remapDocumentItemKeysByMap", function () {
  it("is a no-op when no mapped keys are present", function () {
    const document = sampleDocument();
    const result = remapDocumentItemKeysByMap(document, {
      missing: "other",
      oldKeyA: "oldKeyA",
    });
    assert.strictEqual(result, document);
  });

  it("moves assignments and itemIndex onto the surviving key", function () {
    const document = sampleDocument();
    const result = remapDocumentItemKeysByMap(document, {
      oldKeyA: "newKey",
    });
    assert.notStrictEqual(result, document);
    assert.isUndefined(result.items.oldKeyA);
    assert.lengthOf(result.items.newKey || [], 1);
    assert.equal(result.items.newKey?.[0]?.id, "a1");
    assert.equal(result.items.keepKey?.[0]?.id, "k1");
    assert.isUndefined(result.itemIndex?.oldKeyA);
    assert.equal(result.itemIndex?.newKey?.doi, "10.1234/foo");
    assert.equal(result.itemIndex?.keepKey?.title, "Stays");
  });

  it("concatenates assignments when the survivor already has some", function () {
    const document = sampleDocument();
    const result = remapDocumentItemKeysByMap(document, {
      oldKeyA: "keepKey",
    });
    assert.lengthOf(result.items.keepKey || [], 2);
    assert.equal(result.items.keepKey?.[0]?.id, "k1");
    assert.equal(result.items.keepKey?.[1]?.id, "a1");
    assert.isUndefined(result.items.oldKeyA);
    assert.equal(result.itemIndex?.keepKey?.title, "Stays");
    assert.isUndefined(result.itemIndex?.oldKeyA);
  });
});

describe("selectItemKeyRemapForDocument", function () {
  const keyMap = { oldKeyA: "newKey", other: "kept" };

  it("parses libraryID from a cache ref", function () {
    assert.equal(libraryIDFromDocumentCacheRef("1:ABC12345"), 1);
    assert.equal(libraryIDFromDocumentCacheRef("12:XYZ"), 12);
    assert.isNull(libraryIDFromDocumentCacheRef("ABC12345"));
    assert.isNull(libraryIDFromDocumentCacheRef(""));
  });

  it("applies remaps only to notes in the merge library", function () {
    const keys = ["oldKeyA", "keepKey"];
    assert.deepEqual(
      selectItemKeyRemapForDocument("1:ABC12345", 1, keys, keyMap),
      { oldKeyA: "newKey" },
    );
    assert.isNull(selectItemKeyRemapForDocument("2:ABC12345", 1, keys, keyMap));
    assert.isNull(
      selectItemKeyRemapForDocument("1:ABC12345", 1, ["keepKey"], keyMap),
    );
  });
});

describe("remapDocumentItemKeys", function () {
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

  it("matches a doi.org URL to a bare DOI in the item index", async function () {
    const item = new Zotero.Item("journalArticle");
    item.libraryID = Zotero.Libraries.userLibraryID;
    item.setField("title", "DOI remap");
    item.setField("DOI", "https://doi.org/10.1234/foo");
    await item.saveTx();
    items.push(item);

    const document = CollectionSyllabusDocumentSchema.parse({
      version: 2,
      classes: {
        "class-1": { number: 1, title: "Intro", status: null },
      },
      items: {
        oldKey: [{ id: "a1", classId: "class-1", priority: "essential" }],
      },
      itemIndex: {
        oldKey: { title: "DOI remap", doi: "10.1234/foo" },
      },
    });
    const result = remapDocumentItemKeys(document, [item]);
    assert.equal(Object.keys(result.items)[0], item.key);
    assert.isUndefined(result.items.oldKey);
  });

  it("matches ISBN-10 in the index to ISBN-13 on the item", async function () {
    const item = new Zotero.Item("book");
    item.libraryID = Zotero.Libraries.userLibraryID;
    item.setField("title", "ISBN remap");
    item.setField("ISBN", "978-0-306-40615-7");
    await item.saveTx();
    items.push(item);

    const document = CollectionSyllabusDocumentSchema.parse({
      version: 2,
      classes: {
        "class-1": { number: 1, title: "Intro", status: null },
      },
      items: {
        oldKey: [{ id: "a1", classId: "class-1", priority: "essential" }],
      },
      itemIndex: {
        oldKey: { title: "ISBN remap", isbn: "0-306-40615-2" },
      },
    });
    const result = remapDocumentItemKeys(document, [item]);
    assert.equal(Object.keys(result.items)[0], item.key);
  });
});
