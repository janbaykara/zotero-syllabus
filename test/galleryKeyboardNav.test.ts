import { assert } from "chai";
import {
  clusterGalleryRows,
  findGalleryNavIndex,
  parseGalleryNavKey,
  type NavRect,
} from "../src/modules/galleryKeyboardNav";

function grid(cols: number, count: number, size = 100, gap = 10): NavRect[] {
  return Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      left: col * (size + gap),
      top: row * (size + gap),
      width: size,
      height: size,
    };
  });
}

describe("galleryKeyboardNav", function () {
  it("parses arrow and paging keys", function () {
    assert.equal(parseGalleryNavKey("ArrowLeft"), "left");
    assert.equal(parseGalleryNavKey("Down"), "down");
    assert.equal(parseGalleryNavKey("Home"), "home");
    assert.equal(parseGalleryNavKey("PageDown"), "pagedown");
    assert.equal(parseGalleryNavKey("Enter"), null);
  });

  it("clusters a regular grid into rows and columns", function () {
    const cells = clusterGalleryRows(grid(3, 8));
    const byIndex = new Map(cells.map((cell) => [cell.index, cell]));
    assert.equal(byIndex.get(0)?.row, 0);
    assert.equal(byIndex.get(0)?.col, 0);
    assert.equal(byIndex.get(2)?.row, 0);
    assert.equal(byIndex.get(2)?.col, 2);
    assert.equal(byIndex.get(3)?.row, 1);
    assert.equal(byIndex.get(3)?.col, 0);
    assert.equal(byIndex.get(7)?.row, 2);
    assert.equal(byIndex.get(7)?.col, 1);
  });

  it("moves within a 3-column grid like a file icon view", function () {
    const rects = grid(3, 8);
    assert.equal(findGalleryNavIndex(rects, 0, "right"), 1);
    assert.equal(findGalleryNavIndex(rects, 2, "right"), 3);
    assert.equal(findGalleryNavIndex(rects, 3, "left"), 2);
    assert.equal(findGalleryNavIndex(rects, 0, "left"), 0);
    assert.equal(findGalleryNavIndex(rects, 1, "down"), 4);
    assert.equal(findGalleryNavIndex(rects, 4, "up"), 1);
    assert.equal(findGalleryNavIndex(rects, 7, "down"), 7);
    assert.equal(findGalleryNavIndex(rects, 2, "down"), 5);
  });

  it("keeps the closest column when the next row is shorter", function () {
    const rects = grid(3, 5);
    assert.equal(findGalleryNavIndex(rects, 2, "down"), 4);
    assert.equal(findGalleryNavIndex(rects, 1, "down"), 4);
    assert.equal(findGalleryNavIndex(rects, 0, "down"), 3);
  });

  it("treats a single-column list as vertical navigation", function () {
    const rects = grid(1, 4);
    assert.equal(findGalleryNavIndex(rects, 0, "down"), 1);
    assert.equal(findGalleryNavIndex(rects, 2, "up"), 1);
    assert.equal(findGalleryNavIndex(rects, 0, "right"), 1);
    assert.equal(findGalleryNavIndex(rects, 0, "left"), 0);
  });

  it("jumps to first and last items and pages by rows", function () {
    const rects = grid(3, 9);
    assert.equal(findGalleryNavIndex(rects, 4, "home"), 0);
    assert.equal(findGalleryNavIndex(rects, 4, "end"), 8);
    assert.equal(findGalleryNavIndex(rects, 1, "pagedown", { pageRows: 2 }), 7);
    assert.equal(findGalleryNavIndex(rects, 7, "pageup", { pageRows: 2 }), 1);
    assert.equal(findGalleryNavIndex(rects, 1, "down", { pageRows: 2 }), 4);
  });

  it("navigates across grouped grids with a vertical gap", function () {
    const first = grid(3, 3);
    const second = grid(3, 3).map((rect) => ({
      ...rect,
      top: rect.top + 400,
    }));
    const rects = [...first, ...second];
    assert.equal(findGalleryNavIndex(rects, 1, "down"), 4);
    assert.equal(findGalleryNavIndex(rects, 2, "right"), 3);
    assert.equal(findGalleryNavIndex(rects, 3, "up"), 0);
  });

  it("selects an edge item when nothing is current", function () {
    const rects = grid(3, 6);
    assert.equal(findGalleryNavIndex(rects, -1, "right"), 0);
    assert.equal(findGalleryNavIndex(rects, -1, "left"), 5);
    assert.equal(findGalleryNavIndex(rects, -1, "home"), 0);
  });
});
