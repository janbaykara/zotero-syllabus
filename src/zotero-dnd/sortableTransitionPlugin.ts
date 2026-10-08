/**
 * FLIP sibling tiles when controlled `move()` updates list order.
 *
 * Opt-in via `createZoteroDndManager({ sortableTransition: true })` or
 * `DndProvider sortableTransition` — gallery uses blue-line indicators
 * instead. With React/Preact as source of truth we only animate: capture
 * layout before the dragover handler's setState commits, then animate
 * after paint.
 */

import { CorePlugin } from "@dnd-kit/abstract";
import { ChromeDroppable, type ChromeSortable } from "./entities";

function allSortables(
  manager: ConstructorParameters<typeof CorePlugin>[0],
): ChromeSortable[] {
  const out: ChromeSortable[] = [];
  for (const droppable of manager.registry.droppables) {
    if (droppable instanceof ChromeDroppable && droppable.sortable) {
      out.push(droppable.sortable);
    }
  }
  return out;
}

function orderSignature(
  manager: ConstructorParameters<typeof CorePlugin>[0],
): string {
  return allSortables(manager)
    .map((s) => `${String(s.id)}:${String(s.group ?? "")}:${s.index}`)
    .sort()
    .join("|");
}

export class SortableTransitionPlugin extends CorePlugin {
  constructor(manager: ConstructorParameters<typeof CorePlugin>[0]) {
    super(manager);

    let lastSig = "";
    let raf = 0;

    const stopOver = manager.monitor.addEventListener("dragover", () => {
      const sortables = allSortables(manager);
      if (sortables.length === 0) {
        return;
      }
      const before = orderSignature(manager);
      for (const sortable of sortables) {
        sortable.captureRect();
      }

      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }

      // After Preact commits the move() setState from the gallery handler.
      queueMicrotask(() => {
        raf = requestAnimationFrame(() => {
          raf = 0;
          const after = orderSignature(manager);
          if (before === after || after === lastSig) {
            for (const sortable of allSortables(manager)) {
              sortable.discardCapture();
            }
            return;
          }
          lastSig = after;
          for (const sortable of allSortables(manager)) {
            sortable.animate();
          }
        });
      });
    });

    const stopEnd = manager.monitor.addEventListener("dragend", () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      lastSig = "";
      for (const sortable of allSortables(manager)) {
        sortable.clearAnimation();
      }
    });

    const stopStart = manager.monitor.addEventListener("dragstart", () => {
      lastSig = orderSignature(manager);
    });

    const { destroy } = this;
    this.destroy = () => {
      stopOver();
      stopEnd();
      stopStart();
      if (raf) {
        cancelAnimationFrame(raf);
      }
      destroy.call(this);
    };
  }
}
