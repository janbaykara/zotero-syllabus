import { assert } from "chai";
import { serializeSyllabusForPrint } from "../src/utils/printSyllabus";

describe("serializeSyllabusForPrint", function () {
  it("keeps distinct course code and institution in the masthead", function () {
    const root = document.createElement("div");
    const masthead = document.createElement("div");
    masthead.className = "syllabus-masthead-meta";

    const codeInput = document.createElement("input");
    codeInput.className = "in-[.print]:hidden";
    codeInput.value = "EDU101";
    codeInput.setAttribute("value", "EDU101");

    const codeMirror = document.createElement("div");
    codeMirror.className = "hidden in-[.print]:block";
    codeMirror.textContent = "stale-code";

    const institutionInput = document.createElement("input");
    institutionInput.className = "in-[.print]:hidden";
    institutionInput.value = "Test University";
    institutionInput.setAttribute("value", "Test University");

    const institutionMirror = document.createElement("div");
    institutionMirror.className = "hidden in-[.print]:block";
    institutionMirror.textContent = "stale-institution";

    masthead.append(
      codeInput,
      codeMirror,
      institutionInput,
      institutionMirror,
    );
    root.append(masthead);

    const html = serializeSyllabusForPrint(root);
    const out = document.createElement("div");
    out.innerHTML = html;
    const outMasthead = out.querySelector(".syllabus-masthead-meta");
    assert.ok(outMasthead);
    assert.equal(
      outMasthead!.textContent?.replace(/\s+/g, " ").trim(),
      "EDU101 · Test University",
    );
  });

  it("wraps item titles in links when a web URL is present", function () {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="syllabus-item-card" data-print-url="https://example.edu/paper">
        <div class="syllabus-item-title-row">
          <div class="syllabus-item-title">Linked Paper</div>
        </div>
      </div>
      <div class="syllabus-item-card">
        <div class="syllabus-item-title-row">
          <div class="syllabus-item-title">No URL Paper</div>
        </div>
      </div>
    `;

    const html = serializeSyllabusForPrint(root);
    const out = document.createElement("div");
    out.innerHTML = html;

    const linked = out.querySelector(
      ".syllabus-item-card[data-print-url] .syllabus-item-title a",
    );
    assert.ok(linked);
    assert.equal(linked!.getAttribute("href"), "https://example.edu/paper");
    assert.equal(linked!.textContent?.trim(), "Linked Paper");
    assert.ok(linked!.classList.contains("syllabus-item-print-link"));

    const unlinked = out.querySelectorAll(".syllabus-item-card")[1];
    assert.equal(unlinked.querySelector("a"), null);
    assert.equal(
      unlinked.querySelector(".syllabus-item-title")?.textContent?.trim(),
      "No URL Paper",
    );
  });

  it("applies denser item-card padding for row density than expanded", function () {
    const markup = `
      <div class="syllabus-item-card">
        <div class="syllabus-item-title-row">
          <div class="syllabus-item-title">Density Paper</div>
        </div>
      </div>
    `;

    const expandedRoot = document.createElement("div");
    expandedRoot.setAttribute("data-item-density", "expanded");
    expandedRoot.innerHTML = markup;

    const rowRoot = document.createElement("div");
    rowRoot.setAttribute("data-item-density", "row");
    rowRoot.innerHTML = markup;

    const expandedHtml = serializeSyllabusForPrint(expandedRoot, "expanded");
    const rowHtml = serializeSyllabusForPrint(rowRoot, "row");

    const expandedOut = document.createElement("div");
    expandedOut.innerHTML = expandedHtml;
    const rowOut = document.createElement("div");
    rowOut.innerHTML = rowHtml;

    const expandedCard = expandedOut.querySelector(
      ".syllabus-item-card",
    ) as HTMLElement;
    const rowCard = rowOut.querySelector(".syllabus-item-card") as HTMLElement;
    assert.ok(expandedCard);
    assert.ok(rowCard);
    assert.include(expandedCard.getAttribute("style") || "", "10px 14px");
    assert.include(rowCard.getAttribute("style") || "", "2px 0");
    assert.notInclude(rowCard.getAttribute("style") || "", "10px 14px");
  });
});
