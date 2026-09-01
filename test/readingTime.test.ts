import { assert } from "chai";
import {
  pageCountFromPagesField,
  parseRunningTimeMinutes,
} from "../src/utils/readingTime";

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
});
