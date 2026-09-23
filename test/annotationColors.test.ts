import { assert } from "chai";
import {
  annotationColorFilterFromMap,
  annotationMatchesColorFilter,
  annotationSwatchUsesDarkMark,
  collectAnnotationColors,
  parseAnnotationColorFilter,
  serializeAnnotationColorFilter,
  toggleAnnotationColorFilter,
} from "../src/utils/annotationColors";

describe("annotationColors", function () {
  describe("parseAnnotationColorFilter", function () {
    it("treats empty input as no filter", function () {
      assert.deepEqual(parseAnnotationColorFilter(""), []);
      assert.deepEqual(parseAnnotationColorFilter("  "), []);
      assert.deepEqual(parseAnnotationColorFilter(undefined), []);
    });

    it("keeps hex colours and migrates legacy names", function () {
      assert.deepEqual(
        parseAnnotationColorFilter("yellow,#F8C449,not-a-color,#2ea8e5"),
        ["#ffd400", "#f8c449", "#2ea8e5"],
      );
    });

    it("deduplicates hexes", function () {
      assert.deepEqual(parseAnnotationColorFilter("#2ea8e5,blue,#2EA8E5"), [
        "#2ea8e5",
      ]);
    });
  });

  describe("serializeAnnotationColorFilter", function () {
    it("round-trips a hex subset", function () {
      assert.equal(
        serializeAnnotationColorFilter(["#a28ae5", "#aaaaaa"]),
        "#a28ae5,#aaaaaa",
      );
    });
  });

  describe("toggleAnnotationColorFilter", function () {
    it("adds and removes a hex", function () {
      assert.deepEqual(toggleAnnotationColorFilter([], "#ffd400"), ["#ffd400"]);
      assert.deepEqual(
        toggleAnnotationColorFilter(["#ffd400", "#ff6666"], "#ffd400"),
        ["#ff6666"],
      );
    });
  });

  describe("annotationMatchesColorFilter", function () {
    it("shows every colour when nothing is selected", function () {
      assert.isTrue(annotationMatchesColorFilter("#ffd400", []));
      assert.isTrue(annotationMatchesColorFilter("#2ea8e5", []));
    });

    it("keeps only selected hexes", function () {
      assert.isTrue(
        annotationMatchesColorFilter("#ffd400", ["#ffd400", "#2ea8e5"]),
      );
      assert.isTrue(
        annotationMatchesColorFilter("#2EA8E5", ["#ffd400", "#2ea8e5"]),
      );
      assert.isFalse(
        annotationMatchesColorFilter("#ff6666", ["#ffd400", "#2ea8e5"]),
      );
    });
  });

  describe("collectAnnotationColors", function () {
    it("returns unique hexes with the Zotero palette first", function () {
      assert.deepEqual(
        collectAnnotationColors([
          "#f8c449",
          "#2EA8E5",
          "#f8c449",
          "#ffd400",
          "#000000",
        ]),
        ["#ffd400", "#2ea8e5", "#f8c449", "#000000"],
      );
    });

    it("returns an empty list when nothing is present", function () {
      assert.deepEqual(collectAnnotationColors([]), []);
    });
  });

  describe("annotationColorFilterFromMap", function () {
    it("keeps feed, explorer, and gallery scopes independent", function () {
      const map = {
        feed: "#ffd400",
        explorer: "#2ea8e5",
        "12": "#ff6666",
      };
      assert.deepEqual(annotationColorFilterFromMap(map, "feed"), ["#ffd400"]);
      assert.deepEqual(annotationColorFilterFromMap(map, "explorer"), [
        "#2ea8e5",
      ]);
      assert.deepEqual(annotationColorFilterFromMap(map, "12"), ["#ff6666"]);
      assert.deepEqual(annotationColorFilterFromMap(map, "99"), []);
    });

    it("falls back to the legacy CSV only for the feed", function () {
      assert.deepEqual(annotationColorFilterFromMap({}, "feed", "#aaaaaa"), [
        "#aaaaaa",
      ]);
      assert.deepEqual(
        annotationColorFilterFromMap({}, "explorer", "#aaaaaa"),
        [],
      );
      assert.deepEqual(
        annotationColorFilterFromMap({ feed: "#ffd400" }, "feed", "#aaaaaa"),
        ["#ffd400"],
      );
    });
  });

  describe("annotationSwatchUsesDarkMark", function () {
    it("uses a dark mark on light yellow and a light mark on black", function () {
      assert.isTrue(annotationSwatchUsesDarkMark("#ffd400"));
      assert.isFalse(annotationSwatchUsesDarkMark("#000000"));
    });
  });
});
