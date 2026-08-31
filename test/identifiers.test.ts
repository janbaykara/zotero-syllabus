import { assert } from "chai";
import {
  isbn10To13,
  normalizeDoi,
  normalizeIsbn,
} from "../src/utils/identifiers";

describe("normalizeDoi", function () {
  it("strips doi.org URLs and doi: prefixes", function () {
    assert.equal(normalizeDoi("10.1234/FOO"), "10.1234/foo");
    assert.equal(normalizeDoi("https://doi.org/10.1234/foo"), "10.1234/foo");
    assert.equal(normalizeDoi("http://dx.doi.org/10.1234/foo/"), "10.1234/foo");
    assert.equal(normalizeDoi("doi:10.1234/foo"), "10.1234/foo");
    assert.equal(normalizeDoi(""), "");
  });
});

describe("normalizeIsbn", function () {
  it("equates ISBN-10 and the corresponding ISBN-13", function () {
    const isbn10 = "0-306-40615-2";
    const isbn13 = "978-0-306-40615-7";
    assert.equal(isbn10To13(isbn10), "9780306406157");
    assert.equal(normalizeIsbn(isbn10), "9780306406157");
    assert.equal(normalizeIsbn(isbn13), "9780306406157");
  });

  it("strips hyphens on already-13-digit values", function () {
    assert.equal(normalizeIsbn("978-1-4028-9462-6"), "9781402894626");
  });
});
