/**
 * Chrome port of @dnd-kit/dom OptimisticSortingPlugin.
 *
 * On dragover between sortables: reorder DOM, update index/group, set drop
 * target to the source. Animates siblings via captureRect/animate. On canceled
 * dragend, restores initial DOM order and indices.
 *
 * Call event.preventDefault() in a dragover handler to skip an optimistic
 * move (e.g. block reordering within the "rest" group).
 *
 * @see https://dndkit.com/concepts/sortable/
 */

import { Plugin, type UniqueIdentifier } from "@dnd-kit/abstract";
import { arrayMove } from "@dnd-kit/helpers";
import { ChromeDroppable, ChromeSortable, isChromeSortable } from "./entities";

function getSortableInstances(
  manager: ConstructorParameters<typeof Plugin>[0],
): Map<UniqueIdentifier | undefined, Set<ChromeSortable>> {
  const map = new Map<UniqueIdentifier | undefined, Set<ChromeSortable>>();
  for (const droppable of manager.registry.droppables) {
    if (!(droppable instanceof ChromeDroppable) || !droppable.sortable) {
      continue;
    }
    const { sortable } = droppable;
    let set = map.get(sortable.group);
    if (!set) {
      set = new Set();
      map.set(sortable.group, set);
    }
    set.add(sortable);
  }
  return map;
}

function getSortableIndices(
  instances: Map<UniqueIdentifier | undefined, Set<ChromeSortable>>,
): Map<UniqueIdentifier, number> {
  const indices = new Map<UniqueIdentifier, number>();
  for (const [, group] of instances) {
    for (const sortable of group) {
      indices.set(sortable.id, sortable.index);
    }
  }
  return indices;
}

function hasChanged(
  snapshotIndices: Map<UniqueIdentifier, number>,
  instances: Map<UniqueIdentifier | undefined, Set<ChromeSortable>>,
  newInstances: Map<UniqueIdentifier | undefined, Set<ChromeSortable>>,
): boolean {
  for (const [group, sortables] of instances) {
    for (const sortable of sortables) {
      const index = snapshotIndices.get(sortable.id);
      if (
        sortable.index !== index ||
        sortable.group !== group ||
        !newInstances.get(group)?.has(sortable)
      ) {
        return true;
      }
    }
  }
  return false;
}

function sortByIndex(a: ChromeSortable, b: ChromeSortable): number {
  return a.index - b.index;
}

function sortByInitialIndex(a: ChromeSortable, b: ChromeSortable): number {
  return a.initialIndex - b.initialIndex;
}

function sort(
  instances: Set<ChromeSortable>,
  sortFn: (a: ChromeSortable, b: ChromeSortable) => number = sortByIndex,
): ChromeSortable[] {
  return Array.from(instances).sort(sortFn);
}

function reorder(
  sourceElement: Element,
  sourceIndex: number,
  targetElement: Element,
  targetIndex: number,
): void {
  const position = targetIndex < sourceIndex ? "afterend" : "beforebegin";
  targetElement.insertAdjacentElement(position, sourceElement);
}

function allSortables(
  instances: Map<UniqueIdentifier | undefined, Set<ChromeSortable>>,
): Set<ChromeSortable> {
  const all = new Set<ChromeSortable>();
  for (const set of instances.values()) {
    for (const s of set) {
      all.add(s);
    }
  }
  return all;
}

/** Build optimistic next order of sortable instances for one dragover. */
function projectSortables(
  sourceSortables: ChromeSortable[],
  targetSortables: ChromeSortable[],
  source: ChromeSortable,
  target: ChromeSortable,
  sameGroup: boolean,
  pointerY: number,
): { sourceGroup: ChromeSortable[]; targetGroup: ChromeSortable[] } | null {
  const sourceIndex = sourceSortables.findIndex((s) => s.id === source.id);
  const targetIndex = targetSortables.findIndex((s) => s.id === target.id);
  if (sourceIndex < 0 || targetIndex < 0) {
    return null;
  }

  if (sameGroup) {
    if (sourceIndex === targetIndex) {
      return null;
    }
    const shape = target.droppable.shape;
    let to = targetIndex;
    if (shape && pointerY > shape.center.y) {
      to = sourceIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      to = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }
    to = Math.max(0, Math.min(to, sourceSortables.length - 1));
    if (to === sourceIndex) {
      return null;
    }
    const moved = arrayMove(sourceSortables, sourceIndex, to);
    return { sourceGroup: moved, targetGroup: moved };
  }

  const nextSource = sourceSortables.filter((s) => s.id !== source.id);
  const nextTarget = [...targetSortables];
  const shape = target.droppable.shape;
  const modifier = shape && pointerY > shape.center.y ? 1 : 0;
  nextTarget.splice(targetIndex + modifier, 0, source);
  return { sourceGroup: nextSource, targetGroup: nextTarget };
}

function setSortableGroup(
  sortable: ChromeSortable,
  group: UniqueIdentifier | undefined,
): void {
  sortable.group = group;
  const nextData = {
    ...(sortable.draggable.data as object),
    group,
  };
  sortable.draggable.data = nextData;
  sortable.droppable.data = nextData;
}

function applyProjectedIndices(
  projected: { sourceGroup: ChromeSortable[]; targetGroup: ChromeSortable[] },
  sameGroup: boolean,
  targetGroup: UniqueIdentifier | undefined,
): void {
  if (sameGroup) {
    for (const [index, sortable] of projected.sourceGroup.entries()) {
      sortable.index = index;
    }
    return;
  }
  for (const [index, sortable] of projected.sourceGroup.entries()) {
    sortable.index = index;
  }
  for (const [index, sortable] of projected.targetGroup.entries()) {
    setSortableGroup(sortable, targetGroup);
    sortable.index = index;
  }
}

export class OptimisticSortingPlugin extends Plugin {
  constructor(manager: ConstructorParameters<typeof Plugin>[0]) {
    super(manager);

    const unsubscribe = [
      manager.monitor.addEventListener("dragover", (event, manager2) => {
        if (this.disabled) {
          return;
        }
        const { source, target } = manager2.dragOperation;
        if (!isChromeSortable(source) || !isChromeSortable(target)) {
          return;
        }
        if (source.sortable === target.sortable) {
          return;
        }

        const instances = getSortableInstances(manager2);
        const sortableIndices = getSortableIndices(instances);
        const sameGroup = source.sortable.group === target.sortable.group;
        const sourceInstances = instances.get(source.sortable.group);
        const targetInstances = sameGroup
          ? sourceInstances
          : instances.get(target.sortable.group);
        if (!sourceInstances || !targetInstances) {
          return;
        }

        queueMicrotask(() => {
          if (event.defaultPrevented) {
            return;
          }
          void manager2.renderer.rendering.then(() => {
            const newInstances = getSortableInstances(manager2);
            if (hasChanged(sortableIndices, instances, newInstances)) {
              return;
            }
            const sourceElement = source.sortable.element;
            const targetElement = target.sortable.element;
            if (!sourceElement || !targetElement) {
              return;
            }
            if (!sameGroup && target.id === source.sortable.group) {
              return;
            }

            const orderedSource = sort(sourceInstances);
            const orderedTarget = sameGroup
              ? orderedSource
              : sort(targetInstances);
            const pointerY = manager2.dragOperation.position.current.y;
            const projected = projectSortables(
              orderedSource,
              orderedTarget,
              source.sortable,
              target.sortable,
              sameGroup,
              pointerY,
            );
            if (!projected) {
              return;
            }

            const affected = new Set<ChromeSortable>([
              ...projected.sourceGroup,
              ...projected.targetGroup,
            ]);
            for (const sortable of affected) {
              sortable.captureRect();
            }

            const sourceIndex = projected.targetGroup.indexOf(source.sortable);
            const targetIndex = projected.targetGroup.indexOf(target.sortable);
            manager2.collisionObserver.disable();
            reorder(sourceElement, sourceIndex, targetElement, targetIndex);
            applyProjectedIndices(
              projected,
              sameGroup,
              target.sortable.group,
            );
            for (const sortable of affected) {
              sortable.animate();
            }

            void manager2.actions
              .setDropTarget(source.id)
              .then(() => manager2.collisionObserver.enable());
          });
        });
      }),

      manager.monitor.addEventListener("dragend", (event, manager2) => {
        // Always scrub FLIP leftovers so tiles can't freeze mid-translate.
        for (const set of getSortableInstances(manager2).values()) {
          for (const sortable of set) {
            sortable.clearAnimation();
          }
        }

        if (!event.canceled) {
          return;
        }
        const { source } = manager2.dragOperation;
        if (!isChromeSortable(source)) {
          return;
        }
        if (
          source.sortable.initialIndex === source.sortable.index &&
          source.sortable.initialGroup === source.sortable.group
        ) {
          return;
        }

        queueMicrotask(() => {
          const instances = getSortableInstances(manager2);
          const sortableIndices = getSortableIndices(instances);
          void manager2.renderer.rendering.then(() => {
            const newInstances = getSortableInstances(manager2);
            if (hasChanged(sortableIndices, instances, newInstances)) {
              return;
            }
            const all = allSortables(instances);
            for (const sortable of all) {
              sortable.captureRect();
            }

            const initialGroup =
              instances.get(source.sortable.initialGroup) ??
              new Set<ChromeSortable>();
            // Rebuild DOM order: place each node after the previous in initial order.
            const initialOrder = Array.from(all).sort(sortByInitialIndex);
            const parent = source.sortable.element?.parentElement;
            if (parent) {
              for (const sortable of initialOrder) {
                const el = sortable.element;
                if (el && el.parentElement === parent) {
                  parent.appendChild(el);
                }
              }
            } else if (initialGroup.size > 0) {
              const current = sort(initialGroup);
              const initial = sort(initialGroup, sortByInitialIndex);
              const sourceElement = source.sortable.element;
              const initialPosition = initial.indexOf(source.sortable);
              const anchor = current[initialPosition];
              if (sourceElement && anchor?.element) {
                reorder(
                  sourceElement,
                  source.sortable.index,
                  anchor.element,
                  anchor.index,
                );
              }
            }

            for (const sortable of all) {
              sortable.index = sortable.initialIndex;
              setSortableGroup(sortable, sortable.initialGroup);
            }
            for (const sortable of all) {
              sortable.animate();
            }
          });
        });
      }),
    ];

    const { destroy } = this;
    this.destroy = () => {
      for (const stop of unsubscribe) {
        stop();
      }
      destroy.call(this);
    };
  }
}
