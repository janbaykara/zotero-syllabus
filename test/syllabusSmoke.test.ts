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
  resolveSyllabusRoot,
  whenSyllabusNotesReady,
} from "../src/modules/syllabusNote";
import { generateClassId } from "../src/utils/schemas";

const CLASS_ID = generateClassId();

function childCollections(collection: Zotero.Collection): Zotero.Collection[] {
  const children = collection.getChildCollections();
  return Array.isArray(children) ? children : [];
}

/** Deepest-first descendants (not including `collection`). */
function descendantCollections(
  collection: Zotero.Collection,
): Zotero.Collection[] {
  const out: Zotero.Collection[] = [];
  const walk = (col: Zotero.Collection) => {
    for (const child of childCollections(col)) {
      walk(child);
      out.push(child);
    }
  };
  walk(collection);
  return out;
}

async function createCollection(name: string): Promise<Zotero.Collection> {
  const collection = new Zotero.Collection();
  collection.libraryID = Zotero.Libraries.userLibraryID;
  collection.name = name;
  await collection.saveTx();
  return collection;
}

async function createChildCollection(
  name: string,
  parent: Zotero.Collection,
): Promise<Zotero.Collection> {
  const collection = new Zotero.Collection();
  collection.libraryID = parent.libraryID;
  collection.name = name;
  collection.parentID = parent.id;
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
    for (const child of descendantCollections(collection)) {
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
      for (const child of descendantCollections(collection)) {
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
    assert.equal(resolveSyllabusRoot(folder).id, collection.id);
    assert.equal(getSyllabusNoteId(folder), getSyllabusNoteId(collection));

    const folderItemIds = childItemIds(folder);
    assert.include(folderItemIds, book.id);
    assert.include(book.getCollections(), collection.id);
    assert.include(book.getCollections(), folder.id);
  });

  it("does not create a class folder when the class has no assignments", async function () {
    collection = await createCollection("Smoke Syllabus Empty Class Folder");
    const emptyClassId = generateClassId();
    const saved = await mutateCollectionDocument(
      collection,
      (document) => ({
        ...document,
        nomenclature: "week",
        createSubcollections: true,
        classes: {
          [emptyClassId]: { number: 1, title: "Empty", status: null },
        },
        items: {},
      }),
      { createNote: "always" },
    );

    assert.isUndefined(saved.classes?.[emptyClassId]?.subcollectionKey);
    assert.lengthOf(childCollections(collection), 0);
  });

  it("removes a class folder when the class has no remaining assignments", async function () {
    collection = await createCollection("Smoke Syllabus Empty After Unassign");
    const book = await createBook(collection, "Unassign Folder Book");
    items.push(book);
    const first = await mutateCollectionDocument(
      collection,
      (document) => ({
        ...document,
        nomenclature: "week",
        createSubcollections: true,
        classes: {
          [CLASS_ID]: { number: 1, title: "Seminar", status: null },
        },
        items: {
          [book.key]: [{ classId: CLASS_ID, priority: "essential" }],
        },
      }),
      { createNote: "always" },
    );
    const folderKey = first.classes?.[CLASS_ID]?.subcollectionKey;
    assert.isString(folderKey);

    const saved = await mutateCollectionDocument(collection, (document) => ({
      ...document,
      items: {},
    }));
    assert.isUndefined(saved.classes?.[CLASS_ID]?.subcollectionKey);
    const folder = Zotero.Collections.getByLibraryAndKey(
      collection.libraryID,
      folderKey!,
    );
    assert.isTrue(!folder || folder.deleted);
  });

  it("removing a class folder during ensure does not deadlock the write queue", async function () {
    collection = await createCollection("Smoke Syllabus Folder Remove");
    const book = await createBook(collection, "Folder Remove Book");
    items.push(book);
    const extraClassId = generateClassId();

    await mutateCollectionDocument(
      collection,
      (document) => ({
        ...document,
        nomenclature: "week",
        createSubcollections: true,
        classes: {
          [CLASS_ID]: { number: 1, title: "Keep", status: null },
          [extraClassId]: { number: 2, title: "Drop", status: null },
        },
        items: {
          [book.key]: [{ classId: CLASS_ID, priority: "essential" }],
        },
      }),
      { createNote: "always" },
    );

    const saved = await Promise.race([
      mutateCollectionDocument(collection, (document) => ({
        ...document,
        classes: {
          [CLASS_ID]: document.classes?.[CLASS_ID] || {
            number: 1,
            title: "Keep",
            status: null,
          },
        },
        items: document.items,
      })),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("write queue deadlock removing class folder")),
          15_000,
        );
      }),
    ]);

    assert.property(saved.classes, CLASS_ID);
    assert.notProperty(saved.classes, extraClassId);
  });

  it("remaps class assignments onto the surviving item after a merge", async function () {
    collection = await createCollection("Smoke Syllabus Merge");
    const master = await createBook(collection, "Merge Master Book");
    const loser = await createBook(collection, "Merge Loser Book");
    items.push(master, loser);

    await mutateCollectionDocument(
      collection,
      (document) => ({
        ...document,
        nomenclature: "week",
        classes: {
          [CLASS_ID]: {
            number: 1,
            title: "Seminar",
            status: null,
          },
        },
        items: {
          [loser.key]: [
            {
              classId: CLASS_ID,
              priority: "essential",
              classInstruction: "Read before class",
            },
          ],
        },
      }),
      { createNote: "always" },
    );

    const masterKey = master.key;
    const loserKey = loser.key;
    assert.isFunction(Zotero.Items.merge);

    try {
      // Items.merge starts its own DB transaction; do not wrap in executeTransaction.
      await Zotero.Items.merge(master, [loser]);
    } catch (error) {
      assert.fail(
        `Zotero.Items.merge threw: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const noteId = getSyllabusNoteId(collection);
    assert.isNumber(noteId);

    const deadline = Date.now() + 15_000;
    let document = getCollectionDocument(collection);
    while (Date.now() < deadline) {
      try {
        const note = Zotero.Items.get(noteId!);
        const parsed = parseSyllabusNote(note.getNote());
        if (parsed) {
          document = parsed;
        }
      } catch {
        document = getCollectionDocument(collection);
      }
      if (
        (document.items[masterKey] || []).length > 0 &&
        document.items[loserKey] == null
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    let replaced: string[] = [];
    try {
      await master.loadDataType("relation");
      replaced = master.getRelationsByPredicate("dc:replaces") || [];
    } catch {
      replaced = [];
    }
    const loserDeleted = (() => {
      try {
        return !!(Zotero.Items.get(loser.id) || loser).deleted;
      } catch {
        return true;
      }
    })();
    assert.isUndefined(
      document.items[loserKey],
      `loser key ${loserKey} still in note; keys=${Object.keys(document.items || {}).join(",")}; loserDeleted=${loserDeleted}; dc:replaces=${JSON.stringify(replaced)}`,
    );
    const assignments = getHydratedItemAssignments(document, masterKey);
    assert.lengthOf(
      assignments,
      1,
      `master key ${masterKey} assignments=${JSON.stringify(assignments)}; keys=${Object.keys(document.items || {}).join(",")}`,
    );
    assert.equal(assignments[0]?.classId, CLASS_ID);
    assert.equal(assignments[0]?.priority, "essential");
    assert.equal(assignments[0]?.classInstruction, "Read before class");
  });

  it("lets nested collections keep independent syllabi", async function () {
    collection = await createCollection("Smoke Syllabus Parent");
    await mutateCollectionDocument(
      collection,
      (document) => ({ ...document, courseCode: "EDU303" }),
      { createNote: "always" },
    );

    const child = await createChildCollection(
      "Smoke Unmanaged Child",
      collection,
    );
    const grandchild = await createChildCollection(
      "Smoke Unmanaged Grandchild",
      child,
    );
    const greatGrandchild = await createChildCollection(
      "Smoke Unmanaged Great-Grandchild",
      grandchild,
    );

    const sibling = await createCollection("Smoke Syllabus Sibling");
    try {
      assert.isTrue(collectionHasSyllabusNote(collection));
      assert.isFalse(collectionHasSyllabusNote(child));
      assert.isFalse(collectionHasSyllabusNote(grandchild));
      assert.isFalse(collectionHasSyllabusNote(greatGrandchild));
      assert.isFalse(collectionHasSyllabusNote(sibling));
      assert.equal(resolveSyllabusRoot(child).id, child.id);
      assert.equal(resolveSyllabusRoot(grandchild).id, grandchild.id);
      assert.equal(resolveSyllabusRoot(greatGrandchild).id, greatGrandchild.id);
      assert.notEqual(getCollectionDocument(child).courseCode, "EDU303");

      await mutateCollectionDocument(
        child,
        (document) => ({ ...document, courseCode: "CHILD101" }),
        { createNote: "always" },
      );
      await mutateCollectionDocument(
        greatGrandchild,
        (document) => ({ ...document, courseCode: "DEEP404" }),
        { createNote: "always" },
      );

      assert.isTrue(collectionHasSyllabusNote(child));
      assert.isTrue(collectionHasSyllabusNote(greatGrandchild));
      assert.isFalse(collectionHasSyllabusNote(grandchild));
      assert.equal(getCollectionDocument(collection).courseCode, "EDU303");
      assert.equal(getCollectionDocument(child).courseCode, "CHILD101");
      assert.equal(
        getCollectionDocument(greatGrandchild).courseCode,
        "DEEP404",
      );
      assert.notEqual(getSyllabusNoteId(collection), getSyllabusNoteId(child));
      assert.notEqual(
        getSyllabusNoteId(child),
        getSyllabusNoteId(greatGrandchild),
      );
    } finally {
      try {
        await sibling.eraseTx();
      } catch {
        /* profile is discarded after the run */
      }
    }
  });
});
