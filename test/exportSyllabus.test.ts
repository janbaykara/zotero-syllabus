import { assert } from "chai";
import {
  blocksFromPrintableHtml,
  blocksToDocxParagraphs,
  blocksToMarkdown,
  runsFromNode,
} from "../src/utils/exportSyllabus";

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<body class="print">
  <div class="syllabus-page">
    <div class="text-3xl font-semibold">Intro Course</div>
    <div class="syllabus-masthead-meta">EDU101 · Test University</div>
    <div class="syllabus-collection-description">A short overview.</div>
    <div class="syllabus-class-group">
      <div class="syllabus-class-heading">
        <div class="syllabus-class-header">Week 1</div>
        <div class="text-2xl">Foundations</div>
      </div>
      <div class="syllabus-item-card" data-print-url="https://example.edu/paper">
        <div class="syllabus-item-title-row">
          <div class="syllabus-item-title">
            <a class="syllabus-item-print-link" href="https://example.edu/paper">Linked Paper</a>
          </div>
        </div>
        <div class="syllabus-item-metadata">Author · 2020</div>
        <div class="syllabus-item-description">Read chapters 1–2.</div>
      </div>
      <div class="syllabus-item-card">
        <div class="syllabus-item-title-row">
          <div class="syllabus-item-title">No URL Paper</div>
        </div>
      </div>
    </div>
    <div data-tour="syllabus-further-reading">
      <div class="font-semibold text-2xl">Further reading</div>
      <div class="syllabus-item-card">
        <div class="syllabus-item-title-row">
          <div class="syllabus-item-title">Extra Essay</div>
        </div>
      </div>
    </div>
  </div>
  <section class="syllabus-print-bibliography">
    <h2 class="syllabus-print-bibliography-heading">Bibliography</h2>
    <div class="syllabus-print-bibliography-body">
      <div class="csl-entry">Doe, J. (2020). <i>Linked Paper</i>.</div>
      <div class="csl-entry">Smith, A. (2019). No URL Paper.</div>
    </div>
  </section>
</body>
</html>`;

describe("exportSyllabus blocks", function () {
  it("extracts linked and plain title runs from a node", function () {
    const root = document.createElement("div");
    root.innerHTML =
      '<a class="syllabus-item-print-link" href="https://example.edu/x">Hello</a> world';
    const runs = runsFromNode(root);
    assert.deepEqual(runs, [
      { type: "link", text: "Hello", href: "https://example.edu/x" },
      { type: "text", text: "world" },
    ]);
  });

  it("walks printable HTML into markdown with links and bibliography", function () {
    const blocks = blocksFromPrintableHtml(FIXTURE_HTML);
    const md = blocksToMarkdown(blocks);

    assert.match(md, /^# Intro Course/m);
    assert.include(md, "EDU101 · Test University");
    assert.include(md, "A short overview.");
    assert.match(md, /^## Week 1 Foundations/m);
    assert.include(md, "- [Linked Paper](https://example.edu/paper)");
    assert.include(md, "- No URL Paper");
    assert.include(md, "Author · 2020");
    assert.include(md, "Read chapters 1–2.");
    assert.match(md, /^## Further reading/m);
    assert.include(md, "- Extra Essay");
    assert.match(md, /^## Bibliography/m);
    assert.include(md, "Doe, J. (2020).");
    assert.include(md, "Smith, A. (2019). No URL Paper.");
  });

  it("maps blocks to DOCX paragraphs with a linked title", function () {
    const blocks = blocksFromPrintableHtml(FIXTURE_HTML);
    const paragraphs = blocksToDocxParagraphs(blocks);
    assert.isAtLeast(paragraphs.length, 8);
    assert.isTrue(
      blocks.some(
        (block) =>
          block.type !== "blank" &&
          block.runs.some(
            (run) =>
              run.type === "link" && run.href === "https://example.edu/paper",
          ),
      ),
    );
  });
});
