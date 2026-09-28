import { assert } from "chai";
import {
  addItemsToClass,
  addToClassRowQueryHaystack,
  filterAddToClassGroups,
  type AddToClassGroup,
  type AddToClassRow,
} from "../src/modules/addToClass";
import { generateClassId } from "../src/utils/schemas";
import {
  getCollectionDocument,
  getHydratedItemAssignments,
  mutateCollectionDocument,
  whenSyllabusNotesReady,
} from "../src/modules/syllabusNote";

function row(
  partial: Partial<AddToClassRow> & { collectionName: string },
): AddToClassRow {
  return {
    collectionId: 1,
    libraryID: 1,
    libraryName: "",
    classNumber: 1,
    classTitle: "",
    kind: "class",
    nomenclature: "Class",
    ...partial,
  };
}

function group(
  partial: Partial<AddToClassGroup> & { rows: AddToClassRow[] },
): AddToClassGroup {
  return {
    collectionId: 1,
    collectionName: "Course A",
    libraryID: 1,
    libraryName: "",
    isCurrent: false,
    ...partial,
  };
}

function sampleGroups(): AddToClassGroup[] {
  return [
    group({
      collectionName: "Philosophy 101",
      rows: [
        row({
          collectionName: "Philosophy 101",
          classNumber: 1,
          classTitle: "Plato",
        }),
        row({
          collectionName: "Philosophy 101",
          classNumber: 2,
          classTitle: "Aristotle",
        }),
      ],
    }),
    group({
      collectionId: 2,
      collectionName: "Biology",
      rows: [
        row({
          collectionId: 2,
          collectionName: "Biology",
          classNumber: 1,
          classTitle: "Cells",
        }),
      ],
    }),
  ];
}

describe("addToClass", function () {
  describe("filterAddToClassGroups", function () {
    it("returns every group when the query is empty", function () {
      assert.equal(filterAddToClassGroups(sampleGroups(), "  ").length, 2);
    });

    it("matches class titles", function () {
      const filtered = filterAddToClassGroups(sampleGroups(), "plato");
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].collectionName, "Philosophy 101");
      assert.equal(filtered[0].rows.length, 1);
      assert.equal(filtered[0].rows[0].classTitle, "Plato");
    });

    it("matches syllabus names and drops groups with no hits", function () {
      const filtered = filterAddToClassGroups(sampleGroups(), "bio");
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].collectionName, "Biology");
    });

    it("matches class numbers", function () {
      const filtered = filterAddToClassGroups(sampleGroups(), "2");
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].rows[0].classNumber, 2);
    });
  });

  describe("addToClassRowQueryHaystack", function () {
    it("includes collection, title, and number", function () {
      const haystack = addToClassRowQueryHaystack(
        row({
          collectionName: "History",
          classTitle: "The Reformation",
          classNumber: 4,
        }),
      );
      assert.include(haystack, "history");
      assert.include(haystack, "the reformation");
      assert.include(haystack, "4");
    });
  });

  describe("addItemsToClass", function () {
    this.timeout(60_000);

    let source: Zotero.Collection | null = null;
    let destination: Zotero.Collection | null = null;
    const items: Zotero.Item[] = [];

    before(async function () {
      await whenSyllabusNotesReady();
    });

    afterEach(async function () {
      const itemIds = items.map((item) => item.id).filter(Boolean);
      if (itemIds.length) {
        try {
          await Zotero.Items.erase(itemIds);
        } catch {
          /* profile is discarded after the run */
        }
      }
      items.length = 0;
      for (const collection of [destination, source]) {
        if (!collection?.id) {
          continue;
        }
        try {
          await collection.eraseTx();
        } catch {
          /* profile is discarded after the run */
        }
      }
      source = null;
      destination = null;
    });

    it("adds an item from another collection to the chosen class", async function () {
      const classId = generateClassId();
      source = new Zotero.Collection();
      source.libraryID = Zotero.Libraries.userLibraryID;
      source.name = "AddToClass Source";
      await source.saveTx();

      destination = new Zotero.Collection();
      destination.libraryID = Zotero.Libraries.userLibraryID;
      destination.name = "AddToClass Destination";
      await destination.saveTx();

      await mutateCollectionDocument(
        destination,
        (document) => ({
          ...document,
          classes: {
            [classId]: { number: 1, title: "Week 1", status: null },
          },
        }),
        { createNote: "always" },
      );

      const book = new Zotero.Item("book");
      book.libraryID = source.libraryID;
      book.setField("title", "AddToClass Book");
      book.addToCollection(source.id);
      await book.saveTx();
      items.push(book);

      await addItemsToClass({
        items: [book],
        collectionId: destination.id,
        classNumber: 1,
      });

      assert.include(book.getCollections(), destination.id);
      const assignments = getHydratedItemAssignments(
        getCollectionDocument(destination),
        book.key,
        book,
      );
      assert.lengthOf(assignments, 1);
      assert.equal(assignments[0]?.classNumber, 1);
    });
  });
});
