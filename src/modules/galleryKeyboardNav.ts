export type NavDirection = "left" | "right" | "up" | "down";

export type GalleryNavKey =
  | NavDirection
  | "home"
  | "end"
  | "pageup"
  | "pagedown";

export type NavRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type GalleryNavCell = {
  index: number;
  row: number;
  col: number;
  rect: NavRect;
};

export const GALLERY_NAV_SELECTOR =
  ".syllabus-gallery-tile, .syllabus-gallery-cards .syllabus-item-card";

export function getGalleryNavElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll(GALLERY_NAV_SELECTOR),
    (el) => el as HTMLElement,
  );
}

export function getActiveGalleryIndex(
  els: HTMLElement[],
  selectedIds: number[] | null,
  activeEl: EventTarget | null,
  key: GalleryNavKey,
): number {
  if (activeEl && typeof (activeEl as HTMLElement).closest === "function") {
    const focused = (activeEl as HTMLElement).closest(
      GALLERY_NAV_SELECTOR,
    ) as HTMLElement | null;
    if (focused) {
      const idx = els.indexOf(focused);
      if (idx >= 0) {
        return idx;
      }
    }
  }
  if (!selectedIds?.length) {
    return -1;
  }
  const idSet = new Set(selectedIds);
  const matches: number[] = [];
  for (let i = 0; i < els.length; i++) {
    if (idSet.has(Number(els[i].dataset.itemId))) {
      matches.push(i);
    }
  }
  if (matches.length === 0) {
    return -1;
  }
  if (
    key === "down" ||
    key === "right" ||
    key === "end" ||
    key === "pagedown"
  ) {
    return matches[matches.length - 1];
  }
  return matches[0];
}

export function parseGalleryNavKey(key: string): GalleryNavKey | null {
  switch (key) {
    case "ArrowLeft":
    case "Left":
      return "left";
    case "ArrowRight":
    case "Right":
      return "right";
    case "ArrowUp":
    case "Up":
      return "up";
    case "ArrowDown":
    case "Down":
      return "down";
    case "Home":
      return "home";
    case "End":
      return "end";
    case "PageUp":
      return "pageup";
    case "PageDown":
      return "pagedown";
    default:
      return null;
  }
}

function rectBottom(rect: NavRect): number {
  return rect.top + rect.height;
}

function rectCenterX(rect: NavRect): number {
  return rect.left + rect.width / 2;
}

function verticalOverlap(aTop: number, aBottom: number, rect: NavRect): number {
  return Math.min(aBottom, rectBottom(rect)) - Math.max(aTop, rect.top);
}

/** Group items into visual rows, then columns left-to-right. */
export function clusterGalleryRows(rects: NavRect[]): GalleryNavCell[] {
  const order = rects
    .map((rect, index) => ({ rect, index }))
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);

  const cells: GalleryNavCell[] = [];
  let row = -1;
  let rowTop = 0;
  let rowBottom = 0;
  let col = 0;

  for (const { rect, index } of order) {
    const overlap = row >= 0 ? verticalOverlap(rowTop, rowBottom, rect) : -1;
    const minHeight =
      row >= 0
        ? Math.min(rowBottom - rowTop, rect.height) || rect.height
        : rect.height;
    if (row < 0 || overlap < minHeight * 0.4) {
      row += 1;
      col = 0;
      rowTop = rect.top;
      rowBottom = rectBottom(rect);
    } else {
      rowTop = Math.min(rowTop, rect.top);
      rowBottom = Math.max(rowBottom, rectBottom(rect));
    }
    cells.push({ index, row, col, rect });
    col += 1;
  }

  return cells;
}

function closestInRow(
  rowCells: GalleryNavCell[],
  targetX: number,
  preferredCol?: number,
): GalleryNavCell | null {
  if (rowCells.length === 0) {
    return null;
  }
  if (preferredCol != null) {
    const sameCol = rowCells.find((cell) => cell.col === preferredCol);
    if (sameCol) {
      return sameCol;
    }
  }
  let best = rowCells[0];
  let bestDist = Infinity;
  for (const cell of rowCells) {
    const dist = Math.abs(rectCenterX(cell.rect) - targetX);
    if (dist < bestDist) {
      bestDist = dist;
      best = cell;
    }
  }
  return best;
}

function moveVertical(
  cells: GalleryNavCell[],
  current: GalleryNavCell,
  deltaRows: number,
): number {
  if (deltaRows === 0) {
    return current.index;
  }
  const targetRow = current.row + deltaRows;
  const maxRow = cells.reduce((max, cell) => Math.max(max, cell.row), 0);
  if (targetRow < 0 || targetRow > maxRow) {
    return current.index;
  }
  const rowCells = cells.filter((cell) => cell.row === targetRow);
  const next = closestInRow(rowCells, rectCenterX(current.rect), current.col);
  return next?.index ?? current.index;
}

export function findGalleryNavIndex(
  rects: NavRect[],
  currentIndex: number,
  key: GalleryNavKey,
  options?: { pageRows?: number },
): number {
  if (rects.length === 0) {
    return -1;
  }
  if (currentIndex < 0 || currentIndex >= rects.length) {
    return key === "end" || key === "up" || key === "left" || key === "pageup"
      ? rects.length - 1
      : 0;
  }
  if (key === "home") {
    return 0;
  }
  if (key === "end") {
    return rects.length - 1;
  }

  const cells = clusterGalleryRows(rects);
  const current = cells.find((cell) => cell.index === currentIndex);
  if (!current) {
    return currentIndex;
  }

  if (key === "left" || key === "right") {
    const reading = [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
    const pos = reading.findIndex((cell) => cell.index === currentIndex);
    const next = key === "right" ? pos + 1 : pos - 1;
    if (next < 0 || next >= reading.length) {
      return currentIndex;
    }
    return reading[next].index;
  }

  const step =
    key === "pageup" || key === "pagedown"
      ? Math.max(1, options?.pageRows ?? 1)
      : 1;
  const delta = key === "up" || key === "pageup" ? -step : step;
  const maxRow = cells.reduce((max, cell) => Math.max(max, cell.row), 0);
  const unclamped = current.row + delta;
  const clampedDelta = Math.min(maxRow, Math.max(0, unclamped)) - current.row;
  return moveVertical(cells, current, clampedDelta);
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).closest !== "function") {
    const tag = ((target as HTMLElement | null)?.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }
  const el = target as HTMLElement;
  if (el.isContentEditable) {
    return true;
  }
  return Boolean(
    el.closest("input, textarea, select, [contenteditable='true']"),
  );
}

export function isGalleryKeyboardIgnoredTarget(
  target: EventTarget | null,
): boolean {
  if (!target || typeof (target as HTMLElement).closest !== "function") {
    return false;
  }
  return Boolean(
    (target as HTMLElement).closest(
      "#zotero-collections-tree, #zotero-collections-pane, .syllabus-gallery-popover",
    ),
  );
}
