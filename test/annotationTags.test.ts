import { assert } from "chai";
import {
  annotationMatchesTagFilter,
  normalizeAnnotationTagFilter,
  parseAnnotationTagFilter,
  serializeAnnotationTagFilter,
} from "../src/utils/annotationTags";

describe("annotationTags", function () {
  describe("parseAnnotationTagFilter", function () {
    it("treats empty input as no filter", function () {
      assert.deepEqual(parseAnnotationTagFilter(""), []);
      assert.deepEqual(parseAnnotationTagFilter("  "), []);
      assert.deepEqual(parseAnnotationTagFilter(undefined), []);
    });

    it("parses JSON arrays and deduplicates case-insensitively", function () {
      assert.deepEqual(parseAnnotationTagFilter('["Todo","todo","Note"]'), [
        "Todo",
        "Note",
      ]);
    });

    it("falls back to comma or newline lists", function () {
      assert.deepEqual(parseAnnotationTagFilter("a,b, a"), ["a", "b"]);
      assert.deepEqual(parseAnnotationTagFilter("a\nb\n"), ["a", "b"]);
    });
  });

  describe("serializeAnnotationTagFilter", function () {
    it("round-trips tags as JSON", function () {
      assert.equal(serializeAnnotationTagFilter([]), "");
      assert.equal(
        serializeAnnotationTagFilter(["Todo", "Important"]),
        '["Todo","Important"]',
      );
    });
  });

  describe("normalizeAnnotationTagFilter", function () {
    it("trims and drops blanks", function () {
      assert.deepEqual(normalizeAnnotationTagFilter(["  a ", "", "b"]), [
        "a",
        "b",
      ]);
    });
  });

  describe("annotationMatchesTagFilter", function () {
    it("shows every annotation when nothing is selected", function () {
      assert.isTrue(annotationMatchesTagFilter([], []));
      assert.isTrue(annotationMatchesTagFilter(["Todo"], []));
    });

    it("keeps annotations that have any selected tag", function () {
      assert.isTrue(
        annotationMatchesTagFilter(["Todo", "Note"], ["todo", "Other"]),
      );
      assert.isFalse(annotationMatchesTagFilter(["Note"], ["Todo"]));
      assert.isFalse(annotationMatchesTagFilter([], ["Todo"]));
    });
  });
});
