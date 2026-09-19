import { assert } from "chai";
import {
  getPageCount,
  pageCountFromPagesField,
  parseRunningTimeMinutes,
} from "../src/utils/readingTime";

function mockItem(
  itemType: string,
  fields: Record<string, string>,
): Zotero.Item {
  return {
    itemType,
    getField(field: string) {
      return fields[field] ?? "";
    },
  } as unknown as Zotero.Item;
}

describe("readingTime", function () {
  describe("parseRunningTimeMinutes", function () {
    it("reads H:MM:SS and H:MM as hours and minutes, not parseInt", function () {
      assert.equal(parseRunningTimeMinutes("1:30:00"), 90);
      assert.equal(parseRunningTimeMinutes("1:30"), 90);
      assert.equal(parseRunningTimeMinutes("0:45:00"), 45);
      assert.equal(parseRunningTimeMinutes("90"), 90);
      assert.equal(parseRunningTimeMinutes("1 hr 30 min"), 90);
      assert.equal(parseRunningTimeMinutes("90 min"), 90);
      assert.isNull(parseRunningTimeMinutes(""));
    });
  });

  describe("pageCountFromPagesField", function () {
    it("uses the last numeric range, ignoring roman prefixes", function () {
      assert.equal(pageCountFromPagesField("1-10"), 10);
      assert.equal(pageCountFromPagesField("iv, 1–200"), 200);
      assert.equal(pageCountFromPagesField("12"), 12);
      assert.isNull(pageCountFromPagesField(""));
    });
  });

  describe("getPageCount", function () {
    it("ignores a 1-page count on books", function () {
      assert.isNull(getPageCount(mockItem("book", { numPages: "1" })));
      assert.isNull(getPageCount(mockItem("book", { pages: "1" })));
      assert.equal(getPageCount(mockItem("book", { numPages: "240" })), 240);
      assert.equal(
        getPageCount(mockItem("journalArticle", { pages: "1" })),
        1,
      );
    });
  });
});
