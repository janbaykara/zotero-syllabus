import { assert } from "chai";
import { fallbackItemsAsZoteroRdf, isRdfFile } from "../src/utils/rdf";

function mockNote(html: string, title = "Syllabus"): Zotero.Item {
  return {
    id: 99,
    deleted: false,
    isFeedItem: false,
    itemType: "note",
    isNote: () => true,
    isRegularItem: () => false,
    isAttachment: () => false,
    getField: (name: string) => (name === "title" ? title : ""),
    getNote: () => html,
    getCreators: () => [],
    getTags: () => [{ tag: "zotero-syllabus" }],
  } as unknown as Zotero.Item;
}

function mockBook(title: string): Zotero.Item {
  return {
    id: 1,
    deleted: false,
    isFeedItem: false,
    itemType: "book",
    isNote: () => false,
    isRegularItem: () => true,
    isAttachment: () => false,
    getField: (name: string) => {
      if (name === "title") return title;
      if (name === "date") return "2020";
      return "";
    },
    getCreators: () => [{ lastName: "Doe", firstName: "Jane" }],
    getTags: () => [],
  } as unknown as Zotero.Item;
}

describe("fallback Zotero RDF", function () {
  const noteHtml =
    '<h1>Syllabus</h1><pre data-zotero-syllabus="1">{"version":2}</pre>';

  it("emits rdf:RDF with bib:Memo note body and tags", function () {
    const rdf = fallbackItemsAsZoteroRdf([
      mockBook("Reading"),
      mockNote(noteHtml),
    ]);
    assert.isTrue(isRdfFile(rdf));
    assert.include(rdf, "<bib:Book ");
    assert.include(rdf, "<dc:title>Reading</dc:title>");
    assert.include(rdf, "<bib:Memo ");
    assert.include(rdf, "<z:itemType>note</z:itemType>");
    assert.include(rdf, "data-zotero-syllabus");
    assert.include(rdf, "<dc:subject>zotero-syllabus</dc:subject>");
    assert.include(rdf, "<foaf:surname>Doe</foaf:surname>");
  });
});
