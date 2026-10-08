import { assert } from "chai";
import {
  PERSONAL_READING_ORDER_NOTE_TITLE,
  PERSONAL_READING_ORDER_PRE_ATTR,
  PERSONAL_READING_ORDER_VERSION,
  applyPersonalReadingOrder,
  looksLikePersonalReadingOrderPayload,
  parsePersonalReadingOrderNote,
  prunePersonalReadingOrderKeys,
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
    assert.include(html, PERSONAL_READING_ORDER_NOTE_TITLE);
    assert.include(html, PLUGIN_JSON_HEADING);
    assert.include(html, PERSONAL_READING_ORDER_PRE_ATTR);
    // JSON in <pre> is HTML-escaped (quotes → &quot;).
    assert.include(html, "&quot;aaa&quot;");
    assert.include(html, "&quot;bbb&quot;");
    assert.include(html, "✅");
    assert.include(html, "&quot;done&quot;");
    assert.include(html, "&quot;assignmentDone&quot;");
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

  it("defaults missing done fields to empty on parse", function () {
    const html = `<pre ${PERSONAL_READING_ORDER_PRE_ATTR}="1">${JSON.stringify({
      version: 1,
      order: ["a"],
    })}</pre>`;
    const parsed = parsePersonalReadingOrderNote(html);
    assert.isNotNull(parsed);
    assert.deepEqual(parsed!.done, []);
    assert.deepEqual(parsed!.assignmentDone, []);
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
