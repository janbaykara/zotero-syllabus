/**
 * Visual drag feedback for Zotero chrome.
 *
 * Applies translate on the source element (and any co-dragged elements from
 * `setCoDragElements`). Translate is recomputed each frame as
 * `desiredScreenPos - currentLayoutPos` so remounts / optimistic DOM moves
 * do not race ahead of the cursor.
 */

import { CorePlugin, type Draggable } from "@dnd-kit/abstract";
import { Rectangle } from "@dnd-kit/geometry";
import { clearCoDragElements, getCoDragElements } from "./coDrag";
import { rectOf } from "./dom";

const ATTR = "data-zotero-dnd-dragging";

function elementOf(source: Draggable | null | undefined): Element | undefined {
  if (!source) {
    return undefined;
  }
  const s = source as Draggable & { element?: Element };
  return (
    s.element || (source.data as { element?: Element } | undefined)?.element
  );
}

/** Layout box ignoring the feedback transform (same synchronous turn). */
function layoutRectOf(el: HTMLElement): DOMRect {
  const saved = el.style.transform;
  el.style.transform = "none";
  const rect = rectOf(el);
  el.style.transform = saved;
  return rect;
}

function applyModifiers(
  manager: ConstructorParameters<typeof CorePlugin>[0],
  transform: { x: number; y: number },
): { x: number; y: number } {
  let next = transform;
  for (const modifier of manager.dragOperation.modifiers) {
    next = modifier.apply({
      ...manager.dragOperation.snapshot(),
      transform: next,
    });
  }
  return next;
}

function styleAsDragging(el: HTMLElement, zIndex: string): void {
  el.setAttribute(ATTR, "true");
  const style = el.style;
  style.zIndex = zIndex;
  style.pointerEvents = "none";
  style.willChange = "transform";
  style.opacity = "0.85";
  style.transition = "";
}

function paintElement(
  el: HTMLElement,
  base: DOMRect,
  transform: { x: number; y: number },
  zIndex: string,
): { left: number; top: number } {
  const desiredLeft = base.left + transform.x;
  const desiredTop = base.top + transform.y;
  const layout = layoutRectOf(el);
  const tx = desiredLeft - layout.left;
  const ty = desiredTop - layout.top;
  styleAsDragging(el, zIndex);
  el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  return { left: desiredLeft, top: desiredTop };
}

export class ChromeFeedbackPlugin extends CorePlugin {
  constructor(manager: ConstructorParameters<typeof CorePlugin>[0]) {
    super(manager);

    let origin: { x: number; y: number } | null = null;
    let baseRect: DOMRect | null = null;
    let activeEl: HTMLElement | null = null;

    const resolveEl = (source?: Draggable | null): HTMLElement | null => {
      const el = elementOf(source ?? manager.dragOperation.source) as
        HTMLElement | undefined;
      return el?.isConnected ? el : null;
    };

    const adoptEl = (el: HTMLElement) => {
      if (activeEl && activeEl !== el) {
        clearFeedback(activeEl);
      }
      activeEl = el;
      styleAsDragging(el, "9999");
    };

    const paintCoDragged = (transform: { x: number; y: number }) => {
      const cos = getCoDragElements(manager);
      let z = 9998;
      for (const { el, base } of cos) {
        if (!el.isConnected || el === activeEl) {
          continue;
        }
        paintElement(el, base, transform, String(z));
        z -= 1;
      }
    };

    const paint = (transform: { x: number; y: number }) => {
      // Re-resolve after controlled move() remounts the tile in another list.
      const next = resolveEl();
      if (next && next !== activeEl) {
        adoptEl(next);
      }
      const el = activeEl;
      if (!el || !baseRect) {
        paintCoDragged(transform);
        return;
      }
      const desired = paintElement(el, baseRect, transform, "9999");
      manager.dragOperation.shape = new Rectangle(
        desired.left,
        desired.top,
        baseRect.width,
        baseRect.height,
      );
      paintCoDragged(transform);
    };

    const begin = (source: Draggable, coords: { x: number; y: number }) => {
      const el = resolveEl(source);
      if (!el) {
        return;
      }
      origin = { ...coords };
      baseRect = rectOf(el);
      adoptEl(el);
      paint(applyModifiers(manager, { x: 0, y: 0 }));
    };

    const end = () => {
      if (activeEl) {
        clearFeedback(activeEl);
        activeEl = null;
      }
      for (const { el } of getCoDragElements(manager)) {
        clearFeedback(el);
      }
      clearCoDragElements(manager);
      const live = resolveEl();
      if (live) {
        clearFeedback(live);
      }
      origin = null;
      baseRect = null;
    };

    this.registerEffect(() => {
      const { dragOperation } = manager;
      const { status, source, position } = dragOperation;

      if (status.idle || !source) {
        end();
        return;
      }

      void position.current;
      const transform = dragOperation.transform;

      if (!status.dragging) {
        return;
      }

      if (!origin) {
        begin(source, position.current);
        return;
      }

      paint(transform);
    });

    const stopMove = manager.monitor.addEventListener("dragmove", (event) => {
      const source = manager.dragOperation.source;
      if (!source || !manager.dragOperation.status.dragging) {
        return;
      }
      const to =
        event.to ??
        (event.nativeEvent &&
        typeof (event.nativeEvent as PointerEvent).clientX === "number"
          ? {
              x: (event.nativeEvent as PointerEvent).clientX,
              y: (event.nativeEvent as PointerEvent).clientY,
            }
          : null);
      if (!to || typeof to.x !== "number") {
        return;
      }
      if (!origin) {
        begin(source, to);
        return;
      }
      paint(
        applyModifiers(manager, {
          x: to.x - origin.x,
          y: to.y - origin.y,
        }),
      );
    });

    const stopEnd = manager.monitor.addEventListener("dragend", () => {
      end();
      for (const root of [
        document.querySelector(".syllabus-personal-order-dnd"),
        document.querySelector(".syllabus-page-dnd"),
      ]) {
        const nodes = root?.querySelectorAll<HTMLElement>(
          ".syllabus-personal-order-tile, .syllabus-dnd-sortable, [data-zotero-dnd-dragging]",
        );
        nodes?.forEach((el) => {
          clearFeedback(el);
        });
      }
    });

    const { destroy } = this;
    this.destroy = () => {
      stopMove();
      stopEnd();
      end();
      destroy.call(this);
    };
  }
}

function clearFeedback(el: Element): void {
  el.removeAttribute(ATTR);
  const style = (el as HTMLElement).style;
  style.transform = "";
  style.transition = "";
  style.zIndex = "";
  style.pointerEvents = "";
  style.willChange = "";
  style.opacity = "";
}
