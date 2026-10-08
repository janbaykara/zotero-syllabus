/**
 * Safety net: if document-level pointer listeners are lost mid-drag
 * (e.g. sensor rebind race), force-stop so status returns to idle.
 * Without this, no subsequent drag can start.
 */

import { CorePlugin } from "@dnd-kit/abstract";

export class ChromeDragAbortPlugin extends CorePlugin {
  constructor(manager: ConstructorParameters<typeof CorePlugin>[0]) {
    super(manager);

    const forceStop = (event?: Event) => {
      if (manager.dragOperation.status.idle) {
        return;
      }
      manager.actions.stop({ event, canceled: true });
    };

    const onWindowUp = (event: Event) => {
      // Let the sensor's capture-phase handler run first; only force-stop
      // if status is still non-idle after a microtask (listeners were lost).
      void Promise.resolve().then(() => {
        if (!manager.dragOperation.status.idle) {
          forceStop(event);
        }
      });
    };

    const onBlur = () => forceStop();
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.hidden) {
        forceStop();
      }
    };

    const win =
      typeof globalThis !== "undefined"
        ? (globalThis as unknown as Window)
        : null;
    if (win && typeof win.addEventListener === "function") {
      win.addEventListener("pointerup", onWindowUp, false);
      win.addEventListener("mouseup", onWindowUp, false);
      win.addEventListener("blur", onBlur, false);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility, false);
    }

    const { destroy } = this;
    this.destroy = () => {
      if (win && typeof win.removeEventListener === "function") {
        win.removeEventListener("pointerup", onWindowUp, false);
        win.removeEventListener("mouseup", onWindowUp, false);
        win.removeEventListener("blur", onBlur, false);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility, false);
      }
      destroy.call(this);
    };
  }
}
