import { assert } from "chai";
import {
  collectionKeyFromId,
  deleteGalleryNote,
  ensureGalleryNote,
  findGalleryNote,
  findGalleryNoteForCollection,
  galleryNoteTag,
  GALLERY_NOTE_TAG_PREFIX,
  isGalleryNoteTag,
  readGalleryNoteText,
} from "../src/modules/galleryNote";
import { noteHtmlToPlainText } from "../src/modules/pinned";

describe("galleryNote", function () {
  this.timeout(30_000);

  const items: Zotero.Item[] = [];
  const collections: Zotero.Collection[] = [];

  afterEach(async function () {
    const itemIds = items.map((item) => item.id).filter(Boolean);
    items.length = 0;
    if (itemIds.length) {
      try {
        await Zotero.Items.erase(itemIds);
      } catch {
        /* profile discarded after run */
      }
    }
    const collectionIds = collections.map((c) => c.id).filter(Boolean);
    collections.length = 0;
    if (collectionIds.length) {
      try {
        await Zotero.Collections.erase(collectionIds);
      } catch {
        /* profile discarded after run */
      }
    }
  });

  it("builds a stable tag from the collection key prefix", function () {
    assert.equal(GALLERY_NOTE_TAG_PREFIX, "zotero-syllabus-gallery:");
    assert.equal(
      galleryNoteTag("ABCD1234"),
      "zotero-syllabus-gallery:ABCD1234",
    );
    assert.isTrue(isGalleryNoteTag("zotero-syllabus-gallery:ABCD1234"));
    assert.isFalse(isGalleryNoteTag("zotero-syllabus-pinned-intention"));
  });

  it("scopes notes to collection keys, not sibling collections", async function () {
    const book = new Zotero.Item("book");
    book.libraryID = Zotero.Libraries.userLibraryID;
    book.setField("title", "Gallery note book");
    await book.saveTx();
    items.push(book);

    const collectionA = new Zotero.Collection();
    collectionA.libraryID = Zotero.Libraries.userLibraryID;
    collectionA.name = "Gallery notes A";
    await collectionA.saveTx();
    collections.push(collectionA);

    const collectionB = new Zotero.Collection();
    collectionB.libraryID = Zotero.Libraries.userLibraryID;
    collectionB.name = "Gallery notes B";
    await collectionB.saveTx();
    collections.push(collectionB);

    assert.equal(collectionKeyFromId(collectionA.id), collectionA.key);

    const noteA = await ensureGalleryNote(book, collectionA);
    assert.ok(noteA);
    items.push(noteA!);
    assert.isTrue(noteA!.hasTag(galleryNoteTag(collectionA.key)));
    assert.equal(findGalleryNote(book, collectionA.key)?.id, noteA!.id);
    assert.isNull(findGalleryNote(book, collectionB.key));
    assert.isNull(findGalleryNoteForCollection(book, collectionB.id));

    noteA!.setNote("<p>Allan recommended this in&nbsp;2024</p>");
    await noteA!.saveTx({ skipSelect: true });

    assert.equal(
      readGalleryNoteText(book, collectionA.id),
      noteHtmlToPlainText("<p>Allan recommended this in&nbsp;2024</p>"),
    );
    assert.equal(readGalleryNoteText(book, collectionB.id), "");

    const again = await ensureGalleryNote(book, collectionA);
    assert.equal(again?.id, noteA!.id);

    const noteB = await ensureGalleryNote(book, collectionB);
    assert.ok(noteB);
    items.push(noteB!);
    assert.notEqual(noteB!.id, noteA!.id);

    assert.isTrue(await deleteGalleryNote(book, collectionA.id));
    assert.isNull(findGalleryNoteForCollection(book, collectionA.id));
    assert.ok(findGalleryNoteForCollection(book, collectionB.id));
  });
});
