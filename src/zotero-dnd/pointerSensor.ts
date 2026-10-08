/**
 * Chrome-safe pointer sensor for @dnd-kit/abstract.
 *
 * Differences from @dnd-kit/dom PointerSensor:
 * - No `instanceof HTMLElement` / `Document`
 * - Captures pointer on the activator element (not `document.body`)
 * - Listens on the activator's ownerDocument (+ window fallback)
 * - Immediate activation (no distance/delay constraints)
 * - Also listens to mouse events (XUL sometimes starves pointermove)
 */

import {
  ActivationController,
  Draggable,
  Sensor,
  type SensorOptions,
} from "@dnd-kit/abstract";
import type { CleanupFunction } from "@dnd-kit/state";
import { activatorOf, clientPoint, eventDocument, isElement } from "./dom";

export type ChromePointerSensorOptions = SensorOptions & {
  /**
   * Return true to skip starting a drag (e.g. interactive controls).
   * Default skips buttons, links, inputs, etc.
   */
  preventActivation?: (event: PointerEvent, source: Draggable) => boolean;
};

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
  // MouseEvent: button 0. PointerEvent: isPrimary + button 0.
  if (typeof e.isPrimary === "boolean" && !e.isPrimary) {
    return false;
  }
  if (typeof e.button === "number" && e.button !== 0 && e.type !== "pointermove" && e.type !== "mousemove") {
    // move events often report button === -1 or 0; only gate down/up.
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
  #pointerId: number | null = null;

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

    // Re-bind when element/handle show up (Preact often attaches late).
    let bound: Element | undefined;
    let detach = attach();
    bound = activatorOf(source);
    const poll = setInterval(() => {
      const next = activatorOf(source);
      if (next && next !== bound) {
        detach();
        detach = attach();
        bound = next;
        clearInterval(poll);
      }
    }, 50);
    const stopPoll = setTimeout(() => clearInterval(poll), 2000);

    return () => {
      clearInterval(poll);
      clearTimeout(stopPoll);
      detach();
      this.#cleanup();
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
    this.#pointerId =
      typeof event.pointerId === "number" ? event.pointerId : null;

    const controller = new ActivationController(undefined, (activateEvent) =>
      this.#start(source, activateEvent as PointerEvent),
    );
    this.#controller = controller;
    controller.signal.onabort = () => this.#cancel(event);
    controller.onEvent(event);

    const doc = eventDocument(event);
    const view = doc.defaultView;

    const onMove = (e: Event) => this.#onPointerMove(e, source);
    const onUp = (e: Event) => this.#onPointerUp(e);
    const onCancel = (e: Event) => this.#cancel(e);

    // Capture on document + window: XUL/chrome can drop one or the other.
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

    // Do not preventDefault on the activating down-event — that can starve
    // subsequent pointermove delivery in chrome. Prevent on move instead.

    const captureEl = activatorOf(source);
    if (
      captureEl &&
      this.#pointerId != null &&
      typeof captureEl.setPointerCapture === "function"
    ) {
      try {
        captureEl.setPointerCapture(this.#pointerId);
        this.#cleanups.add(() => {
          try {
            if (
              typeof captureEl.hasPointerCapture === "function" &&
              captureEl.hasPointerCapture(this.#pointerId!)
            ) {
              captureEl.releasePointerCapture(this.#pointerId!);
            }
          } catch {
            // Ignore.
          }
        });
      } catch {
        // Capture optional in chrome; continue without it.
      }
    }

    // Flush any moves that arrived while status was still initializing.
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
    this.#pointerId = null;
  }
}
