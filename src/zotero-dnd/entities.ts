/**
 * Chrome Draggable / Droppable / Sortable on @dnd-kit/abstract.
 *
 * Mirrors @dnd-kit/dom entity behaviour without document.head, popover,
 * or PositionObserver — shape is refreshed from getBoundingClientRect while
 * a drag is active.
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
            // Track pointer while dragging. Do not gate on accepts() here —
            // CollisionObserver already skips non-accepting droppables.
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
    this.element = element;
    this.data = {
      ...(this.data as object),
      element,
    } as unknown as T;
  }
}

export type ChromeSortableInput<T extends Data = Data> =
  ChromeDraggableInput<T> &
    ChromeDroppableInput<T> & {
      index: number;
      group?: UniqueIdentifier;
      accept?: DroppableInput<T>["accept"];
    };

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
  };
  readonly droppable: ChromeDroppable<T>;
  index: number;
  group: UniqueIdentifier | undefined;
  #initialIndex: number;
  #initialGroup: UniqueIdentifier | undefined;

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
      effects: _effects,
      ...rest
    } = input;

    this.index = index;
    this.group = group;
    this.#initialIndex = index;
    this.#initialGroup = group;

    const dataWithGroup = {
      ...(data as object | undefined),
      group,
    } as T;

    this.droppable = new ChromeDroppable(
      {
        id,
        data: dataWithGroup,
        disabled,
        element,
        type,
        accept: accept ?? type,
        collisionDetector,
        // Prefer tiles over large zone droppables for insertion targeting.
        collisionPriority: collisionPriority ?? 10,
      },
      manager,
    );

    // Closures need the sortable instance for index/group getters on the source.
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- defineProperty getters
    const self = this;
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

    this.draggable = draggable;
  }

  get id(): UniqueIdentifier {
    return this.draggable.id;
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
