/**
 * Chrome Draggable / Droppable / Sortable on @dnd-kit/abstract.
 *
 * Mirrors @dnd-kit/dom entity behaviour without document.head, popover,
 * or PositionObserver — shape is refreshed from getBoundingClientRect while
 * a drag is active.
 *
 * ChromeSortable matches @dnd-kit/dom Sortable: paired entities, index/group,
 * captureRect/animate for optimistic reorders.
 */

import {
  Draggable,
  Droppable,
  Sensor,
  descriptor,
  type Data,
  type DraggableInput,
  type DroppableInput,
  type UniqueIdentifier,
} from "@dnd-kit/abstract";
import { defaultCollisionDetection } from "@dnd-kit/collision";
import { rectangleFromElement } from "./shape";

export type ChromeDraggableInput<T extends Data = Data> = DraggableInput<T> & {
  element?: Element;
  handle?: Element;
};

export class ChromeDraggable<T extends Data = Data> extends Draggable<T> {
  element: Element | undefined;
  handle: Element | undefined;
  /** Back-reference when this draggable belongs to a ChromeSortable. */
  sortable?: ChromeSortable<T>;

  constructor(
    {
      element,
      handle,
      effects: inputEffects = () => [],
      ...input
    }: ChromeDraggableInput<T>,
    manager: ConstructorParameters<typeof Draggable>[1],
  ) {
    super(
      {
        ...input,
        data: {
          ...(input.data as T | undefined),
          element,
          handle,
        } as unknown as T,
        effects: () => [
          ...inputEffects(),
          () => {
            const { manager: mgr } = this;
            if (!mgr) {
              return;
            }

            const sensors = this.sensors?.map(descriptor) ?? [...mgr.sensors];
            const unbinds = sensors.map((entry) => {
              if (entry instanceof Sensor) {
                return entry.bind(this);
              }
              const desc = descriptor(entry);
              const sensorInstance = mgr.registry.register(
                desc.plugin as any,
                desc.options,
              );
              return sensorInstance.bind(this, desc.options as never);
            });

            return () => {
              for (const unbind of unbinds) {
                unbind();
              }
            };
          },
        ],
      },
      manager,
    );

    this.element = element;
    this.handle = handle;
  }

  setElement(element: Element | undefined): void {
    if (this.element === element) {
      return;
    }
    // @dnd-kit/react useSortable: don't drop a connected element mid-drag.
    if (
      !element &&
      this.element?.isConnected &&
      this.manager &&
      !this.manager.dragOperation.status.idle
    ) {
      return;
    }
    this.element = element;
    this.data = {
      ...(this.data as object),
      element,
      handle: this.handle,
    } as unknown as T;
  }

  setHandle(handle: Element | undefined): void {
    if (this.handle === handle) {
      return;
    }
    if (
      !handle &&
      this.handle?.isConnected &&
      this.manager &&
      !this.manager.dragOperation.status.idle
    ) {
      return;
    }
    this.handle = handle;
    this.data = {
      ...(this.data as object),
      element: this.element,
      handle,
    } as unknown as T;
  }
}

export type ChromeDroppableInput<T extends Data = Data> = Omit<
  DroppableInput<T>,
  "collisionDetector"
> & {
  element?: Element;
  collisionDetector?: DroppableInput<T>["collisionDetector"];
};

export class ChromeDroppable<T extends Data = Data> extends Droppable<T> {
  element: Element | undefined;
  /** Back-reference when this droppable belongs to a ChromeSortable. */
  sortable?: ChromeSortable<T>;

  constructor(
    {
      element,
      collisionDetector = defaultCollisionDetection,
      effects: inputEffects = () => [],
      ...input
    }: ChromeDroppableInput<T>,
    manager: ConstructorParameters<typeof Droppable>[1],
  ) {
    super(
      {
        ...input,
        collisionDetector,
        data: {
          ...(input.data as T | undefined),
          element,
        } as unknown as T,
        effects: () => [
          ...inputEffects(),
          () => {
            const { manager: mgr } = this;
            if (!mgr) {
              return;
            }
            const { status, source } = mgr.dragOperation;
            void status.current;

            const el = this.element;
            if (!status.initialized || !el || this.disabled) {
              if (this.shape !== undefined) {
                this.shape = undefined;
              }
              return;
            }
            // Move feedback translates the source element; getBoundingClientRect
            // then follows the pointer. @dnd-kit/dom clears the source droppable
            // shape in that case — without it the dragged tile steals collisions
            // from zone targets (e.g. "rest") under the pointer.
            if (source && source.id === this.id) {
              if (this.shape !== undefined) {
                this.shape = undefined;
              }
              return;
            }
            void mgr.dragOperation.position.current;
            this.shape = rectangleFromElement(el);
          },
        ],
      },
      manager,
    );

    this.element = element;
  }

  setElement(element: Element | undefined): void {
    if (this.element === element) {
      return;
    }
    if (
      !element &&
      this.element?.isConnected &&
      this.manager &&
      !this.manager.dragOperation.status.idle
    ) {
      return;
    }
    this.element = element;
    this.data = {
      ...(this.data as object),
      element,
    } as unknown as T;
  }
}

export type SortableTransition = {
  duration?: number;
  easing?: string;
  idle?: boolean;
};

export const defaultSortableTransition: SortableTransition = {
  duration: 200,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  idle: false,
};

export type ChromeSortableInput<T extends Data = Data> =
  ChromeDraggableInput<T> &
    ChromeDroppableInput<T> & {
      index: number;
      group?: UniqueIdentifier;
      accept?: DroppableInput<T>["accept"];
      transition?: SortableTransition | null;
    };

type CapturedRect = { left: number; top: number };

/**
 * Paired draggable + droppable with the same id. Exposes `index` / `group`
 * on the drag source so `@dnd-kit/helpers` `move()` can project reorders.
 */
export class ChromeSortable<T extends Data = Data> {
  readonly draggable: ChromeDraggable<T> & {
    index: number;
    initialIndex: number;
    group: UniqueIdentifier | undefined;
    initialGroup: UniqueIdentifier | undefined;
    sortable: ChromeSortable<T>;
  };
  readonly droppable: ChromeDroppable<T> & { sortable: ChromeSortable<T> };
  index: number;
  group: UniqueIdentifier | undefined;
  transition: SortableTransition | null;
  #initialIndex: number;
  #initialGroup: UniqueIdentifier | undefined;
  #capturedRect: CapturedRect | null = null;

  constructor(
    input: ChromeSortableInput<T>,
    manager: ConstructorParameters<typeof Draggable>[1],
  ) {
    const {
      index,
      group,
      accept,
      type,
      element,
      handle,
      disabled,
      id,
      data,
      sensors,
      collisionDetector,
      collisionPriority,
      transition = defaultSortableTransition,
      effects: _effects,
      ...rest
    } = input;

    this.index = index;
    this.group = group;
    this.#initialIndex = index;
    this.#initialGroup = group;
    this.transition = transition;

    const dataWithGroup = {
      ...(data as object | undefined),
      group,
    } as T;

    // eslint-disable-next-line @typescript-eslint/no-this-alias -- defineProperty getters
    const self = this;

    this.droppable = new ChromeDroppable(
      {
        id,
        data: dataWithGroup,
        disabled,
        element,
        type,
        accept: accept ?? type,
        collisionDetector,
        collisionPriority: collisionPriority ?? 10,
      },
      manager,
    ) as ChromeSortable<T>["droppable"];
    this.droppable.sortable = this;

    const draggable = new ChromeDraggable(
      {
        ...rest,
        id,
        data: dataWithGroup,
        disabled,
        element,
        handle: handle ?? element,
        type,
        sensors,
        effects: () => [
          () => {
            const status = self.manager?.dragOperation.status;
            if (
              status?.initializing &&
              self.id === self.manager?.dragOperation.source?.id
            ) {
              self.#initialIndex = self.index;
              self.#initialGroup = self.group;
            }
          },
        ],
      },
      manager,
    ) as ChromeSortable<T>["draggable"];

    Object.defineProperties(draggable, {
      index: {
        get: () => self.index,
        enumerable: true,
      },
      initialIndex: {
        get: () => self.#initialIndex,
        enumerable: true,
      },
      group: {
        get: () => self.group,
        enumerable: true,
      },
      initialGroup: {
        get: () => self.#initialGroup,
        enumerable: true,
      },
    });

    draggable.sortable = this;
    this.draggable = draggable;
  }

  get id(): UniqueIdentifier {
    return this.draggable.id;
  }

  get element(): Element | undefined {
    return this.draggable.element ?? this.droppable.element;
  }

  get manager() {
    return this.draggable.manager;
  }

  get isDragSource(): boolean {
    return this.draggable.isDragSource;
  }

  get isDragging(): boolean {
    return this.draggable.isDragging;
  }

  get isDropTarget(): boolean {
    return this.droppable.isDropTarget;
  }

  get initialIndex(): number {
    return this.#initialIndex;
  }

  get initialGroup(): UniqueIdentifier | undefined {
    return this.#initialGroup;
  }

  /** Snapshot layout box before an optimistic DOM reorder (ignores FLIP transform). */
  captureRect(): void {
    const el = this.element as HTMLElement | undefined;
    if (!el || typeof el.getBoundingClientRect !== "function") {
      this.#capturedRect = null;
      return;
    }
    const savedTransform = el.style.transform;
    const savedTransition = el.style.transition;
    el.style.transition = "none";
    el.style.transform = "none";
    const rect = el.getBoundingClientRect();
    el.style.transform = savedTransform;
    el.style.transition = savedTransition;
    this.#capturedRect = { left: rect.left, top: rect.top };
  }

  /** Drop a pending capture without touching live styles. */
  discardCapture(): void {
    this.#capturedRect = null;
  }

  /** Clear any in-flight FLIP styles (call on dragend). */
  clearAnimation(): void {
    this.#capturedRect = null;
    const el = this.element as HTMLElement | undefined;
    if (!el) {
      return;
    }
    el.style.transition = "";
    el.style.transform = "";
  }

  /**
   * FLIP from captureRect() to the current layout. Skips the drag source
   * (feedback owns its transform).
   */
  animate(): void {
    const el = this.element as HTMLElement | undefined;
    const prev = this.#capturedRect;
    this.#capturedRect = null;
    const transition = this.transition;
    if (!el || !prev || !transition || this.isDragSource) {
      return;
    }
    const { idle } = this.manager?.dragOperation.status ?? { idle: true };
    if (idle && !transition.idle) {
      return;
    }
    // Measure without any leftover translate from a previous FLIP.
    const saved = el.style.transform;
    el.style.transition = "none";
    el.style.transform = "none";
    const next = el.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (!dx && !dy) {
      el.style.transform = saved && !saved.includes("translate") ? saved : "";
      return;
    }
    const duration = transition.duration ?? 250;
    const easing = transition.easing ?? "cubic-bezier(0.25, 1, 0.5, 1)";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    void el.offsetHeight;
    el.style.transition = `transform ${duration}ms ${easing}`;
    el.style.transform = "";
    const clear = () => {
      el.style.transition = "";
      el.style.transform = "";
    };
    el.addEventListener("transitionend", clear, { once: true });
    window.setTimeout(clear, duration + 50);
  }

  setElement(element: Element | undefined): void {
    this.draggable.setElement(element);
    this.droppable.setElement(element);
    if (!this.draggable.handle) {
      this.draggable.setHandle(element);
    }
  }

  setHandle(handle: Element | undefined): void {
    this.draggable.setHandle(handle);
  }

  destroy(): void {
    this.draggable.destroy();
    this.droppable.destroy();
  }
}

/** True when a drag entity is part of a ChromeSortable (dnd-kit isSortable). */
export function isChromeSortable(
  entity: unknown,
): entity is { sortable: ChromeSortable; id: UniqueIdentifier } {
  return Boolean(
    entity &&
    typeof entity === "object" &&
    "sortable" in entity &&
    (entity as { sortable: unknown }).sortable instanceof ChromeSortable,
  );
}
