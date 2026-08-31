import { assert } from "chai";
import { placeItemInSyllabusDestinations } from "../src/modules/syllabusExtra";

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

describe("placeItemInSyllabusDestinations", function () {
  this.timeout(30_000);

  const collections: Zotero.Collection[] = [];
  const items: Zotero.Item[] = [];

  afterEach(async function () {
    const itemIds = items.map((item) => item.id).filter(Boolean);
    const collectionIds = collections
      .map((collection) => collection.id)
      .filter(Boolean);
    items.length = 0;
    collections.length = 0;
    if (itemIds.length) {
      try {
        await Zotero.Items.erase(itemIds);
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
