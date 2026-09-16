import { assert } from "chai";
import { placePublishCitationBeforeInstructions } from "../src/utils/publishHtmlEnhance";

function citationEl(
  doc: Document,
  text = "Doe, J. (2020). Title.",
): HTMLElement {
  const meta = doc.createElement("div");
  meta.className = "syllabus-item-metadata syllabus-publish-citation";
  meta.textContent = text;
  return meta;
}

describe("placePublishCitationBeforeInstructions", function () {
  it("puts row citation above reading instructions", function () {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="syllabus-item-card" data-item-id="1">
        <div class="syllabus-item-text">
          <div class="flex"><div class="syllabus-item-title">Paper</div></div>
          <div class="syllabus-item-description">Read pp. 1–20</div>
        </div>
      </div>
    `;
    const card = root.querySelector(".syllabus-item-card")!;
    const meta = citationEl(document);
    placePublishCitationBeforeInstructions(card, meta, "row");

    const textCol = card.querySelector(".syllabus-item-text")!;
    const kids = [...textCol.children].map((el) => el.className);
    assert.include(kids[0], "flex");
    assert.include(kids[1], "syllabus-publish-citation");
    assert.include(kids[2], "syllabus-item-description");
  });

  it("keeps expanded citation above instructions and drops reference", function () {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="syllabus-item-card" data-item-id="1">
        <div class="syllabus-item-text">
          <div class="syllabus-item-title">Paper</div>
          <div class="syllabus-item-metadata">Author · 2020</div>
          <div class="syllabus-item-reference">Old full cite</div>
          <div class="syllabus-item-description">Skim chapter 1</div>
        </div>
      </div>
    `;
    const card = root.querySelector(".syllabus-item-card")!;
    const meta = card.querySelector(".syllabus-item-metadata") as HTMLElement;
    meta.classList.add("syllabus-publish-citation");
    meta.textContent = "Doe, J. (2020). Paper.";
    placePublishCitationBeforeInstructions(card, meta, "expanded");

    assert.isNull(card.querySelector(".syllabus-item-reference"));
    const textCol = card.querySelector(".syllabus-item-text")!;
    const order = [...textCol.children].map((el) =>
      el.classList.contains("syllabus-publish-citation")
        ? "citation"
        : el.classList.contains("syllabus-item-description")
          ? "instruction"
          : "other",
    );
    assert.deepEqual(order, ["other", "citation", "instruction"]);
  });

  it("inserts gallery citation above instructions inside meta", function () {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="syllabus-gallery-tile" data-item-id="1">
        <div class="syllabus-gallery-meta">
          <div class="syllabus-gallery-title">Cover Paper</div>
          <div class="syllabus-gallery-creator">Ada</div>
          <div class="syllabus-gallery-instruction">Skim chapter 1</div>
        </div>
      </div>
    `;
    const card = root.querySelector(".syllabus-gallery-tile")!;
    const meta = citationEl(document);
    placePublishCitationBeforeInstructions(card, meta, "standard");

    const galleryMeta = card.querySelector(".syllabus-gallery-meta")!;
    const order = [...galleryMeta.children].map((el) => el.className);
    assert.include(order[0], "syllabus-gallery-title");
    assert.include(order[1], "syllabus-gallery-creator");
    assert.include(order[2], "syllabus-publish-citation");
    assert.include(order[3], "syllabus-gallery-instruction");
  });

  it("inserts magazine citation above instructions", function () {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="syllabus-magazine-tile" data-item-id="1">
        <div class="syllabus-magazine-body">
          <div class="syllabus-magazine-title">Essay</div>
          <div class="syllabus-magazine-byline">Bea</div>
          <div class="syllabus-magazine-instruction">Optional</div>
          <div class="syllabus-magazine-abstract">Blurb</div>
        </div>
      </div>
    `;
    const card = root.querySelector(".syllabus-magazine-tile")!;
    const meta = citationEl(document);
    placePublishCitationBeforeInstructions(card, meta, "standard");

    const body = card.querySelector(".syllabus-magazine-body")!;
    const order = [...body.children].map((el) =>
      el.classList.contains("syllabus-publish-citation")
        ? "citation"
        : el.classList.contains("syllabus-magazine-instruction")
          ? "instruction"
          : el.classList.contains("syllabus-magazine-abstract")
            ? "abstract"
            : "other",
    );
    assert.deepEqual(order, [
      "other",
      "other",
      "citation",
      "instruction",
      "abstract",
    ]);
  });
});
