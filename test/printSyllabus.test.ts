import { assert } from "chai";
import { serializeSyllabusForPrint } from "../src/utils/printSyllabus";

describe("serializeSyllabusForPrint", function () {
  it("keeps distinct course code and institution in the masthead", function () {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="syllabus-masthead-meta">
        <input class="in-[.print]:hidden" value="EDU101" />
        <div class="hidden in-[.print]:block">stale-code</div>
        <input class="in-[.print]:hidden" value="Test University" />
        <div class="hidden in-[.print]:block">stale-institution</div>
      </div>
    `;
    // cloneNode does not copy live input values unless set as attributes;
    // mirror TextInput by ensuring both .value and the value attribute exist.
    const inputs = root.querySelectorAll("input");
    inputs[0].value = "EDU101";
    inputs[0].setAttribute("value", "EDU101");
    inputs[1].value = "Test University";
    inputs[1].setAttribute("value", "Test University");

    const html = serializeSyllabusForPrint(root);
    const out = document.createElement("div");
    out.innerHTML = html;
    const masthead = out.querySelector(".syllabus-masthead-meta");
    assert.ok(masthead);
    assert.equal(
      masthead!.textContent?.replace(/\s+/g, " ").trim(),
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
});
