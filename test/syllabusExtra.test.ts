import { assert } from "chai";
import { ExtraFieldTool } from "zotero-plugin-toolkit";
import {
  absorbSyllabusExtraFromItems,
  placeItemInSyllabusDestinations,
} from "../src/modules/syllabusExtra";
import {
  SYLLABUS_EXTRA_KEY,
  collectionRefFromCollection,
  mutateCollectionDocument,
  peekPersistedSyllabusDocument,
} from "../src/modules/syllabusNote";

const extraFieldTool = new ExtraFieldTool();

async function createCollection(name: string): Promise<Zotero.Collection> {
  const collection = new Zotero.Collection();
  collection.libraryID = Zotero.Libraries.userLibraryID;
  collection.name = name;
  await collection.saveTx();
  return collection;
}

async function createBook(
  collection: Zotero.Collection,
  title: string,
): Promise<Zotero.Item> {
  const item = new Zotero.Item("book");
  item.libraryID = collection.libraryID;
  item.setField("title", title);
  item.addToCollection(collection.id);
  await item.saveTx();
  return item;
}

async function eraseCreated(
  collections: Zotero.Collection[],
  items: Zotero.Item[],
): Promise<void> {
  const itemIds = items.map((item) => item.id).filter(Boolean);
  for (const collection of collections) {
    try {
      const children = collection.getChildItems() || [];
      for (const child of children) {
        if (child?.id) {
          itemIds.push(child.id);
        }
      }
    } catch {
      /* collection may already be gone */
    }
  }
  const collectionIds = collections
    .map((collection) => collection.id)
    .filter(Boolean);
  items.length = 0;
  collections.length = 0;
  const uniqueItemIds = [...new Set(itemIds)];
  if (uniqueItemIds.length) {
    try {
      await Zotero.Items.erase(uniqueItemIds);
    } catch {
      /* profile is discarded after the run */
    }
  }
  if (collectionIds.length) {
    try {
      await Zotero.Collections.erase(collectionIds);
    } catch {
      /* profile is discarded after the run */
    }
  }
}

describe("placeItemInSyllabusDestinations", function () {
  this.timeout(30_000);

  const collections: Zotero.Collection[] = [];
  const items: Zotero.Item[] = [];

  afterEach(async function () {
    await eraseCreated(collections, items);
  });

  it("keeps the item in every Extra destination when there are two", async function () {
    const first = await createCollection("Syllabus Extra A");
    const second = await createCollection("Syllabus Extra B");
    collections.push(first, second);
    const item = await createBook(first, "Shared reading");
    items.push(item);

    placeItemInSyllabusDestinations(item, [first, second]);
    await item.saveTx();

    const ids = item.getCollections();
    assert.include(ids, first.id);
    assert.include(ids, second.id);
  });

  it("moves the item when Extra names a single collection", async function () {
    const source = await createCollection("Syllabus Extra Source");
    const destination = await createCollection("Syllabus Extra Dest");
    collections.push(source, destination);
    const item = await createBook(source, "Imported reading");
    items.push(item);

    placeItemInSyllabusDestinations(item, [destination]);
    await item.saveTx();

    const ids = item.getCollections();
    assert.notInclude(ids, source.id);
    assert.include(ids, destination.id);
  });
});

describe("absorbSyllabusExtraFromItems", function () {
  this.timeout(30_000);

  const collections: Zotero.Collection[] = [];
  const items: Zotero.Item[] = [];

  afterEach(async function () {
    await eraseCreated(collections, items);
  });

  it("does not write Extra from items already in the trash", async function () {
    const collection = await createCollection("Syllabus Extra Trash");
    collections.push(collection);
    await mutateCollectionDocument(collection, (document) => document, {
      createNote: "always",
    });
    const item = await createBook(collection, "Trashed Extra reading");
    items.push(item);

    const extraPayload = {
      [collectionRefFromCollection(collection)]: [
        {
          id: "assignment-trashed-extra",
          classNumber: 1,
          priority: "essential",
        },
      ],
    };
    await extraFieldTool.setExtraField(
      item,
      SYLLABUS_EXTRA_KEY,
      JSON.stringify(extraPayload),
    );

    item.deleted = true;
    await item.saveTx();

    await absorbSyllabusExtraFromItems([item]);

    assert.include(String(item.getField("extra") || ""), SYLLABUS_EXTRA_KEY);
    const document = peekPersistedSyllabusDocument(collection);
    assert.notProperty(document?.items || {}, item.key);
  });
});
