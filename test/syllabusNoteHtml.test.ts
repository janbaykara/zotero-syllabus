import { assert } from "chai";
import { CollectionSyllabusDocumentSchema } from "../src/utils/schemas";
import { classSubcollectionName } from "../src/modules/classSubcollections";
import {
  PLUGIN_JSON_HEADING,
  READABLE_NOTE_FORMAT_VERSION,
  READING_DONE_MARK,
  READING_TODO_MARK,
  getReadableNoteFormatVersion,
  looksLikeSyllabusDocumentPayload,
  noteNeedsFormatPatch,
  parseSyllabusNote,
  serializeSyllabusNote,
} from "../src/modules/syllabusNoteHtml";

function sampleDocument() {
  return CollectionSyllabusDocumentSchema.parse({
    version: 2,
    courseCode: "EDU101",
    institution: "Test University",
    nomenclature: "week",
    description: "A course about practice.",
    links: ["https://example.edu/syllabus"],
    classes: {
      "class-1": {
        number: 1,
        title: "Intro",
        readingDate: "2026-08-28",
        status: "done",
        description: "Start here.",
        itemOrder: ["a1", "a2"],
      },
    },
    items: {
      itemAAA: [
        {
          id: "a1",
          classId: "class-1",
          priority: "essential",
          classInstruction: "Read pp. 1-20",
          status: "done",
        },
      ],
      itemBBB: [
        {
          id: "a2",
          classId: "class-1",
          priority: "optional",
          status: null,
        },
      ],
    },
    itemIndex: {
      itemAAA: { title: "First Book", doi: "10.1234/foo" },
      itemBBB: { title: "Second Article" },
    },
  });
}

describe("syllabus note readable HTML", function () {
  it("renders folder-matching class headings, progress marks, priority groups, and links", async function () {
    const document = sampleDocument();
    const html = await serializeSyllabusNote(document);
    const heading = classSubcollectionName("week", 1, "Intro", {
      done: true,
      readingDate: "2026-08-28",
    });

    assert.include(html, `data-readable="${READABLE_NOTE_FORMAT_VERSION}"`);
    assert.equal(
      getReadableNoteFormatVersion(html),
      READABLE_NOTE_FORMAT_VERSION,
    );
    assert.include(html, `<h3>${heading}</h3>`);
    assert.notInclude(html, " - done</p>");
    assert.include(html, "<strong>Essential</strong>");
    assert.include(html, "<strong>Optional</strong>");
    assert.include(html, `${READING_DONE_MARK} First Book — Read pp. 1-20`);
    assert.include(html, `${READING_TODO_MARK} Second Article`);
    assert.include(html, `href="https://doi.org/10.1234/foo"`);
    assert.include(html, ">DOI</a>");
    assert.include(html, "You can stop reading here");
    assert.include(html, PLUGIN_JSON_HEADING);
    assert.include(html, "EDU101 - Test University");
    assert.include(html, "Start here.");
    assert.include(html, `href="https://example.edu/syllabus"`);
  });

  it("round-trips the JSON payload after the readable rewrite", async function () {
    const document = sampleDocument();
    const html = await serializeSyllabusNote(document);
    const parsed = parseSyllabusNote(html);
    assert.isNotNull(parsed);
    assert.equal(parsed!.classes["class-1"]?.status, "done");
    assert.equal(parsed!.items.itemAAA?.[0]?.status, "done");
    assert.equal(parsed!.itemIndex?.itemAAA?.doi, "10.1234/foo");
  });

  it("patches notes that lack the readable-format marker", function () {
    const document = sampleDocument();
    const legacy = `<div data-schema-version="9"><h1>Syllabus</h1><h3>Plugin data (do not edit)</h3><p>https://github.com/janbaykara/zotero-syllabus</p><pre data-zotero-syllabus="1" data-version="2">{}</pre></div>`;
    assert.isTrue(noteNeedsFormatPatch(legacy, document));
  });

  it("does not patch current readable notes that already include course links", async function () {
    const document = sampleDocument();
    const html = await serializeSyllabusNote(document);
    assert.isFalse(noteNeedsFormatPatch(html, document));
  });

  it("ignores a citation object and a generic pre that is not syllabus JSON", function () {
    const citation = `<p>See { "title": "Not a syllabus" }</p><pre>console.log(1)</pre>`;
    assert.isFalse(
      looksLikeSyllabusDocumentPayload('{ "title": "Not a syllabus" }'),
    );
    assert.isNull(parseSyllabusNote(citation));
  });

  it("still reads the tagged plugin pre when earlier braces exist", async function () {
    const document = sampleDocument();
    const body = await serializeSyllabusNote(document);
    const html = `<p>Cited as {Smith 2020}</p>${body}`;
    const parsed = parseSyllabusNote(html);
    assert.isNotNull(parsed);
    assert.equal(parsed!.courseCode, "EDU101");
  });
});
