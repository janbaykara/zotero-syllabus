import { assert } from "chai";
import {
  canAcceptOsFileDrop,
  collectDroppedOsItems,
  dataTransferHasType,
  isOsFileDrag,
  isLeavingDropTarget,
  isSyllabusNoteFileName,
  osFileDropEffect,
  resolveNativeFileDropDestination,
} from "../src/utils/nativeFileDrop";

function fakeDataTransfer(types: string[]): DataTransfer {
  return {
    types: {
      includes: (type: string) => types.includes(type),
      contains: (type: string) => types.includes(type),
      length: types.length,
      [Symbol.iterator]: function* () {
        yield* types;
      },
    },
    files: [] as unknown as FileList,
  } as unknown as DataTransfer;
}

describe("nativeFileDrop", function () {
  describe("dataTransferHasType", function () {
    it("reads includes() and contains()", function () {
      const withIncludes = { includes: (type: string) => type === "Files" };
      const withContains = { contains: (type: string) => type === "Files" };
      assert.isTrue(
        dataTransferHasType(withIncludes as DataTransfer["types"], "Files"),
      );
      assert.isTrue(
        dataTransferHasType(withContains as DataTransfer["types"], "Files"),
      );
      assert.isFalse(
        dataTransferHasType(
          withIncludes as DataTransfer["types"],
          "zotero/item",
        ),
      );
    });
  });

  describe("isOsFileDrag", function () {
    it("accepts OS files even when the filename is also text/plain", function () {
      assert.isTrue(isOsFileDrag(fakeDataTransfer(["Files", "text/plain"])));
      assert.isTrue(
        isOsFileDrag(fakeDataTransfer(["application/x-moz-file", "Files"])),
      );
    });

    it("rejects Zotero and syllabus item drags", function () {
      assert.isFalse(isOsFileDrag(fakeDataTransfer(["zotero/item"])));
      assert.isFalse(
        isOsFileDrag(
          fakeDataTransfer([
            "text/plain",
            "application/x-syllabus-assignment-ids",
          ]),
        ),
      );
      assert.isFalse(isOsFileDrag(fakeDataTransfer(["text/plain"])));
    });

    it("accepts URL drops that are not Zotero items", function () {
      assert.isTrue(isOsFileDrag(fakeDataTransfer(["text/x-moz-url"])));
    });
  });

  describe("isSyllabusNoteFileName", function () {
    it("matches .syllabus regardless of case", function () {
      assert.isTrue(isSyllabusNoteFileName("course.syllabus"));
      assert.isTrue(isSyllabusNoteFileName("COURSE.SYLLABUS"));
      assert.isFalse(isSyllabusNoteFileName("paper.pdf"));
    });
  });

  describe("osFileDropEffect", function () {
    it("uses copy by default and Mac modifier keys on drop", function () {
      assert.equal(osFileDropEffect({}, true), "copy");
      assert.equal(osFileDropEffect({ metaKey: true }, true), "move");
      assert.equal(
        osFileDropEffect({ metaKey: true, altKey: true }, true),
        "link",
      );
    });

    it("uses Shift/Ctrl on non-Mac when dropEffect is unset", function () {
      assert.equal(osFileDropEffect({ shiftKey: true }, false), "move");
      assert.equal(
        osFileDropEffect({ shiftKey: true, ctrlKey: true }, false),
        "link",
      );
    });
  });

  describe("collectDroppedOsItems", function () {
    it("reads mozFullPath from FileList when DragDrop is unavailable", function () {
      const file = {
        name: "paper.pdf",
        mozFullPath: "/tmp/paper.pdf",
      } as File & { mozFullPath: string };
      const dataTransfer = {
        types: { includes: () => false },
        files: [file],
      } as unknown as DataTransfer;
      assert.deepEqual(collectDroppedOsItems(dataTransfer), [
        {
          kind: "file",
          file: "/tmp/paper.pdf",
          path: "/tmp/paper.pdf",
          name: "paper.pdf",
          isDirectory: false,
        },
      ]);
    });
  });

  describe("isLeavingDropTarget", function () {
    it("is true when leaving the container, false when entering a child", function () {
      const child = { nodeType: 1 } as unknown as EventTarget;
      const parent = {
        contains: (node: Node) => node === (child as unknown as Node),
      };
      assert.isTrue(isLeavingDropTarget(parent, null));
      assert.isFalse(isLeavingDropTarget(parent, child));
    });
  });

  describe("resolveNativeFileDropDestination", function () {
    it("returns a destination or null without throwing", function () {
      let dest: ReturnType<typeof resolveNativeFileDropDestination> = null;
      assert.doesNotThrow(() => {
        dest = resolveNativeFileDropDestination();
      });
      if (dest) {
        assert.isAbove(dest.libraryID, 0);
        assert.isBoolean(dest.canEdit);
        assert.isBoolean(dest.canEditFiles);
      }
      assert.isBoolean(canAcceptOsFileDrop());
    });
  });
});
