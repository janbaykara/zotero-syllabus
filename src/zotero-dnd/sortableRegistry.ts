/**
 * Sortable instances keyed by (manager, id).
 *
 * Controlled multi-list `move()` remounts a tile under another parent. If we
 * destroy() the ChromeSortable on unmount, the active drag source dies and the
 * interaction freezes. Keep the instance alive across remounts; only destroy
 * when unused and not mid-drag.
 */

import type { UniqueIdentifier } from "@dnd-kit/abstract";
import { ChromeSortable, type ChromeSortableInput } from "./entities";
import type { ZoteroDndManager } from "./context";

type Entry = {
  sortable: ChromeSortable;
  refCount: number;
};

const registries = new WeakMap<ZoteroDndManager, Map<string, Entry>>();

function keyOf(id: UniqueIdentifier): string {
  return String(id);
}

function mapFor(manager: ZoteroDndManager): Map<string, Entry> {
  let map = registries.get(manager);
  if (!map) {
    map = new Map();
    registries.set(manager, map);
  }
  return map;
}

export function acquireSortable(
  manager: ZoteroDndManager,
  input: ChromeSortableInput,
): ChromeSortable {
  const map = mapFor(manager);
  const key = keyOf(input.id);
  const existing = map.get(key);
  if (existing) {
    existing.refCount += 1;
    return existing.sortable;
  }
  const sortable = new ChromeSortable(input, manager);
  map.set(key, { sortable, refCount: 1 });
  return sortable;
}

export function releaseSortable(
  manager: ZoteroDndManager,
  sortable: ChromeSortable,
): void {
  const map = mapFor(manager);
  const key = keyOf(sortable.id);
  const entry = map.get(key);
  if (!entry || entry.sortable !== sortable) {
    return;
  }
  entry.refCount -= 1;
  if (entry.refCount > 0) {
    return;
  }

  const destroyNow = () => {
    const current = map.get(key);
    if (!current || current.sortable !== sortable || current.refCount > 0) {
      return;
    }
    map.delete(key);
    sortable.destroy();
  };

  // Never destroy mid-drag — controlled move() remounts the source under
  // another parent; destroying it freezes dragOperation.status.
  if (!manager.dragOperation.status.idle) {
    const stop = manager.monitor.addEventListener("dragend", () => {
      stop();
      // Remount may have acquired again before dragend.
      queueMicrotask(destroyNow);
    });
    return;
  }

  destroyNow();
}
