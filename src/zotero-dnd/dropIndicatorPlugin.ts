/**
 * Paints blue-line drop indicators on sortable hosts during drag.
 *
 * Does not reorder — pair with deferred `applyDropIndicatorMove` /
 * `moveToContainerEnd` on dragend (see PersonalOrderGallery).
 *
 * Enable via `createZoteroDndManager({ dropIndicator: true | options })` or
 * `DndProvider dropIndicator={...}`.
 */

import { CorePlugin } from "@dnd-kit/abstract";
import { isChromeSortable } from "./entities";
import { rectOf } from "./dom";
import type { ZoteroDndManager } from "./context";
import {
  DROP_INDICATOR_AFTER_CLASS,
  DROP_INDICATOR_BEFORE_CLASS,
  dropEdgeForPointer,
  type DropIndicatorAxis,
  type DropIndicatorOptions,
  type DropIndicatorState,
} from "./dropIndicator";

export type { DropIndicatorOptions, DropIndicatorState } from "./dropIndicator";

function resolveAxis(
  axis: DropIndicatorOptions["axis"],
  element: Element,
): DropIndicatorAxis {
  if (typeof axis === "function") {
    return axis(element) ?? "vertical";
  }
  return axis ?? "vertical";
}

export class DropIndicatorPlugin extends CorePlugin<
  ZoteroDndManager,
  DropIndicatorOptions
> {
  /** Latest indicator; read on dragend via `getDropIndicator(manager)`. */
  indicator: DropIndicatorState = null;

  #painted: Element | null = null;
  #beforeClass: string;
  #afterClass: string;

  constructor(
    manager: ConstructorParameters<typeof CorePlugin>[0],
    options: DropIndicatorOptions = {},
  ) {
    super(manager, options);
    this.#beforeClass = options.beforeClass ?? DROP_INDICATOR_BEFORE_CLASS;
    this.#afterClass = options.afterClass ?? DROP_INDICATOR_AFTER_CLASS;

    const clearPaint = () => {
      if (this.#painted) {
        this.#painted.classList.remove(this.#beforeClass, this.#afterClass);
        this.#painted = null;
      }
    };

    const reset = () => {
      clearPaint();
      this.indicator = null;
    };

    const paint = (el: Element, edge: "before" | "after") => {
      if (this.#painted && this.#painted !== el) {
        this.#painted.classList.remove(this.#beforeClass, this.#afterClass);
      }
      el.classList.toggle(this.#beforeClass, edge === "before");
      el.classList.toggle(this.#afterClass, edge === "after");
      this.#painted = el;
    };

    const sync = () => {
      const { source, target, position, status } = manager.dragOperation;
      if (!status.dragging || !source || !target) {
        clearPaint();
        this.indicator = null;
        return;
      }
      if (!isChromeSortable(target) || target.id === source.id) {
        clearPaint();
        this.indicator = null;
        return;
      }
      const can = options.canIndicate;
      if (can && !can({ source, target })) {
        clearPaint();
        this.indicator = null;
        return;
      }
      const sortable = target.sortable;
      const el =
        sortable.element ??
        (target as { element?: Element }).element ??
        (target as { data?: { element?: Element } }).data?.element;
      if (!el) {
        clearPaint();
        this.indicator = null;
        return;
      }
      const axis = resolveAxis(options.axis, el);
      const rect = rectOf(el);
      const edge = dropEdgeForPointer(position.current, rect, axis);
      this.indicator = { targetId: target.id, edge };
      paint(el, edge);
    };

    const stopOver = manager.monitor.addEventListener("dragover", sync);
    const stopMove = manager.monitor.addEventListener("dragmove", sync);
    // Keep `indicator` through dragend so consumers can read it; only scrub CSS.
    const stopEnd = manager.monitor.addEventListener("dragend", clearPaint);
    const stopStart = manager.monitor.addEventListener("dragstart", reset);

    const { destroy } = this;
    this.destroy = () => {
      stopOver();
      stopMove();
      stopEnd();
      stopStart();
      reset();
      destroy.call(this);
    };
  }
}

export function getDropIndicator(
  manager: ZoteroDndManager,
): DropIndicatorState {
  return manager.registry.plugins.get(DropIndicatorPlugin)?.indicator ?? null;
}
