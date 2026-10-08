/**
 * Visual drag feedback for Zotero chrome.
 *
 * Applies translate via inline transform on the source element — no
 * document.head style injection, no popover API.
 *
 * Offset comes from `dragOperation.transform` (modifiers already applied),
 * matching @dnd-kit Feedback. On `dragmove`, position updates only in a
 * microtask after dispatch, so we apply the same modifiers to a provisional
 * delta from `event.to` for frame-accurate follow.
 */

import { CorePlugin, type Draggable } from "@dnd-kit/abstract";
import { Rectangle } from "@dnd-kit/geometry";
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

/** Run active modifiers on a provisional delta (same pipeline as transform). */
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

export class ChromeFeedbackPlugin extends CorePlugin {
  constructor(manager: ConstructorParameters<typeof CorePlugin>[0]) {
    super(manager);

    let origin: { x: number; y: number } | null = null;
    let baseRect: DOMRect | null = null;
    let activeEl: Element | null = null;

    const paint = (transform: { x: number; y: number }) => {
      const el = activeEl;
      if (!el || !baseRect) {
        return;
      }
      const { x, y } = transform;
      (el as HTMLElement).style.transform = `translate3d(${x}px, ${y}px, 0)`;
      manager.dragOperation.shape = new Rectangle(
        baseRect.left + x,
        baseRect.top + y,
        baseRect.width,
        baseRect.height,
      );
    };

    const begin = (source: Draggable, coords: { x: number; y: number }) => {
      const el = elementOf(source);
      if (!el) {
        return;
      }
      origin = { ...coords };
      baseRect = rectOf(el);
      activeEl = el;
      el.setAttribute(ATTR, "true");
      const style = (el as HTMLElement).style;
      style.zIndex = "9999";
      style.pointerEvents = "none";
      style.willChange = "transform";
      style.opacity = "0.85";
      paint(applyModifiers(manager, { x: 0, y: 0 }));
    };

    const end = () => {
      if (activeEl) {
        clearFeedback(activeEl);
        activeEl = null;
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

    // Immediate visual follow — don't wait for the position microtask.
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
  style.zIndex = "";
  style.pointerEvents = "";
  style.willChange = "";
  style.opacity = "";
}
