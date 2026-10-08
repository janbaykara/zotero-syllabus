/**
 * zotero-dnd — @dnd-kit/abstract layer for Zotero chrome / Preact.
 *
 * Avoids @dnd-kit/dom assumptions (document.head style injection, popover
 * Feedback, Accessibility live regions, instanceof Document).
 */

export { createZoteroDndManager } from "./createManager";
export type { CreateZoteroDndManagerOptions } from "./createManager";
export { ChromePointerSensor } from "./pointerSensor";
export type { ChromePointerSensorOptions } from "./pointerSensor";
export { ChromeFeedbackPlugin } from "./feedbackPlugin";
/** Re-export axis modifiers for DragDropProvider-style usage. */
export {
  RestrictToVerticalAxis,
  RestrictToHorizontalAxis,
  SnapModifier,
  AxisModifier,
} from "@dnd-kit/abstract/modifiers";
export { ChromeDraggable, ChromeDroppable, ChromeSortable } from "./entities";
export type {
  ChromeDraggableInput,
  ChromeDroppableInput,
  ChromeSortableInput,
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
