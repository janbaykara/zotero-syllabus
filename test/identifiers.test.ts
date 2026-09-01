import { assert } from "chai";
import {
  identifiersFromFields,
  isbn10To13,
  normalizeArxiv,
  normalizeDoi,
  normalizeIsbn,
  normalizePmcid,
  normalizePmid,
} from "../src/utils/identifiers";

describe("identifiers", function () {
  describe("normalizeDoi", function () {
    it("strips doi.org URLs and doi: prefixes", function () {
      assert.equal(normalizeDoi("10.1234/FOO"), "10.1234/foo");
      assert.equal(normalizeDoi("https://doi.org/10.1234/foo"), "10.1234/foo");
      assert.equal(
        normalizeDoi("http://dx.doi.org/10.1234/foo/"),
        "10.1234/foo",
      );
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

  describe("normalizePmid", function () {
    it("accepts bare digits, prefixes, and pubmed URLs", function () {
      assert.equal(normalizePmid("12345678"), "12345678");
      assert.equal(normalizePmid("PMID: 12345678"), "12345678");
      assert.equal(
        normalizePmid("https://pubmed.ncbi.nlm.nih.gov/12345678/"),
        "12345678",
      );
      assert.equal(
        normalizePmid("https://www.ncbi.nlm.nih.gov/pubmed/12345678"),
        "12345678",
      );
      assert.equal(normalizePmid("not a pmid"), "");
    });
  });

  describe("normalizePmcid", function () {
    it("canonicalizes to PMC plus digits", function () {
      assert.equal(normalizePmcid("PMC1234567"), "PMC1234567");
      assert.equal(normalizePmcid("pmcid: 1234567"), "PMC1234567");
      assert.equal(
        normalizePmcid("https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/"),
        "PMC1234567",
      );
      assert.equal(normalizePmcid("not a pmcid"), "");
    });
  });

  describe("normalizeArxiv", function () {
    it("strips URLs, prefixes, and versions", function () {
      assert.equal(normalizeArxiv("2301.12345"), "2301.12345");
      assert.equal(normalizeArxiv("arXiv:2301.12345v2"), "2301.12345");
      assert.equal(
        normalizeArxiv("https://arxiv.org/abs/2301.12345v1"),
        "2301.12345",
      );
      assert.equal(
        normalizeArxiv("https://arxiv.org/pdf/hep-th/9901001.pdf"),
        "hep-th/9901001",
      );
      assert.equal(normalizeArxiv("not-arxiv"), "");
    });
  });

  describe("identifiersFromFields", function () {
    it("reads PMID, PMCID, and arXiv from Extra and URL", function () {
      assert.equal(
        identifiersFromFields({ extra: "PMID: 12345678" }).pmid,
        "12345678",
      );
      assert.equal(
        identifiersFromFields({ extra: "PMCID: PMC7654321" }).pmcid,
        "PMC7654321",
      );
      assert.equal(
        identifiersFromFields({ extra: "arXiv: 2301.12345v2" }).arxiv,
        "2301.12345",
      );
      assert.equal(
        identifiersFromFields({
          url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
        }).pmid,
        "12345678",
      );
      assert.equal(
        identifiersFromFields({
          extra: "eprinttype: arxiv\neprint: 2301.12345",
        }).arxiv,
        "2301.12345",
      );
      assert.equal(
        identifiersFromFields({ archiveID: "hep-th/9901001" }).arxiv,
        "hep-th/9901001",
      );
    });
  });
});
