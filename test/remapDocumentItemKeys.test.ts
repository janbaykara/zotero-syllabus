import { assert } from "chai";
import { CollectionSyllabusDocumentSchema } from "../src/utils/schemas";
import {
  documentForWrite,
  emptyCollectionDocument,
  getHydratedItemAssignments,
  libraryIDFromDocumentCacheRef,
  omitDocumentItemKeys,
  remapDocumentItemKeys,
  remapDocumentItemKeysByMap,
  selectItemKeyRemapForDocument,
  shouldAdoptIncomingNote,
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

describe("getHydratedItemAssignments", function () {
  it("reads rows from keys the surviving item replaces", function () {
    const document = sampleDocument();
    const item = {
      key: "newKey",
      getRelationsByPredicate: () => [
        "http://zotero.org/users/0/items/oldKeyA",
      ],
    } as unknown as Zotero.Item;
    const rows = getHydratedItemAssignments(document, "newKey", item);
    assert.lengthOf(rows, 1);
    assert.equal(rows[0]?.id, "a1");
    assert.equal(rows[0]?.classId, "class-1");
  });

  it("does not duplicate rows after the note has been remapped", function () {
    const remapped = remapDocumentItemKeysByMap(sampleDocument(), {
      oldKeyA: "newKey",
    });
    const item = {
      key: "newKey",
      getRelationsByPredicate: () => [
        "http://zotero.org/users/0/items/oldKeyA",
      ],
    } as unknown as Zotero.Item;
    const rows = getHydratedItemAssignments(remapped, "newKey", item);
    assert.lengthOf(rows, 1);
    assert.equal(rows[0]?.id, "a1");
  });
});

describe("omitDocumentItemKeys", function () {
  it("drops assignments and itemIndex for keys that are gone", function () {
    const document = sampleDocument();
    const result = omitDocumentItemKeys(document, ["oldKeyA", "missing"]);
    assert.notStrictEqual(result, document);
    assert.isUndefined(result.items.oldKeyA);
    assert.equal(result.items.keepKey?.[0]?.id, "k1");
    assert.isUndefined(result.itemIndex?.oldKeyA);
    assert.equal(result.itemIndex?.keepKey?.title, "Stays");
  });

  it("is a no-op when none of the keys are present", function () {
    const document = sampleDocument();
    assert.strictEqual(omitDocumentItemKeys(document, ["nope"]), document);
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

  it("matches a pubmed URL to a PMID in the item index", async function () {
    const item = new Zotero.Item("journalArticle");
    item.libraryID = Zotero.Libraries.userLibraryID;
    item.setField("title", "PMID remap");
    item.setField("url", "https://pubmed.ncbi.nlm.nih.gov/12345678/");
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
        oldKey: { title: "PMID remap", pmid: "12345678" },
      },
    });
    const result = remapDocumentItemKeys(document, [item]);
    assert.equal(Object.keys(result.items)[0], item.key);
  });

  it("matches Extra arXiv to an abs URL on the item", async function () {
    const item = new Zotero.Item("journalArticle");
    item.libraryID = Zotero.Libraries.userLibraryID;
    item.setField("title", "arXiv remap");
    item.setField("url", "https://arxiv.org/abs/2301.12345v2");
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
        oldKey: { title: "arXiv remap", arxiv: "2301.12345" },
      },
    });
    const result = remapDocumentItemKeys(document, [item]);
    assert.equal(Object.keys(result.items)[0], item.key);
  });

  it("matches Extra PMID on the item to a stored pmid", async function () {
    const item = new Zotero.Item("journalArticle");
    item.libraryID = Zotero.Libraries.userLibraryID;
    item.setField("title", "Local copy");
    item.setField("extra", "PMID: 12345678");
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
        oldKey: { title: "Imported title", pmid: "12345678" },
      },
    });
    const result = remapDocumentItemKeys(document, [item]);
    assert.equal(Object.keys(result.items)[0], item.key);
  });

  it("does not steal assignments when two items share a title", async function () {
    const first = new Zotero.Item("letter");
    first.libraryID = Zotero.Libraries.userLibraryID;
    first.setField("title", "Letter to Smith");
    await first.saveTx();
    items.push(first);

    const second = new Zotero.Item("letter");
    second.libraryID = Zotero.Libraries.userLibraryID;
    second.setField("title", "Letter to Smith");
    await second.saveTx();
    items.push(second);

    const document = CollectionSyllabusDocumentSchema.parse({
      version: 2,
      classes: {
        "class-1": { number: 1, title: "Intro", status: null },
      },
      items: {
        oldKey: [{ id: "a1", classId: "class-1", priority: "essential" }],
      },
      itemIndex: {
        oldKey: { title: "Letter to Smith" },
      },
    });
    const result = remapDocumentItemKeys(document, [first, second]);
    assert.equal(Object.keys(result.items)[0], "oldKey");
    assert.isUndefined(result.items[first.key]);
    assert.isUndefined(result.items[second.key]);
  });

  it("still remaps a unique title when the old key is gone", async function () {
    const item = new Zotero.Item("book");
    item.libraryID = Zotero.Libraries.userLibraryID;
    item.setField("title", "Only Copy of This Title");
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
        oldKey: { title: "Only Copy of This Title" },
      },
    });
    const result = remapDocumentItemKeys(document, [item]);
    assert.equal(Object.keys(result.items)[0], item.key);
  });

  it("keeps a live key even when another item shares the title", async function () {
    const original = new Zotero.Item("letter");
    original.libraryID = Zotero.Libraries.userLibraryID;
    original.setField("title", "Letter to Smith");
    await original.saveTx();
    items.push(original);

    const copy = new Zotero.Item("letter");
    copy.libraryID = Zotero.Libraries.userLibraryID;
    copy.setField("title", "Letter to Smith");
    await copy.saveTx();
    items.push(copy);

    const document = CollectionSyllabusDocumentSchema.parse({
      version: 2,
      classes: {
        "class-1": { number: 1, title: "Intro", status: null },
      },
      items: {
        [original.key]: [
          { id: "a1", classId: "class-1", priority: "essential" },
        ],
      },
      itemIndex: {
        [original.key]: { title: "Letter to Smith" },
      },
    });
    const result = remapDocumentItemKeys(document, [original, copy]);
    assert.equal(Object.keys(result.items)[0], original.key);
    assert.isUndefined(result.items[copy.key]);
  });
});

describe("documentForWrite", function () {
  it("does not resurrect classes that the live note already dropped", function () {
    const fromNote = CollectionSyllabusDocumentSchema.parse({
      version: 2,
      classes: {
        "class-1": { number: 1, title: "Kept", status: null },
      },
      items: {},
    });
    const cached = CollectionSyllabusDocumentSchema.parse({
      version: 2,
      classes: {
        "class-1": { number: 1, title: "Kept", status: null },
        "class-gone": { number: 2, title: "Deleted elsewhere", status: null },
      },
      items: {
        oldKey: [{ id: "a1", classId: "class-gone", priority: "essential" }],
      },
    });
    const result = documentForWrite(fromNote, cached);
    assert.strictEqual(result, fromNote);
    assert.isUndefined(result.classes["class-gone"]);
    assert.isUndefined(result.items.oldKey);
  });

  it("falls back to a non-empty cache when the note did not parse", function () {
    const cached = CollectionSyllabusDocumentSchema.parse({
      version: 2,
      classes: {
        "class-1": { number: 1, title: "Cached", status: null },
      },
      items: {},
    });
    const result = documentForWrite(null, cached);
    assert.equal(result.classes["class-1"]?.title, "Cached");
  });
});

describe("shouldAdoptIncomingNote", function () {
  const cachedDoc = CollectionSyllabusDocumentSchema.parse({
    version: 2,
    courseCode: "LOCAL",
    classes: { "class-1": { number: 1, title: "Local", status: null } },
    items: {},
  });
  const remoteDoc = CollectionSyllabusDocumentSchema.parse({
    version: 2,
    courseCode: "REMOTE",
    classes: { "class-1": { number: 1, title: "Remote", status: null } },
    items: {},
  });
  const emptyDoc = emptyCollectionDocument();
  const cached = {
    noteId: 10,
    noteVersion: 5,
    document: cachedDoc,
  };

  it("ignores an echo of the version already in cache", function () {
    assert.equal(
      shouldAdoptIncomingNote({
        writeInFlight: true,
        cached,
        itemId: 10,
        itemVersion: 5,
        parsed: remoteDoc,
      }),
      "ignore",
    );
  });

  it("applies a newer parseable note even while a write is in flight", function () {
    assert.equal(
      shouldAdoptIncomingNote({
        writeInFlight: true,
        cached,
        itemId: 10,
        itemVersion: 6,
        parsed: remoteDoc,
      }),
      "apply",
    );
  });

  it("does not bump version on an empty payload during a write", function () {
    assert.equal(
      shouldAdoptIncomingNote({
        writeInFlight: true,
        cached,
        itemId: 10,
        itemVersion: 6,
        parsed: emptyDoc,
      }),
      "ignore",
    );
    assert.equal(
      shouldAdoptIncomingNote({
        writeInFlight: true,
        cached,
        itemId: 10,
        itemVersion: 6,
        parsed: null,
      }),
      "ignore",
    );
  });

  it("keeps a non-empty cache when a later idle modify does not parse", function () {
    assert.equal(
      shouldAdoptIncomingNote({
        writeInFlight: false,
        cached,
        itemId: 10,
        itemVersion: 6,
        parsed: emptyDoc,
      }),
      "keep-cache",
    );
  });

  it("applies a newer note when no write is in flight", function () {
    assert.equal(
      shouldAdoptIncomingNote({
        writeInFlight: false,
        cached,
        itemId: 10,
        itemVersion: 6,
        parsed: remoteDoc,
      }),
      "apply",
    );
  });
});
