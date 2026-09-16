import { assert } from "chai";
import {
  fallbackItemsAsBibTeX,
  fallbackItemsAsRis,
  fallbackNoteAsBibTeX,
  fallbackNoteAsRis,
  injectExportIdsIntoBibTeX,
  injectExportIdsIntoRis,
} from "../src/utils/exportCitations";
import { SYLLABUS_EXPORT_ID_KEY } from "../src/utils/identifiers";

function mockNote(html: string, title = "Syllabus"): Zotero.Item {
  return {
    deleted: false,
    isFeedItem: false,
    isNote: () => true,
    isRegularItem: () => false,
    getField: (name: string) => (name === "title" ? title : ""),
    getNote: () => html,
    getCreators: () => [],
  } as unknown as Zotero.Item;
}

function mockBook(title: string, key = "ABCD1234"): Zotero.Item {
  return {
    key,
    deleted: false,
    isFeedItem: false,
    itemType: "book",
    isNote: () => false,
    isRegularItem: () => true,
    getField: (name: string) => {
      if (name === "title") return title;
      if (name === "date") return "2020";
      return "";
    },
    getCreators: () => [{ lastName: "Doe", firstName: "Jane" }],
  } as unknown as Zotero.Item;
}

describe("exportCitations syllabus note", function () {
  const noteHtml =
    '<h1>Syllabus</h1><pre data-zotero-syllabus="1">{"version":2}</pre>';

  it("encodes a standalone note as RIS TY - NOTE with N1 body lines", function () {
    const ris = fallbackNoteAsRis(mockNote(noteHtml));
    assert.include(ris, "TY  - NOTE");
    assert.include(ris, "TI  - Syllabus");
    assert.include(ris, "KW  - zotero-syllabus");
    assert.include(
      ris,
      'N1  - <h1>Syllabus</h1><pre data-zotero-syllabus="1">{"version":2}</pre>',
    );
    assert.include(ris, "ER  - ");
  });

  it("encodes a standalone note as BibTeX @misc with note field", function () {
    const bib = fallbackNoteAsBibTeX(mockNote(noteHtml));
    assert.match(bib, /^@misc\{zoteroSyllabusNote,/);
    assert.include(bib, "title = {Syllabus}");
    assert.include(bib, "keywords = {zotero-syllabus}");
    assert.include(
      bib,
      'note = {<h1>Syllabus</h1><pre data-zotero-syllabus="1">\\{"version":2\\}</pre>}',
    );
  });

  it("fallback RIS/BibTeX include both regular items and the syllabus note", function () {
    const items = [mockBook("Reading"), mockNote(noteHtml)];
    const ris = fallbackItemsAsRis(items);
    assert.include(ris, "TY  - BOOK");
    assert.include(ris, "TI  - Reading");
    assert.include(ris, "TY  - NOTE");
    assert.include(ris, "data-zotero-syllabus");

    const bib = fallbackItemsAsBibTeX(items);
    assert.include(bib, "@book{");
    assert.include(bib, "title = {Reading}");
    assert.include(bib, "@misc{zoteroSyllabusNote");
    assert.include(bib, "data-zotero-syllabus");
  });

  it("stamps export ids into fallback RIS/BibTeX and note HTML override", function () {
    const book = mockBook("Reading", "ITEMKEY1");
    const note = mockNote("live-note-html");
    const snapshot =
      '<pre data-zotero-syllabus="1">{"version":2,"itemIndex":{}}</pre>';
    const options = {
      noteHtml: snapshot,
      exportIdByItemKey: new Map([["ITEMKEY1", "export-xyz"]]),
    };
    const ris = fallbackItemsAsRis([book, note], options);
    assert.include(ris, `N1  - ${SYLLABUS_EXPORT_ID_KEY}: export-xyz`);
    assert.include(ris, snapshot);
    assert.notInclude(ris, "live-note-html");

    const bib = fallbackItemsAsBibTeX([book, note], options);
    assert.include(bib, `extra = {${SYLLABUS_EXPORT_ID_KEY}: export-xyz}`);
    assert.include(bib, "itemIndex");
  });

  it("injects export ids into translator-shaped RIS/BibTeX by item order", function () {
    const book = mockBook("Reading", "ITEMKEY1");
    const ris = injectExportIdsIntoRis(
      "TY  - BOOK\nTI  - Reading\nER  - \n",
      [book],
      { ITEMKEY1: "export-abc" },
    );
    assert.include(ris, `N1  - ${SYLLABUS_EXPORT_ID_KEY}: export-abc`);

    const bib = injectExportIdsIntoBibTeX(
      "@book{Doe20201,\n  title = {Reading}\n}\n",
      [book],
      { ITEMKEY1: "export-abc" },
    );
    assert.include(bib, `extra = {${SYLLABUS_EXPORT_ID_KEY}: export-abc}`);
  });
});
