import { assert } from "chai";
import { noteHtmlToDisplayHtml } from "../src/utils/noteHtml";

describe("noteHtml", function () {
  it("keeps headings, quotes, and self-closed breaks", function () {
    const html = noteHtmlToDisplayHtml(
      "<h2>Why</h2><blockquote><p>quoted</p></blockquote><p>line<br>break</p>",
    );
    assert.match(html, /<h2[^>]*>Why<\/h2>/);
    assert.include(html, "<blockquote>");
    assert.match(html, /<br\s*\/>/);
    assert.notMatch(html, /<br(?!\s*\/)/);
  });

  it("keeps Zotero note structure and emphasis", function () {
    const html = noteHtmlToDisplayHtml(
      '<div data-schema-version="9"><p>Allan <strong>recommended</strong> this in&nbsp;2024</p><ul><li><p>one</p></li></ul></div>',
    );
    assert.match(html, /<p[^>]*>Allan <strong>recommended<\/strong> this/);
    assert.include(html, "<ul>");
    assert.include(html, "<li>");
    assert.notInclude(html, "data-schema-version");
    assert.notInclude(html, "&nbsp;");
  });

  it("keeps links and blocks javascript urls", function () {
    const html = noteHtmlToDisplayHtml(
      '<p><a href="https://example.edu">safe</a> <a href="javascript:alert(1)">bad</a></p>',
    );
    assert.include(html, 'href="https://example.edu"');
    assert.include(html, 'target="_blank"');
    assert.include(html, 'rel="noopener noreferrer"');
    assert.notInclude(html, "javascript:");
    assert.match(html, /safe<\/a>\s*bad<\/p>/);
  });

  it("strips scripts and empty wrapper notes", function () {
    assert.notInclude(
      noteHtmlToDisplayHtml(
        '<div data-schema-version="9"><p>ok</p><script>alert(1)</script></div>',
      ),
      "<script",
    );
    assert.equal(
      noteHtmlToDisplayHtml('<div data-schema-version="9"><p></p></div>'),
      "",
    );
    assert.equal(noteHtmlToDisplayHtml(""), "");
  });
});
