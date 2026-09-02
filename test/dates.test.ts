import { assert } from "chai";
import {
  formatRelativeReadingDate,
  formatRelativeTimestamp,
  parseItemDateMs,
} from "../src/utils/dates";

describe("dates", function () {
  describe("parseItemDateMs", function () {
    it("parses Zotero SQL UTC datetimes", function () {
      assert.equal(
        parseItemDateMs("2026-09-02 12:00:00"),
        Date.parse("2026-09-02T12:00:00Z"),
      );
    });
  });

  describe("formatRelativeTimestamp", function () {
    it("formats hours and days in the given locale", function () {
      const now = Date.parse("2026-09-02T12:00:00Z");
      const hours = formatRelativeTimestamp(
        "2026-09-02 10:00:00",
        now,
        "en-US",
      );
      assert.equal(hours?.relative, "2 hours ago");
      assert.ok(hours?.absolute);
      const almostHour = formatRelativeTimestamp(
        "2026-09-02 11:05:00",
        now,
        "en-US",
      );
      assert.equal(almostHour?.relative, "1 hour ago");
      const days = formatRelativeTimestamp("2026-08-31 12:00:00", now, "en-US");
      assert.equal(days?.relative, "2 days ago");
    });

    it("formats just now", function () {
      const stamp = formatRelativeTimestamp(
        "2026-09-02 12:00:00",
        Date.parse("2026-09-02T12:00:00Z"),
        "en-US",
      );
      assert.equal(stamp?.relative, "now");
    });

    it("returns null for empty values", function () {
      assert.equal(
        formatRelativeTimestamp(
          "",
          Date.parse("2026-09-02T12:00:00Z"),
          "en-US",
        ),
        null,
      );
    });
  });

  describe("formatRelativeReadingDate", function () {
    it("uses calendar days, not time of day", function () {
      const now = new Date(2026, 8, 2, 21, 15);
      assert.equal(
        formatRelativeReadingDate("2026-09-02", now, "en-US"),
        "today",
      );
      assert.equal(
        formatRelativeReadingDate("2026-09-03", now, "en-US"),
        "tomorrow",
      );
      assert.equal(
        formatRelativeReadingDate("2026-09-01", now, "en-US"),
        "yesterday",
      );
    });

    it("formats nearby and farther dates", function () {
      const now = new Date(2026, 8, 2, 21, 15);
      assert.equal(
        formatRelativeReadingDate("2026-09-05", now, "en-US"),
        "in 3 days",
      );
      assert.equal(
        formatRelativeReadingDate("2026-09-23", now, "en-US"),
        "in 3 weeks",
      );
    });

    it("returns null for invalid dates", function () {
      assert.equal(
        formatRelativeReadingDate(
          "not-a-date",
          new Date(2026, 8, 2, 21, 15),
          "en-US",
        ),
        null,
      );
    });
  });
});
