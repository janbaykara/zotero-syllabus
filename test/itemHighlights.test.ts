import { assert } from "chai";
import {
  cleanHighlightText,
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_PREFERRED_MIN,
  normalizeHighlightColor,
  pickHighlightSample,
  truncateHighlightText,
} from "../src/utils/itemHighlights";

function hl(
  id: number,
  text: string,
  color = "#ffd400",
): { id: number; text: string; color: string } {
  return { id, text, color };
}

describe("itemHighlights", function () {
  describe("cleanHighlightText", function () {
    it("collapses whitespace", function () {
      assert.equal(cleanHighlightText("  foo   bar\n\tbaz  "), "foo bar baz");
    });

    it("joins spaced-out letter runs from PDF extraction", function () {
      assert.equal(cleanHighlightText("j u x t a p o s e d"), "juxtaposed");
      assert.include(
        cleanHighlightText(
          "Historical instances are j u x t a p o s e d to demonstrate",
        ),
        "juxtaposed",
      );
    });
  });

  describe("normalizeHighlightColor", function () {
    it("lowercases six-digit hex", function () {
      assert.equal(normalizeHighlightColor("#FFD400"), "#ffd400");
    });

    it("expands three-digit hex", function () {
      assert.equal(normalizeHighlightColor("#fc0"), "#ffcc00");
    });

    it("falls back to the default highlight yellow", function () {
      assert.equal(normalizeHighlightColor(""), DEFAULT_HIGHLIGHT_COLOR);
      assert.equal(normalizeHighlightColor("yellow"), DEFAULT_HIGHLIGHT_COLOR);
    });
  });

  describe("truncateHighlightText", function () {
    it("leaves short text alone", function () {
      assert.equal(truncateHighlightText("a short mark", 80), "a short mark");
    });

    it("cuts on a word boundary", function () {
      const text =
        "Cases are selected to cover all possibilities or to represent a range of subtypes.";
      const truncated = truncateHighlightText(text, 40);
      assert.isBelow(truncated.length, text.length);
      assert.match(truncated, /…$/);
      assert.notInclude(truncated, "possibilities");
    });
  });

  describe("pickHighlightSample", function () {
    const longA =
      "Certain areas of scholarly endeavor in contemporary social science have given rise to methodological reflection.";
    const longB =
      "Cases are selected to cover all possibilities, or to represent a range of sub-types or points on continua.";
    const longC =
      "what matters more in the Contrastoriented type is that the historical integrity of each case as a whole is carefully respected.";
    const longD =
      "reason for juxtaposing case histories is to persuade the reader that a given hypothesis can repeatedly demonstrate its fruitfulness.";
    const short = "macro-causal analysis";

    it("returns a stable subset for the same seed", function () {
      const highlights = [
        hl(1, longA, "#f74176"),
        hl(2, longB, "#f8c449"),
        hl(3, longC, "#6cc055"),
        hl(4, longD, "#589eed"),
        hl(5, `${longA} again`, "#f8c449"),
      ];
      const first = pickHighlightSample(highlights, 3, 713);
      const second = pickHighlightSample(highlights, 3, 713);
      assert.deepEqual(
        first.map((row) => row.id),
        second.map((row) => row.id),
      );
      assert.equal(first.length, 3);
    });

    it("varies with the seed", function () {
      const highlights = [
        hl(1, longA),
        hl(2, longB),
        hl(3, longC),
        hl(4, longD),
      ];
      const a = pickHighlightSample(highlights, 4, 1).map((row) => row.id);
      const b = pickHighlightSample(highlights, 4, 99).map((row) => row.id);
      assert.notDeepEqual(a, b);
    });

    it("prefers sentence-length highlights when enough exist", function () {
      const highlights = [
        hl(1, short),
        hl(2, longA),
        hl(3, longB),
        hl(4, longC),
      ];
      const picked = pickHighlightSample(highlights, 2, 4);
      assert.isTrue(
        picked.every((row) => row.text.length >= HIGHLIGHT_PREFERRED_MIN),
      );
      assert.notInclude(
        picked.map((row) => row.id),
        1,
      );
    });

    it("falls back to short highlights when that is all there is", function () {
      const highlights = [hl(1, short), hl(2, "contrast of contexts.")];
      const picked = pickHighlightSample(highlights, 2, 1);
      assert.equal(picked.length, 2);
    });

    it("spreads annotation colours before repeating one", function () {
      const highlights = [
        hl(1, longA, "#f8c449"),
        hl(2, longB, "#f8c449"),
        hl(3, longC, "#6cc055"),
        hl(4, longD, "#f8c449"),
      ];
      const picked = pickHighlightSample(highlights, 2, 2);
      const colors = new Set(picked.map((row) => row.color));
      assert.equal(picked.length, 2);
      assert.equal(colors.size, 2);
    });
  });
});
