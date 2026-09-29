import { assert } from "chai";
import {
  SEARCH_HIGHLIGHT_FULL_MIN,
  SEARCH_HIGHLIGHT_WORD_MIN,
  SEARCH_SNIPPET_PARAGRAPH_MAX_LINES,
  formatFulltextSearchHit,
  highlightSearchInHtml,
  isDiscernibleSearchParagraph,
  segmentSearchHighlights,
  trimSearchSnippet,
} from "../src/utils/searchHighlight";

describe("search highlight and snippets", function () {
  describe("segmentSearchHighlights", function () {
    it("returns the original text when the query is empty", function () {
      assert.deepEqual(segmentSearchHighlights("Hello world", "  "), [
        { text: "Hello world" },
      ]);
    });

    it("highlights the full query when it is long enough", function () {
      const segments = segmentSearchHighlights(
        "Talk about democracy tonight.",
        "democracy",
      );
      assert.isAtLeast("democracy".length, SEARCH_HIGHLIGHT_FULL_MIN);
      assert.deepEqual(segments, [
        { text: "Talk about " },
        { text: "democracy", kind: "full" },
        { text: " tonight." },
      ]);
    });

    it("is case-insensitive and keeps original casing", function () {
      assert.deepEqual(
        segmentSearchHighlights("The DEMOCRACY we need", "Democracy"),
        [
          { text: "The " },
          { text: "DEMOCRACY", kind: "full" },
          { text: " we need" },
        ],
      );
    });

    it("lightly highlights individual long words when the full phrase is short", function () {
      assert.isBelow("test".length, SEARCH_HIGHLIGHT_FULL_MIN);
      assert.isAtLeast("test".length, SEARCH_HIGHLIGHT_WORD_MIN);
      assert.deepEqual(segmentSearchHighlights("A test case", "test"), [
        { text: "A " },
        { text: "test", kind: "word" },
        { text: " case" },
      ]);
    });

    it("prefers the full phrase over overlapping word hits", function () {
      const segments = segmentSearchHighlights(
        "climate change and climate",
        "climate change",
      );
      assert.deepEqual(segments, [
        { text: "climate change", kind: "full" },
        { text: " and " },
        { text: "climate", kind: "word" },
      ]);
    });

    it("ignores short tokens under the word minimum", function () {
      assert.deepEqual(segmentSearchHighlights("to be or not", "to be"), [
        { text: "to be or not" },
      ]);
    });

    it("highlights every non-overlapping occurrence", function () {
      assert.deepEqual(segmentSearchHighlights("test bar test", "test"), [
        { text: "test", kind: "word" },
        { text: " bar " },
        { text: "test", kind: "word" },
      ]);
    });
  });

  describe("formatFulltextSearchHit", function () {
    it("keeps a discernible paragraph intact", function () {
      const para =
        "A short paragraph about democracy and representation in practice.";
      assert.isTrue(isDiscernibleSearchParagraph(para));
      assert.equal(formatFulltextSearchHit(para, "democracy"), para);
    });

    it("trims a long multi-line page dump around the match", function () {
      const lines = Array.from(
        { length: SEARCH_SNIPPET_PARAGRAPH_MAX_LINES + 6 },
        (_, i) => `Line ${i} of filler text about nothing in particular.`,
      );
      lines[8] = "Here we discuss democracy and its limits carefully.";
      const page = lines.join("\n");
      assert.isFalse(isDiscernibleSearchParagraph(page));
      const snippet = formatFulltextSearchHit(page, "democracy");
      assert.include(snippet.toLowerCase(), "democracy");
      assert.include(snippet, "…");
      assert.isBelow(snippet.split("\n").length, page.split("\n").length);
      assert.notInclude(snippet, "Line 0 of filler");
    });

    it("trims a long single-line blob that soft-wraps past the paragraph budget", function () {
      const words = Array.from({ length: 120 }, (_, i) =>
        i === 60 ? "children" : `word${i}`,
      );
      const blob = words.join(" ");
      assert.isFalse(isDiscernibleSearchParagraph(blob));
      const snippet = formatFulltextSearchHit(blob, "children");
      assert.include(snippet.toLowerCase(), "children");
      assert.include(snippet, "…");
      assert.isBelow(snippet.length, blob.length);
    });

    it("uses ellipses when trimSearchSnippet cuts leading and trailing lines", function () {
      const text = [
        "alpha",
        "bravo",
        "charlie",
        "delta democracy echo",
        "foxtrot",
        "golf",
        "hotel",
      ].join("\n");
      const snippet = trimSearchSnippet(text, "democracy", { contextLines: 1 });
      assert.equal(snippet, "… charlie\ndelta democracy echo\nfoxtrot …");
    });

    it("does not balloon around scattered word matches", function () {
      const lines = Array.from({ length: 30 }, (_, i) =>
        i === 5 || i === 20
          ? `Line ${i} mentions children here.`
          : `Line ${i} of unrelated filler text.`,
      );
      const page = lines.join("\n");
      const snippet = formatFulltextSearchHit(page, "children");
      assert.include(snippet.toLowerCase(), "children");
      assert.include(snippet, "…");
      // One primary match ±1 line → at most a handful of lines, not 5→20.
      assert.isBelow(snippet.split("\n").length, 8);
      assert.notInclude(snippet, "Line 20 mentions");
    });
  });

  describe("highlightSearchInHtml", function () {
    it("wraps matches in mark tags inside existing markup", function () {
      const html = highlightSearchInHtml(
        "Notes on <i>democracy</i> today",
        "democracy",
      );
      assert.include(html, "<i>");
      assert.match(
        html,
        /<mark class="syllabus-search-hit syllabus-search-hit-full">democracy<\/mark>/,
      );
    });
  });
});
