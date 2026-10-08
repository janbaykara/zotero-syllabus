/**
 * Chrome-safe pointer sensor for @dnd-kit/abstract.
 *
 * Inspired by @dnd-kit/dom PointerSensor + @dnd-kit/react useSortable:
 * - Activator may change when controlled `move()` remounts a tile; keep
 *   rebinding pointerdown for the life of bind(), not a 2s poll.
 * - bind() cleanup must NOT tear down an in-progress drag — remounts unbind
 *   the activator only; document listeners stay until pointerup.
 * - No setPointerCapture on the source node: remount / pointer-events:none
 *   releases capture and fires pointercancel, which looked like "drag ended
 *   at the group edge".
 * - Ignore pointercancel while dragging for the same remount reason; Escape
 *   and real pointerup still end the operation.
 */

import {
  ActivationConstraint,
  ActivationController,
  Draggable,
  Sensor,
  type SensorOptions,
} from "@dnd-kit/abstract";
import type { CleanupFunction } from "@dnd-kit/state";
import { activatorOf, clientPoint, eventDocument, isElement } from "./dom";

export type ChromePointerSensorOptions = SensorOptions & {
  preventActivation?: (event: PointerEvent, source: Draggable) => boolean;
  /** Pixels of movement before a drag starts (default 5). Clicks stay clicks. */
  activationDistance?: number;
};

/** Activate only after the pointer moves `value` px from the down point. */
class DistanceConstraint extends ActivationConstraint<
  PointerEvent,
  { value: number }
> {
  #origin: { x: number; y: number } | null = null;

  onEvent(event: PointerEvent): void {
    const point = clientPoint(event);
    if (!this.#origin) {
      this.#origin = point;
      return;
    }
    const dx = point.x - this.#origin.x;
    const dy = point.y - this.#origin.y;
    if (Math.hypot(dx, dy) >= this.options.value) {
      this.activate(event);
    }
  }

  abort(): void {
    this.#origin = null;
  }
}

const DEFAULT_PREVENT =
  "button, a[href], input, textarea, select, label, [contenteditable]:not([contenteditable='false'])";

function defaultPreventActivation(event: PointerEvent): boolean {
  const target = event.target;
  if (!isElement(target)) {
    return true;
  }
  return Boolean(target.closest(DEFAULT_PREVENT));
}

function isPrimaryPointerLike(event: Event): event is PointerEvent {
  const e = event as PointerEvent;
  if (typeof e.clientX !== "number" || typeof e.clientY !== "number") {
    return false;
  }
  if (typeof e.isPrimary === "boolean" && !e.isPrimary) {
    return false;
  }
  if (
    typeof e.button === "number" &&
    e.button !== 0 &&
    e.type !== "pointermove" &&
    e.type !== "mousemove"
  ) {
    if (e.type.endsWith("down") || e.type.endsWith("up")) {
      return e.button === 0;
    }
  }
  return true;
}

export class ChromePointerSensor extends Sensor<
  any,
  ChromePointerSensorOptions
> {
  #cleanups = new Set<() => void>();
  #controller: ActivationController<PointerEvent> | null = null;
  #initial: { x: number; y: number } | null = null;
  #latest: { event?: Event; coordinates?: { x: number; y: number } } = {};
  /** Source currently driving an active drag (document-level listeners). */
  #activeSource: Draggable | null = null;

  bind(
    source: Draggable,
    options: ChromePointerSensorOptions = this.options ?? {},
  ): CleanupFunction {
    const onDown = (event: Event) => {
      if (!isPrimaryPointerLike(event)) {
        return;
      }
      this.#onPointerDown(event as PointerEvent, source, options);
    };

    const attach = () => {
      const target = activatorOf(source);
      if (!target || typeof target.addEventListener !== "function") {
        return () => {};
      }
      target.addEventListener("pointerdown", onDown);
      target.addEventListener("mousedown", onDown);
      return () => {
        target.removeEventListener("pointerdown", onDown);
        target.removeEventListener("mousedown", onDown);
      };
    };

    let bound: Element | undefined;
    let detach = attach();
    bound = activatorOf(source);
    // Keep activator in sync for the life of this bind (cross-list remounts).
    const poll = setInterval(() => {
      const next = activatorOf(source);
      if (next !== bound) {
        detach();
        detach = attach();
        bound = next;
      }
    }, 50);

    return () => {
      clearInterval(poll);
      detach();
      // Remount / effect rebind: only drop activator listeners. Never stop the
      // active drag or strip document listeners — that cancels at the group
      // edge when move() remounts the tile.
    };
  }

  #onPointerDown(
    event: PointerEvent,
    source: Draggable,
    options: ChromePointerSensorOptions,
  ): void {
    if (
      this.disabled ||
      source.disabled ||
      !this.manager.dragOperation.status.idle
    ) {
      return;
    }
    if (typeof event.button === "number" && event.button !== 0) {
      return;
    }

    const prevent = options.preventActivation ?? defaultPreventActivation;
    if (prevent(event, source)) {
      return;
    }

    const point = clientPoint(event);
    this.#initial = point;

    const distance = options.activationDistance ?? 5;
    const controller = new ActivationController(
      [new DistanceConstraint({ value: distance })],
      (activateEvent) => this.#start(source, activateEvent as PointerEvent),
    );
    this.#controller = controller;
    // DistanceConstraint.abort only — do not cancel a drag that never started.
    controller.signal.onabort = () => {
      this.#cleanup();
    };
    controller.onEvent(event);

    const doc = eventDocument(event);
    const view = doc.defaultView;

    const onMove = (e: Event) => this.#onPointerMove(e, source);
    const onUp = (e: Event) => this.#onPointerUp(e);
    // pointercancel is expected when the source node remounts under another
    // list (lost capture / disconnected target). Do not end the drag.
    const onCancel = (_e: Event) => {
      /* ignore — see file header */
    };

    for (const target of [doc, view].filter(Boolean) as EventTarget[]) {
      target.addEventListener("pointermove", onMove, true);
      target.addEventListener("mousemove", onMove, true);
      target.addEventListener("pointerup", onUp, true);
      target.addEventListener("mouseup", onUp, true);
      target.addEventListener("pointercancel", onCancel, true);
      target.addEventListener("keydown", this.#onKeyDown, true);
      this.#cleanups.add(() => {
        target.removeEventListener("pointermove", onMove, true);
        target.removeEventListener("mousemove", onMove, true);
        target.removeEventListener("pointerup", onUp, true);
        target.removeEventListener("mouseup", onUp, true);
        target.removeEventListener("pointercancel", onCancel, true);
        target.removeEventListener("keydown", this.#onKeyDown, true);
      });
    }
  }

  #start(source: Draggable, event: PointerEvent): void {
    if (!this.#initial || !this.manager.dragOperation.status.idle) {
      return;
    }

    const controller = this.manager.actions.start({
      coordinates: this.#initial,
      event,
      source,
    });
    if (controller.signal.aborted) {
      this.#cleanup();
      return;
    }

    this.#activeSource = source;
    // Intentionally no setPointerCapture — document listeners are enough, and
    // capture on a remounted tile fires pointercancel at the group boundary.

    Promise.resolve().then(() => this.#flushMove());
  }

  #onPointerMove(event: Event, _source: Draggable): void {
    if (this.#controller && this.#controller.activated === false) {
      this.#controller.onEvent(event as PointerEvent);
      return;
    }
    const { status } = this.manager.dragOperation;
    if (status.idle) {
      return;
    }

    if (typeof (event as PointerEvent).preventDefault === "function") {
      event.preventDefault();
    }
    if (typeof (event as PointerEvent).stopPropagation === "function") {
      event.stopPropagation();
    }

    this.#latest = { event, coordinates: clientPoint(event as PointerEvent) };

    if (status.dragging) {
      this.#flushMove();
    }
  }

  #flushMove(): void {
    const { status } = this.manager.dragOperation;
    if (!status.dragging) {
      return;
    }
    const { event: ev, coordinates } = this.#latest;
    if (!ev || !coordinates) {
      return;
    }
    this.manager.actions.move({ event: ev, to: coordinates });
  }

  #onPointerUp(event: Event): void {
    // Click / press without enough movement — never started a drag.
    if (this.#controller && !this.#controller.activated) {
      this.#controller.abort(event as PointerEvent);
      this.#cleanup();
      return;
    }
    const { status } = this.manager.dragOperation;
    if (!status.idle) {
      if (typeof (event as PointerEvent).preventDefault === "function") {
        event.preventDefault();
      }
      if (typeof (event as PointerEvent).stopPropagation === "function") {
        event.stopPropagation();
      }
      const canceled = !status.initialized;
      this.manager.actions.stop({ event, canceled });
    }
    this.#cleanup();
  }

  #onKeyDown = (event: Event): void => {
    if ((event as KeyboardEvent).key === "Escape") {
      event.preventDefault();
      this.#cancel(event);
    }
  };

  #cancel(event: Event): void {
    if (!this.manager.dragOperation.status.idle) {
      this.manager.actions.stop({ event, canceled: true });
    }
    this.#cleanup();
  }

  #cleanup(): void {
    for (const fn of [...this.#cleanups]) {
      try {
        fn();
      } catch {
        // Ignore.
      }
    }
    this.#cleanups.clear();
    this.#controller = null;
    this.#initial = null;
    this.#latest = {};
    this.#activeSource = null;
  }
}
