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
    assert.include(html, 'href="files/ATT.pdf"');
    assert.include(html, '<iframe src="files/ATT.pdf"');
    assert.include(html, "bibliography.ris");
    assert.include(html, "<details");
    assert.include(html, 'href="https://github.com/janbaykara/zotero-syllabus"');
    assert.include(html, 'href="https://www.zotero.org/"');
    assert.include(html, "Zotero Syllabus");
  });
});
