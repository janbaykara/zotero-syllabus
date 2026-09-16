import { assert } from "chai";
import {
  fallbackItemsAsBibTeX,
  fallbackItemsAsRis,
  fallbackNoteAsBibTeX,
  fallbackNoteAsRis,
} from "../src/utils/exportCitations";

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

function mockBook(title: string): Zotero.Item {
  return {
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
});
