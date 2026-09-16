import { assert } from "chai";
import { proseToDisplayHtml, proseToHtml } from "../src/utils/prose";

describe("prose markdown", function () {
  it("renders paragraphs and soft breaks", function () {
    const html = proseToDisplayHtml(
      "First paragraph.\n\nSecond line soft-break\nstill second.",
    );
    assert.match(html, /<p>First paragraph\.<\/p>/);
    assert.match(
      html,
      /<p>Second line soft-break<br \/>\s*still second\.<\/p>/,
    );
  });

  it("renders emphasis, strong, code, and links", function () {
    const html = proseToDisplayHtml(
      "A **bold** and *italic* with `code` and [link](https://example.edu).",
    );
    assert.include(html, "<strong>bold</strong>");
    assert.include(html, "<em>italic</em>");
    assert.include(html, "<code>code</code>");
    assert.match(
      html,
      /<a href="https:\/\/example\.edu"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>link<\/a>/,
    );
  });

  it("renders lists and blockquotes", function () {
    const html = proseToDisplayHtml("- one\n- two\n\n> quoted\n\n1. a\n2. b");
    assert.include(html, "<ul>");
    assert.include(html, "<ol>");
    assert.include(html, "<blockquote>");
    assert.include(html, "<li>");
  });

  it("escapes raw HTML and blocks javascript links", function () {
    const html = proseToDisplayHtml(
      "<script>alert(1)</script> and [x](javascript:alert(1))",
    );
    assert.notInclude(html, "<script>");
    assert.notInclude(html.toLowerCase(), "javascript:");
  });

  it("expands soft breaks for Zotero notes", function () {
    const html = proseToHtml("Line one\nLine two");
    assert.notInclude(html, "<br");
    assert.match(html, /<p>Line one<\/p>\s*<p>Line two<\/p>/);
  });
});
