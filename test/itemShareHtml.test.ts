import { assert } from "chai";
import {
  buildItemShareHtml,
  isEmbeddableShareContentType,
} from "../src/utils/itemShareHtml";
import { absoluteItemFileHref } from "../src/utils/publishTarget";

describe("item share HTML", function () {
  it("marks PDF/HTML/images embeddable", function () {
    assert.isTrue(isEmbeddableShareContentType("application/pdf", "pdf"));
    assert.isTrue(isEmbeddableShareContentType("text/html", "html"));
    assert.isTrue(isEmbeddableShareContentType("image/png", "png"));
    assert.isFalse(
      isEmbeddableShareContentType("application/epub+zip", "epub"),
    );
    assert.isFalse(
      isEmbeddableShareContentType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "docx",
      ),
    );
  });

  it("builds absolute shared file hrefs", function () {
    assert.equal(
      absoluteItemFileHref("9", "1", "ITEMKEY1", "files/ATT.pdf"),
      "/u/9/1/item/ITEMKEY1/files/ATT.pdf",
    );
  });

  it("renders cover, sidebar, files, and iframe", function () {
    const html = buildItemShareHtml({
      title: "Test Paper",
      creators: "Ada Lovelace",
      itemType: "journalArticle",
      itemTypeLabel: "Journal Article",
      description: "An abstract",
      canonicalUrl: "https://example.test/u/1/1/item/ITEM/",
      coverDataUrl: "data:image/png;base64,abc",
      metaRows: [
        { label: "Creators", value: "Ada Lovelace" },
        { label: "DOI", value: "10.1/x", href: "https://doi.org/10.1/x" },
      ],
      files: [
        {
          relPath: "files/ATT.pdf",
          label: "paper.pdf",
          contentType: "application/pdf",
          embeddable: true,
        },
      ],
      embedRelPath: "files/ATT.pdf",
      citationDownloads: {
        risHref: "bibliography.ris",
        bibHref: "bibliography.bib",
      },
    });
    assert.include(html, "Test Paper");
    assert.include(html, "Ada Lovelace");
    assert.include(html, "data:image/png;base64,abc");
    assert.include(html, "syllabus-gallery-cover-natural");
    assert.include(html, "syllabus-gallery-cover-img");
    assert.include(html, 'href="files/ATT.pdf"');
    assert.include(html, '<iframe src="files/ATT.pdf"');
    assert.include(html, "bibliography.ris");
    assert.include(html, "<details");
    assert.include(
      html,
      'href="https://github.com/janbaykara/zotero-syllabus"',
    );
    assert.include(html, 'href="https://www.zotero.org/"');
    assert.include(html, "Zotero Syllabus");
    assert.notInclude(html, 'class="annotations"');
  });

  it("applies book spine treatment on book covers", function () {
    const html = buildItemShareHtml({
      title: "Cold Intimacies",
      creators: "Illouz",
      itemType: "book",
      itemTypeLabel: "Book",
      canonicalUrl: "https://example.test/u/1/1/item/ITEM/",
      coverDataUrl: "data:image/png;base64,abc",
      metaRows: [],
      files: [],
    });
    assert.include(html, "syllabus-gallery-book-spine");
    assert.include(html, "syllabus-gallery-cover-natural");
  });

  it("renders annotations section with copy controls in given order", function () {
    const html = buildItemShareHtml({
      title: "Annotated Paper",
      creators: "Ada Lovelace",
      itemType: "journalArticle",
      itemTypeLabel: "Journal Article",
      canonicalUrl: "https://example.test/u/1/1/item/ITEM/",
      metaRows: [],
      files: [],
      annotations: [
        {
          quote: "First quote in document",
          commentHtml: "",
          color: "#ffd400",
          pageLabel: "3",
          tags: ["method"],
          copyText: "First quote in document",
        },
        {
          quote: "Second quote later",
          commentHtml: "<p>A note</p>",
          color: "#ff6666",
          pageLabel: "12",
          tags: [],
          copyText: "Second quote later\n\nA note",
        },
      ],
    });
    assert.include(html, 'class="annotations"');
    assert.include(html, "First quote in document");
    assert.include(html, "Second quote later");
    assert.include(html, 'data-copy="First quote in document"');
    assert.include(html, 'class="ann-copy-all"');
    assert.include(
      html,
      'data-copy="First quote in document\n\nSecond quote later\n\nA note"',
    );
    assert.include(html, "--highlight-color:#ffd400");
    assert.include(html, "<p>A note</p>");
    assert.include(html, "navigator.clipboard");
    // Location order preserved as provided
    const firstIdx = html.indexOf("First quote in document");
    const secondIdx = html.indexOf("Second quote later");
    assert.isBelow(firstIdx, secondIdx);
  });

  it("omits annotations section when empty", function () {
    const html = buildItemShareHtml({
      title: "No Annotations",
      creators: "",
      itemType: "book",
      itemTypeLabel: "Book",
      canonicalUrl: "https://example.test/u/1/1/item/ITEM/",
      metaRows: [],
      files: [],
      annotations: [],
    });
    assert.notInclude(html, 'class="annotations"');
    assert.notInclude(html, "navigator.clipboard");
  });
});
