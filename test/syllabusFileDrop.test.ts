import { assert } from "chai";
import {
  highlightSyllabusFileDropzones,
  hitTargetFromDragEvent,
  resolveSyllabusFileDropTarget,
  SYLLABUS_FILE_DROP_OVERLAY_CLASS,
} from "../src/modules/syllabusFileDrop";

function dropNode(
  attrs: Record<string, string>,
  parent: EventTarget | null = null,
): EventTarget {
  return {
    nodeType: 1,
    getAttribute: (name: string) => attrs[name] ?? null,
    parentElement: parent,
  } as unknown as EventTarget;
}

describe("syllabusFileDrop", function () {
  describe("resolveSyllabusFileDropTarget", function () {
    it("walks up to a numbered class zone", function () {
      const zone = dropNode({
        "data-syllabus-file-drop": "class",
        "data-syllabus-class-number": "3",
      });
      const child = dropNode({}, zone);
      assert.deepEqual(resolveSyllabusFileDropTarget(child), {
        kind: "class",
        classNumber: 3,
      });
    });

    it("treats class-number null as unnumbered", function () {
      const zone = dropNode({
        "data-syllabus-file-drop": "class",
        "data-syllabus-class-number": "null",
      });
      assert.deepEqual(resolveSyllabusFileDropTarget(zone), {
        kind: "class",
        classNumber: null,
      });
    });

    it("resolves further reading", function () {
      const zone = dropNode({
        "data-syllabus-file-drop": "further-reading",
      });
      assert.deepEqual(resolveSyllabusFileDropTarget(zone), {
        kind: "further-reading",
      });
    });

    it("falls back to the collection when no zone is found", function () {
      const child = dropNode({});
      assert.deepEqual(resolveSyllabusFileDropTarget(child), {
        kind: "collection",
      });
      assert.deepEqual(resolveSyllabusFileDropTarget(null), {
        kind: "collection",
      });
    });
  });

  describe("hitTargetFromDragEvent", function () {
    it("prefers the element under the cursor over event.target", function () {
      const underCursor = dropNode({
        "data-syllabus-file-drop": "class",
        "data-syllabus-class-number": "2",
      });
      const page = dropNode({});
      const doc = {
        elementsFromPoint: () => [underCursor],
      };
      Object.assign(page, { ownerDocument: doc });
      const hit = hitTargetFromDragEvent({
        clientX: 40,
        clientY: 80,
        target: page,
      });
      assert.deepEqual(resolveSyllabusFileDropTarget(hit), {
        kind: "class",
        classNumber: 2,
      });
    });

    it("skips the page overlay when it is on top of the stack", function () {
      const classZone = dropNode({
        "data-syllabus-file-drop": "class",
        "data-syllabus-class-number": "4",
      });
      const overlay = {
        nodeType: 1,
        className: SYLLABUS_FILE_DROP_OVERLAY_CLASS,
        closest: (selector: string) =>
          selector === `.${SYLLABUS_FILE_DROP_OVERLAY_CLASS}` ? overlay : null,
      };
      const page = dropNode({});
      Object.assign(page, {
        ownerDocument: {
          elementsFromPoint: () => [overlay, classZone],
        },
      });
      const hit = hitTargetFromDragEvent({
        clientX: 10,
        clientY: 10,
        target: page,
      });
      assert.deepEqual(resolveSyllabusFileDropTarget(hit), {
        kind: "class",
        classNumber: 4,
      });
    });
  });

  describe("highlightSyllabusFileDropzones", function () {
    it("sets dropzone-active without using the Element constructor", function () {
      const items = {
        nodeType: 1,
        classList: {
          contains: (name: string) => name === "syllabus-class-items",
        },
        dataset: { dropzoneActive: "false" },
        querySelector: () => null,
      };
      const zone = {
        nodeType: 1,
        getAttribute: (name: string) =>
          name === "data-syllabus-file-drop" ? "class" : "3",
        hasAttribute: (name: string) => name === "data-syllabus-file-drop",
        classList: { contains: () => false },
        dataset: { dropzoneActive: "false" },
        querySelector: (sel: string) =>
          sel === ".syllabus-class-items" ? items : null,
        parentElement: null,
      };
      const child = {
        nodeType: 1,
        getAttribute: () => null,
        hasAttribute: () => false,
        parentElement: zone,
        ownerDocument: {
          querySelectorAll: () => [zone],
        },
      };
      highlightSyllabusFileDropzones(child as unknown as EventTarget);
      assert.equal(items.dataset.dropzoneActive, "true");
      assert.equal(zone.dataset.dropzoneActive, "false");
    });
  });
});
