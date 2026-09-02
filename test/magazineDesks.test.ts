import { assert } from "chai";
import {
  pickMagazineDesks,
  pickRecentMediaIds,
  remainderItemIds,
} from "../src/modules/magazineDesks";
import { blurbFromAttachmentText } from "../src/utils/itemBlurb";

describe("magazine desks and blurbs", function () {
  it("picks newest videos and audio up to the shelf limit", function () {
    const items = [
      { id: 1, dateAdded: "2026-01-01", isVideo: true, isAudio: false },
      { id: 2, dateAdded: "2026-06-01", isVideo: true, isAudio: false },
      { id: 3, dateAdded: "2026-03-01", isVideo: false, isAudio: true },
      { id: 4, dateAdded: "2026-08-01", isVideo: false, isAudio: true },
      { id: 5, dateAdded: "2026-09-01", isVideo: false, isAudio: false },
    ];
    assert.deepEqual(pickRecentMediaIds(items, "video", 1), [2]);
    assert.deepEqual(pickRecentMediaIds(items, "audio"), [4, 3]);
  });

  it("keeps earlier class desks ahead of tags when claiming items", function () {
    const desks = pickMagazineDesks([
      { id: "class-1", title: "Week 1", itemIds: [1, 2, 3] },
      { id: "tag-0", title: "Theory", itemIds: [1, 2, 3, 4, 5] },
    ]);
    assert.equal(desks[0].id, "class-1");
    assert.deepEqual(desks[0].itemIds, [1, 2, 3]);
    assert.equal(desks[1].id, "tag-0");
    assert.deepEqual(desks[1].itemIds, [4, 5]);
  });

  it("claims items for the largest desks and leaves a remainder", function () {
    const desks = pickMagazineDesks([
      { id: "theory", title: "Theory", itemIds: [1, 2, 3, 4, 9] },
      { id: "methods", title: "Methods", itemIds: [3, 4, 5, 6] },
      { id: "small", title: "Small", itemIds: [1] },
    ]);
    assert.equal(desks[0].id, "theory");
    assert.includeMembers(desks[0].itemIds, [1, 2, 3, 4, 9]);
    const methods = desks.find((desk) => desk.id === "methods");
    assert.deepEqual(methods?.itemIds, [5, 6]);
    assert.deepEqual(remainderItemIds([1, 2, 3, 4, 5, 6, 7], desks, [7]), []);
    assert.deepEqual(remainderItemIds([1, 2, 3, 4, 5, 6, 8], desks, []), [8]);
  });

  it("turns attachment HTML and PDF cache text into a standfirst", function () {
    const html =
      "<html><style>p{}</style><p>Abstract: A study of cities and the people who live in them under pressure.</p>";
    assert.include(blurbFromAttachmentText(html), "study of cities");
    const pdf =
      "Page 1\nThis chapter argues that housing is infrastructure. ".repeat(3);
    const blurb = blurbFromAttachmentText(pdf);
    assert.include(blurb, "housing is infrastructure");
    assert.isAbove(blurb.length, 40);
  });

  it("rejects tiny attachment extracts", function () {
    assert.equal(blurbFromAttachmentText("Fig. 1"), "");
  });
});
