import { assert } from "chai";
import {
  findMatchingParagraphsInFulltext,
  normalizeFulltextMatchText,
  paragraphOverlapsAnnotationQuote,
  splitPageIntoParagraphs,
  syntheticFulltextStreamId,
} from "../src/utils/fulltextParagraphs";
import { dedupeFulltextAgainstAnnotations } from "../src/modules/explorerQueries";
import type { MyAnnotationStreamEntry } from "../src/modules/explorerQueries";

describe("fulltext paragraph search", function () {
  describe("splitPageIntoParagraphs", function () {
    it("splits on blank lines and keeps single newlines inside a paragraph", function () {
      assert.deepEqual(
        splitPageIntoParagraphs("First para.\n\nSecond\npara.\n\n\nThird."),
        ["First para.", "Second\npara.", "Third."],
      );
    });
  });

  describe("findMatchingParagraphsInFulltext", function () {
    it("returns matching paragraphs with page labels from form-feeds", function () {
      const raw = [
        "Intro page without the needle.",
        "A long paragraph about democracy and representation.",
        "Unrelated closing.",
      ].join("\f");
      const hits = findMatchingParagraphsInFulltext(raw, "democracy");
      assert.lengthOf(hits, 1);
      assert.include(hits[0].text.toLowerCase(), "democracy");
      assert.equal(hits[0].pageIndex, 1);
      assert.equal(hits[0].pageLabel, "2");
    });

    it("caps results per attachment", function () {
      const pages = Array.from(
        { length: 5 },
        (_, i) => `Paragraph ${i} mentions climate change here.`,
      ).join("\f\n\n");
      const hits = findMatchingParagraphsInFulltext(pages, "climate", {
        maxPerAttachment: 2,
      });
      assert.lengthOf(hits, 2);
    });

    it("is case-insensitive and ignores extra whitespace in the query", function () {
      const raw = "The  Quick\nBrown fox.";
      const hits = findMatchingParagraphsInFulltext(raw, "  QUICK   brown ");
      assert.lengthOf(hits, 1);
      assert.equal(
        normalizeFulltextMatchText(hits[0].text),
        "the quick brown fox.",
      );
    });
  });

  describe("syntheticFulltextStreamId", function () {
    it("returns a stable negative id", function () {
      const a = syntheticFulltextStreamId(10, 2, 3);
      const b = syntheticFulltextStreamId(10, 2, 3);
      assert.equal(a, b);
      assert.isBelow(a, 0);
      assert.notEqual(syntheticFulltextStreamId(10, 2, 4), a);
    });
  });

  describe("paragraphOverlapsAnnotationQuote", function () {
    it("detects containment either way", function () {
      assert.isTrue(
        paragraphOverlapsAnnotationQuote(
          "The whole paragraph about liberty and justice.",
          "liberty and justice",
        ),
      );
      assert.isTrue(
        paragraphOverlapsAnnotationQuote(
          "short quote",
          "A short quote embedded somewhere.",
        ),
      );
      assert.isFalse(
        paragraphOverlapsAnnotationQuote(
          "Completely different text here.",
          "liberty and justice",
        ),
      );
    });
  });

  describe("dedupeFulltextAgainstAnnotations", function () {
    function row(
      overrides: Partial<MyAnnotationStreamEntry>,
    ): MyAnnotationStreamEntry {
      return {
        id: 1,
        quote: "",
        comment: "",
        color: "#ffd400",
        dateAdded: "",
        dateModified: "",
        pageLabel: "",
        sortIndex: "",
        parent: { id: 100 } as Zotero.Item,
        ...overrides,
      };
    }

    it("drops full-text paragraphs that overlap annotation quotes on the same parent", function () {
      const annotations = [
        row({
          id: 1,
          kind: "annotation",
          quote: "liberty and justice",
          parent: { id: 100 } as Zotero.Item,
        }),
      ];
      const fulltext = [
        row({
          id: -1,
          kind: "fulltext",
          quote: "The whole paragraph about liberty and justice for all.",
          color: "",
          parent: { id: 100 } as Zotero.Item,
        }),
        row({
          id: -2,
          kind: "fulltext",
          quote: "Unrelated paragraph on another topic.",
          color: "",
          parent: { id: 100 } as Zotero.Item,
        }),
        row({
          id: -3,
          kind: "fulltext",
          quote: "The whole paragraph about liberty and justice for all.",
          color: "",
          parent: { id: 200 } as Zotero.Item,
        }),
      ];
      const kept = dedupeFulltextAgainstAnnotations(annotations, fulltext);
      assert.deepEqual(
        kept.map((entry) => entry.id),
        [-2, -3],
      );
    });
  });
});
