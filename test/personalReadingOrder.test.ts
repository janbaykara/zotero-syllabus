import { assert } from "chai";
import {
  PERSONAL_READING_ORDER_DOCUMENT_PREFIX,
  PERSONAL_READING_ORDER_PRE_ATTR,
  PERSONAL_READING_ORDER_VERSION,
  applyPersonalReadingOrder,
  looksLikePersonalReadingOrderPayload,
  parsePersonalReadingOrderNote,
  personalReadingOrderDocumentHeading,
  personalReadingOrderReleasingDone,
  prunePersonalReadingOrderKeys,
  readingDoneKeysAfterToggle,
  remapPersonalReadingOrderKeys,
  serializePersonalReadingOrderNote,
  splitPersonalReadingOrder,
} from "../src/modules/personalReadingOrder";
import { PLUGIN_JSON_HEADING } from "../src/modules/syllabusNoteHtml";

describe("personal reading order", function () {
  it("serializes human-readable list then plugin JSON", function () {
    const html = serializePersonalReadingOrderNote({
      version: PERSONAL_READING_ORDER_VERSION,
      order: ["aaa", "bbb"],
      done: ["aaa"],
      assignmentDone: ["asg-1"],
    });
    assert.include(
      html,
      `<h1>${personalReadingOrderDocumentHeading(null)}</h1>`,
    );
    assert.include(html, PERSONAL_READING_ORDER_DOCUMENT_PREFIX);
    assert.include(html, PLUGIN_JSON_HEADING);
    assert.include(html, PERSONAL_READING_ORDER_PRE_ATTR);
    // JSON in <pre> is HTML-escaped (quotes → &quot;).
    assert.include(html, "&quot;aaa&quot;");
    assert.include(html, "&quot;bbb&quot;");
    assert.include(html, "✅");
    assert.include(html, "&quot;done&quot;");
    assert.include(html, "&quot;assignmentDone&quot;");
  });

  it("uses Personal reading order - collection name as the note H1", function () {
    const collection = { name: "My List" } as Zotero.Collection;
    const html = serializePersonalReadingOrderNote(
      {
        version: PERSONAL_READING_ORDER_VERSION,
        order: [],
        done: [],
        assignmentDone: [],
      },
      collection,
    );
    assert.include(html, "<h1>Personal reading order - My List</h1>");
  });

  it("parses the JSON payload from the note envelope", function () {
    const html = serializePersonalReadingOrderNote({
      version: PERSONAL_READING_ORDER_VERSION,
      order: ["key1", "key2"],
      done: ["key2"],
      assignmentDone: ["asg-9"],
    });
    const parsed = parsePersonalReadingOrderNote(html);
    assert.isNotNull(parsed);
    assert.deepEqual(parsed!.order, ["key1", "key2"]);
    assert.deepEqual(parsed!.done, ["key2"]);
    assert.deepEqual(parsed!.assignmentDone, ["asg-9"]);
    assert.equal(parsed!.version, PERSONAL_READING_ORDER_VERSION);
  });

  it("clears done keys and can replace the reading order together", function () {
    const next = personalReadingOrderReleasingDone(
      {
        version: PERSONAL_READING_ORDER_VERSION,
        order: ["a", "d1", "b"],
        done: ["d1", "d2"],
        assignmentDone: ["asg-d1", "asg-keep"],
      },
      [{ itemKey: "d1", siblingAssignmentIds: ["asg-d1"] }],
      ["d1", "a", "b"],
    );
    assert.deepEqual(next.order, ["d1", "a", "b"]);
    assert.deepEqual(next.done, ["d2"]);
    assert.deepEqual(next.assignmentDone, ["asg-keep"]);
  });

  it("appends a newly done key and drops it on untick", function () {
    assert.deepEqual(readingDoneKeysAfterToggle(["a", "b"], "c", true), [
      "a",
      "b",
      "c",
    ]);
    assert.deepEqual(readingDoneKeysAfterToggle(["a", "b", "c"], "b", true), [
      "a",
      "c",
      "b",
    ]);
    assert.deepEqual(readingDoneKeysAfterToggle(["a", "b", "c"], "b", false), [
      "a",
      "c",
    ]);
  });

  it("round-trips an optional gallery description", function () {
    const html = serializePersonalReadingOrderNote({
      version: PERSONAL_READING_ORDER_VERSION,
      order: ["a"],
      done: [],
      assignmentDone: [],
      description: "A reading list for Zen.",
    });
    assert.include(html, "A reading list for Zen.");
    const parsed = parsePersonalReadingOrderNote(html);
    assert.isNotNull(parsed);
    assert.equal(parsed!.description, "A reading list for Zen.");
  });

  it("defaults missing done fields to empty on parse", function () {
    const html = `<pre ${PERSONAL_READING_ORDER_PRE_ATTR}="1">${JSON.stringify({
      version: 1,
      order: ["a"],
    })}</pre>`;
    const parsed = parsePersonalReadingOrderNote(html);
    assert.isNotNull(parsed);
    assert.deepEqual(parsed!.done, []);
    assert.deepEqual(parsed!.assignmentDone, []);
    assert.deepEqual(parsed!.classDone, []);
  });

  it("round-trips classDone class ids", function () {
    const html = serializePersonalReadingOrderNote({
      version: PERSONAL_READING_ORDER_VERSION,
      order: [],
      done: [],
      assignmentDone: [],
      classDone: ["class-1", "class-2"],
    });
    assert.include(html, "&quot;classDone&quot;");
    assert.include(html, "&quot;class-1&quot;");
    const parsed = parsePersonalReadingOrderNote(html);
    assert.isNotNull(parsed);
    assert.deepEqual(parsed!.classDone, ["class-1", "class-2"]);
  });

  it("detects personal reading order payloads", function () {
    assert.isTrue(
      looksLikePersonalReadingOrderPayload(
        JSON.stringify({ version: 1, order: ["a"] }),
      ),
    );
    assert.isFalse(
      looksLikePersonalReadingOrderPayload(
        JSON.stringify({ version: 2, classes: {}, items: {} }),
      ),
    );
  });

  it("remaps done keys on merge and keeps assignmentDone ids", function () {
    const remapped = remapPersonalReadingOrderKeys(
      {
        version: 1,
        order: ["old"],
        done: ["old", "keep"],
        assignmentDone: ["asg-1"],
      },
      { old: "new" },
    );
    assert.deepEqual(remapped.order, ["new"]);
    assert.deepEqual(remapped.done, ["new", "keep"]);
    assert.deepEqual(remapped.assignmentDone, ["asg-1"]);
  });

  it("applies order then appends leftovers", function () {
    const items = [{ key: "c" }, { key: "a" }, { key: "b" }];
    const ordered = applyPersonalReadingOrder(items, ["b", "a"]);
    assert.deepEqual(
      ordered.map((item) => item.key),
      ["b", "a", "c"],
    );
  });

  it("splits ordered vs unordered without listing unordered in storage sense", function () {
    const items = [{ key: "a" }, { key: "b" }, { key: "c" }];
    const { ordered, unordered } = splitPersonalReadingOrder(items, ["b"]);
    assert.deepEqual(
      ordered.map((item) => item.key),
      ["b"],
    );
    assert.deepEqual(
      unordered.map((item) => item.key),
      ["a", "c"],
    );
  });

  it("prunes missing keys and dedupes", function () {
    const live = new Set(["a", "c"]);
    assert.deepEqual(
      prunePersonalReadingOrderKeys(["a", "b", "a", "c", "d"], live),
      ["a", "c"],
    );
  });

  it("remaps order keys on merge", function () {
    const remapped = remapPersonalReadingOrderKeys(
      {
        version: 1,
        order: ["old", "keep", "old2"],
        done: [],
        assignmentDone: [],
      },
      { old: "new", old2: "new" },
    );
    assert.deepEqual(remapped.order, ["new", "keep"]);
  });
});
