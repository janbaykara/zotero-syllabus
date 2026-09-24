import { assert } from "chai";
import {
  SCHEDULE_DATE_BAND_PX,
  SCHEDULE_WEEK_BAND_PX,
  measureScheduleStickyTops,
  scheduleStickyHeaderGap,
} from "../src/modules/scheduleSticky";

/** Live header heights from the Reading Schedule pane (Zotero 8, 13px root). */
const MEASURED_HEADER_WITH_SUBTITLE_PX = 81.3;
const MEASURED_HEADER_WITH_PARAGRAPH_MARGIN_PX = 94.3;
/** Former `SCHEDULE_HEADER_GAP_PX` — opened the unpainted slit under the title. */
const FORMER_HEADER_CLEARANCE_PX = 12;

describe("measureScheduleStickyTops", function () {
  it("does not add clearance under the header", function () {
    const header = MEASURED_HEADER_WITH_PARAGRAPH_MARGIN_PX;
    const tops = measureScheduleStickyTops({
      header,
      week: 37.1,
      date: 33.2,
    });
    assert.equal(tops.week, Math.floor(header));
    assert.isAtMost(scheduleStickyHeaderGap(header, tops.week), 0);
    assert.notEqual(
      tops.week,
      Math.ceil(header + FORMER_HEADER_CLEARANCE_PX),
      "must not recreate the 12px title-to-week slit",
    );
  });

  it("keeps the unpainted header gap at or below zero for typical heights", function () {
    for (const header of [
      64,
      MEASURED_HEADER_WITH_SUBTITLE_PX,
      MEASURED_HEADER_WITH_PARAGRAPH_MARGIN_PX,
      107,
      120,
    ]) {
      const gap = scheduleStickyHeaderGap(header);
      assert.isAtMost(gap, 0, `positive gap under ${header}px header`);
      assert.isAbove(gap, -1, `more than a subpixel overlap under ${header}px`);
    }
  });

  it("floors a fractional header so week never sits below it", function () {
    const header = MEASURED_HEADER_WITH_SUBTITLE_PX;
    const tops = measureScheduleStickyTops({
      header,
      week: 37.1,
      date: 33.2,
    });
    assert.equal(tops.week, 81);
    assert.isAtMost(tops.week, header);
    assert.notEqual(tops.week, Math.ceil(header));
  });

  it("sits flush under an integer header height", function () {
    const tops = measureScheduleStickyTops({
      header: 94,
      week: 37,
      date: 33,
    });
    assert.equal(tops.week, 94);
    assert.equal(scheduleStickyHeaderGap(94, tops.week), 0);
    assert.equal(tops.date, 94 + 37);
    assert.equal(tops.class, 94 + 37 + 33);
  });

  it("uses fallback band heights when week or date is missing", function () {
    const tops = measureScheduleStickyTops({ header: 80 });
    assert.equal(tops.week, 80);
    assert.equal(tops.date, 80 + SCHEDULE_WEEK_BAND_PX);
    assert.equal(
      tops.class,
      80 + SCHEDULE_WEEK_BAND_PX + SCHEDULE_DATE_BAND_PX,
    );
  });

  it("treats a zero band height as missing", function () {
    const tops = measureScheduleStickyTops({
      header: 80,
      week: 0,
      date: 0,
    });
    assert.equal(tops.date, 80 + SCHEDULE_WEEK_BAND_PX);
    assert.equal(
      tops.class,
      80 + SCHEDULE_WEEK_BAND_PX + SCHEDULE_DATE_BAND_PX,
    );
  });
});
