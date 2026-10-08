/**
 * zotero-dnd — @dnd-kit/abstract layer for Zotero chrome / Preact.
 *
 * Avoids @dnd-kit/dom assumptions (document.head style injection, popover
 * Feedback, Accessibility live regions, instanceof Document).
 *
 * Usage guide (plugins, blue-line vs FLIP, hooks): ./README.md
 */

export { createZoteroDndManager } from "./createManager";
export type { CreateZoteroDndManagerOptions } from "./createManager";
export { ChromePointerSensor } from "./pointerSensor";
export type { ChromePointerSensorOptions } from "./pointerSensor";
export { ChromeFeedbackPlugin } from "./feedbackPlugin";
/** Multi-select: extra elements that follow the pointer with the drag source. */
export {
  setCoDragElements,
  clearCoDragElements,
  getCoDragElements,
} from "./coDrag";
/** Kept for optional uncontrolled lists; gallery uses controlled reorder. */
export { OptimisticSortingPlugin } from "./optimisticSortingPlugin";
/**
 * Opt-in FLIP after live `move()` on dragover:
 * `createZoteroDndManager({ sortableTransition: true })`.
 */
export { SortableTransitionPlugin } from "./sortableTransitionPlugin";
/**
 * Opt-in blue-line indicators:
 * `createZoteroDndManager({ dropIndicator: true | options })`.
 */
export { DropIndicatorPlugin, getDropIndicator } from "./dropIndicatorPlugin";
export {
  applyDropIndicatorMove,
  applyMultiDropIndicatorMove,
  moveToContainerEnd,
  moveMultipleToContainerEnd,
  resolveDragIds,
  idsInContainerOrder,
  dropEdgeForPointer,
  DROP_INDICATOR_BEFORE_CLASS,
  DROP_INDICATOR_AFTER_CLASS,
} from "./dropIndicator";
export type {
  DropEdge,
  DropIndicatorAxis,
  DropIndicatorOptions,
  DropIndicatorState,
} from "./dropIndicator";
/** Re-export axis modifiers for DragDropProvider-style usage. */
export {
  RestrictToVerticalAxis,
  RestrictToHorizontalAxis,
  SnapModifier,
  AxisModifier,
} from "@dnd-kit/abstract/modifiers";
/** Re-export helpers used by Sortable guides. */
export { move, arrayMove, swap, arraySwap } from "@dnd-kit/helpers";
export {
  ChromeDraggable,
  ChromeDroppable,
  ChromeSortable,
  isChromeSortable,
  defaultSortableTransition,
} from "./entities";
export type {
  ChromeDraggableInput,
  ChromeDroppableInput,
  ChromeSortableInput,
  SortableTransition,
} from "./entities";
export { DndProvider } from "./DndProvider";
export type { DndProviderProps } from "./DndProvider";
export { useSortable } from "./useSortable";
export type { UseSortableInput, UseSortableReturn } from "./useSortable";
export { useDroppable } from "./useDroppable";
export type { UseDroppableInput, UseDroppableReturn } from "./useDroppable";
export { useDndManager } from "./useManager";
export { ZoteroDndContext } from "./context";
export type { ZoteroDndManager } from "./context";
export { rectangleFromElement } from "./shape";
