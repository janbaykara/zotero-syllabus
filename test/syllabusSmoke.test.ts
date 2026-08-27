import { assert } from "chai";
import { isManagedClassFolderCollection } from "../src/modules/autoManagedCollection";
import { classSubcollectionName } from "../src/modules/classSubcollections";
import {
  SYLLABUS_NOTE_TAG,
  collectionHasSyllabusNote,
  getCollectionDocument,
  getHydratedItemAssignments,
  getSyllabusNoteId,
  isSyllabusNoteFile,
  mutateCollectionDocument,
  parseSyllabusNote,
  whenSyllabusNotesReady,
} from "../src/modules/syllabusNote";
import { generateClassId } from "../src/utils/schemas";

const CLASS_ID = generateClassId();

function childCollections(collection: Zotero.Collection): Zotero.Collection[] {
  const children = collection.getChildCollections();
  return Array.isArray(children) ? children : [];
}

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
  doi?: string,
): Promise<Zotero.Item> {
  const item = new Zotero.Item("book");
  item.libraryID = collection.libraryID;
  item.setField("title", title);
  if (doi) {
    item.setField("DOI", doi);
  }
  item.addToCollection(collection.id);
  await item.saveTx();
  return item;
}

function childItemIds(collection: Zotero.Collection): number[] {
  const asIds = collection.getChildItems(true);
  if (!Array.isArray(asIds) || asIds.length === 0) {
    const objects = collection.getChildItems();
    return Array.isArray(objects)
      ? objects.map((item: Zotero.Item) => item.id)
      : [];
  }
  if (typeof asIds[0] === "number") {
    return asIds as number[];
  }
  return (asIds as Zotero.Item[]).map((item) => item.id);
}

async function eraseCreated(
  collection: Zotero.Collection | null,
  items: Zotero.Item[],
): Promise<void> {
  const itemIds = items.map((item) => item.id).filter(Boolean);
  if (collection?.id) {
    for (const child of childCollections(collection)) {
      itemIds.push(...childItemIds(child));
    }
    itemIds.push(...childItemIds(collection));
  }
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length) {
    try {
      await Zotero.Items.erase(uniqueIds);
    } catch {
      /* profile is discarded after the run */
    }
  }
  if (collection?.id) {
    try {
      for (const child of childCollections(collection)) {
        await child.eraseTx();
      }
      await collection.eraseTx();
    } catch {
      /* profile is discarded after the run */
    }
  }
}

describe("syllabus smoke", function () {
  this.timeout(60_000);

  let collection: Zotero.Collection | null = null;
  const items: Zotero.Item[] = [];

  before(async function () {
    await whenSyllabusNotesReady();
  });

  afterEach(async function () {
    await eraseCreated(collection, items);
    collection = null;
    items.length = 0;
  });

  it("creates a tagged syllabus note and persists course metadata", async function () {
    collection = await createCollection("Smoke Syllabus Course");
    const saved = await mutateCollectionDocument(
      collection,
      (document) => ({
        ...document,
        courseCode: "EDU101",
        institution: "Test University",
        description: "Core syllabus smoke test",
        nomenclature: "week",
        links: ["https://example.edu/syllabus"],
      }),
      { createNote: "always" },
    );

    assert.isTrue(collectionHasSyllabusNote(collection));
    const noteId = getSyllabusNoteId(collection);
    assert.isNumber(noteId);
    const note = Zotero.Items.get(noteId!);
    assert.isTrue(note.isNote());
    assert.isTrue(note.hasTag(SYLLABUS_NOTE_TAG));
    assert.include(note.getCollections(), collection.id);
    assert.isTrue(isSyllabusNoteFile(note.getNote()));

    const document = getCollectionDocument(collection);
    assert.equal(document.courseCode, "EDU101");
    assert.equal(document.institution, "Test University");
    assert.equal(document.description, "Core syllabus smoke test");
    assert.equal(saved.courseCode, "EDU101");
  });

  it("assigns a reading to a class and round-trips the live note", async function () {
    collection = await createCollection("Smoke Syllabus Readings");
    const book = await createBook(
      collection,
      "Smoke Test Book",
      "10.1234/smoke",
    );
    items.push(book);

    await mutateCollectionDocument(
      collection,
      (document) => ({
        ...document,
        courseCode: "EDU202",
        nomenclature: "week",
        classes: {
          [CLASS_ID]: {
            number: 1,
            title: "Intro",
            status: null,
          },
        },
        items: {
          [book.key]: [
            {
              classId: CLASS_ID,
              priority: "essential",
              classInstruction: "Read pp. 1-20",
            },
          ],
        },
      }),
      { createNote: "always" },
    );

    const document = getCollectionDocument(collection);
    const assignments = getHydratedItemAssignments(document, book.key);
    assert.lengthOf(assignments, 1);
    assert.equal(assignments[0]?.classId, CLASS_ID);
    assert.equal(assignments[0]?.classNumber, 1);
    assert.equal(assignments[0]?.priority, "essential");
    assert.equal(assignments[0]?.classInstruction, "Read pp. 1-20");
    assert.equal(document.classes?.[CLASS_ID]?.title, "Intro");

    const note = Zotero.Items.get(getSyllabusNoteId(collection)!);
    const parsed = parseSyllabusNote(note.getNote());
    assert.isNotNull(parsed);
    assert.equal(parsed!.courseCode, "EDU202");
    assert.equal(parsed!.items[book.key]?.[0]?.classId, CLASS_ID);
    assert.include(note.getNote(), "Smoke Test Book");
  });

  it("creates a class folder and puts assigned items in it", async function () {
    collection = await createCollection("Smoke Syllabus Folders");
    const book = await createBook(collection, "Folder Smoke Book");
    items.push(book);
    const expectedName = classSubcollectionName("week", 1, "Seminar");

    const saved = await mutateCollectionDocument(
      collection,
      (document) => ({
        ...document,
        nomenclature: "week",
        createSubcollections: true,
        classes: {
          [CLASS_ID]: {
            number: 1,
            title: "Seminar",
            status: null,
          },
        },
        items: {
          [book.key]: [{ classId: CLASS_ID, priority: "essential" }],
        },
      }),
      { createNote: "always" },
    );

    const folderKey = saved.classes?.[CLASS_ID]?.subcollectionKey;
    assert.isString(folderKey);
    const folder = Zotero.Collections.getByLibraryAndKey(
      collection.libraryID,
      folderKey!,
    );
    assert.ok(folder);
    assert.equal(folder.parentID, collection.id);
    assert.equal(folder.name, expectedName);
    assert.isTrue(isManagedClassFolderCollection(folder.id));

    const folderItemIds = childItemIds(folder);
    assert.include(folderItemIds, book.id);
    assert.include(book.getCollections(), collection.id);
    assert.include(book.getCollections(), folder.id);
  });
});
