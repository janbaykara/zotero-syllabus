/**
 * Paints blue-line drop indicators on sortable hosts during drag.
 *
 * Does not reorder — pair with deferred `applyDropIndicatorMove` /
 * `moveToContainerEnd` on dragend (see PersonalOrderGallery).
 *
 * Enable via `createZoteroDndManager({ dropIndicator: true | options })` or
 * `DndProvider dropIndicator={...}`.
 */

import { CorePlugin, type UniqueIdentifier } from "@dnd-kit/abstract";
import { isChromeSortable, type ChromeSortable } from "./entities";
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

function elementOfSortable(sortable: ChromeSortable): Element | undefined {
  return (
    sortable.element ??
    (sortable.droppable as { element?: Element }).element ??
    (sortable.droppable.data as { element?: Element } | undefined)?.element
  );
}

/**
 * Next sortable in the same group by index (for collapsing “after N” →
 * “before N+1” so a gap never shows two blue lines).
 */
function nextSortableInGroup(
  manager: ZoteroDndManager,
  target: { id: UniqueIdentifier; sortable: ChromeSortable },
): ChromeSortable | null {
  const group = target.sortable.group;
  const index = target.sortable.index;
  let best: ChromeSortable | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const droppable of manager.registry.droppables) {
    if (!isChromeSortable(droppable)) {
      continue;
    }
    if (droppable.id === target.id) {
      continue;
    }
    const { sortable } = droppable;
    if (sortable.group !== group) {
      continue;
    }
    if (sortable.index > index && sortable.index < bestIndex) {
      bestIndex = sortable.index;
      best = sortable;
    }
  }
  return best;
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
      // Gecko NodeList iterates as Node | null; cast to Element[].
      const roots = Array.from(
        document.querySelectorAll(
          ".syllabus-personal-order-dnd, .syllabus-page-dnd",
        ),
      ) as Element[];
      for (const root of roots) {
        const nodes = Array.from(
          root.querySelectorAll(`.${this.#beforeClass}, .${this.#afterClass}`),
        ) as Element[];
        for (const node of nodes) {
          node.classList.remove(this.#beforeClass, this.#afterClass);
        }
      }
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
      // Remounts mid-drag can orphan the previous #painted node with its
      // classes still set — clear every indicator in the nearest DnD root.
      const root =
        el.closest(".syllabus-personal-order-dnd, .syllabus-page-dnd") ??
        el.parentElement;
      if (root) {
        const nodes = Array.from(
          root.querySelectorAll(`.${this.#beforeClass}, .${this.#afterClass}`),
        ) as Element[];
        for (const node of nodes) {
          if (node !== el) {
            node.classList.remove(this.#beforeClass, this.#afterClass);
          }
        }
      } else if (this.#painted && this.#painted !== el) {
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
      const el = elementOfSortable(sortable);
      if (!el) {
        clearPaint();
        this.indicator = null;
        return;
      }
      const axis = resolveAxis(options.axis, el);
      const rect = rectOf(el);
      let edge = dropEdgeForPointer(position.current, rect, axis);
      let paintEl = el;
      let targetId = target.id;
      // “After this” and “before next” are the same gap. Always paint on the
      // later host as `before` so CSS half-gap math can’t draw two lines.
      if (edge === "after") {
        const next = nextSortableInGroup(manager, {
          id: target.id,
          sortable,
        });
        const nextEl = next ? elementOfSortable(next) : undefined;
        if (next && nextEl) {
          edge = "before";
          paintEl = nextEl;
          targetId = next.id;
        }
      }
      this.indicator = { targetId, edge };
      paint(paintEl, edge);
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
