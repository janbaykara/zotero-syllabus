import { assert } from "chai";
import {
  annotationCommentToDisplayHtml,
  annotationCommentToPlainText,
} from "../src/utils/annotationComment";

describe("annotationComment", function () {
  it("renders Zotero inline HTML tags", function () {
    const html = annotationCommentToDisplayHtml(
      "Scott, B. (2015) <i>the free psychotherapy network</i>, 4 June.",
    );
    assert.match(html, /<i[^>]*>the free psychotherapy network<\/i>/);
    assert.notInclude(html, "&lt;i&gt;");
  });

  it("emits XHTML-safe markup for nbsp (no &nbsp; entity)", function () {
    const html = annotationCommentToDisplayHtml("a\u00a0<i>b</i>");
    assert.notInclude(html, "&nbsp;");
    assert.match(html, /<i[^>]*>b<\/i>/);
  });

  it("escapes plain text and keeps newlines for pre-wrap", function () {
    const html = annotationCommentToDisplayHtml("a < b\nc");
    assert.equal(html, "a &lt; b\nc");
  });

  it("strips scripts and unsafe links", function () {
    const html = annotationCommentToDisplayHtml(
      '<script>alert(1)</script><b>ok</b> <a href="javascript:alert(1)">x</a> <a href="https://example.edu">y</a>',
    );
    assert.notInclude(html, "<script");
    assert.include(html, "<b>ok</b>");
    assert.notInclude(html, "javascript:");
    assert.include(html, 'href="https://example.edu"');
    assert.include(html, ">y</a>");
  });

  it("plain text strips tags for clipboard", function () {
    assert.equal(
      annotationCommentToPlainText("Hello <i>world</i>"),
      "Hello world",
    );
  });
});
