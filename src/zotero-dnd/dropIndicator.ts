/**
 * Blue-line drop indicators — types, edge math, deferred reorder helpers.
 *
 * Pair with `DropIndicatorPlugin` (paints classes) and consumer CSS for
 * `is-drop-before` / `is-drop-after` (gallery, syllabus, explorer, …).
 */

import type { UniqueIdentifier } from "@dnd-kit/abstract";

export type DropEdge = "before" | "after";

export type DropIndicatorAxis = "vertical" | "horizontal";

export type DropIndicatorState = {
  targetId: UniqueIdentifier;
  edge: DropEdge;
} | null;

/** Default class names — match existing syllabus / gallery / explorer CSS. */
export const DROP_INDICATOR_BEFORE_CLASS = "is-drop-before";
export const DROP_INDICATOR_AFTER_CLASS = "is-drop-after";

export type DropIndicatorOptions = {
  /** Line orientation. Default vertical (top/bottom). */
  axis?:
    | DropIndicatorAxis
    | ((element: Element) => DropIndicatorAxis | null | undefined);
  beforeClass?: string;
  afterClass?: string;
  /**
   * Return false to skip painting (e.g. block rest→rest). Default: indicate
   * whenever the target is a sortable other than the drag source.
   */
  canIndicate?: (args: { source: unknown; target: unknown }) => boolean;
};

export function dropEdgeForPointer(
  pointer: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  axis: DropIndicatorAxis,
): DropEdge {
  if (axis === "horizontal") {
    return pointer.x < rect.left + rect.width / 2 ? "before" : "after";
  }
  return pointer.y < rect.top + rect.height / 2 ? "before" : "after";
}

function findInContainers(
  containers: Record<string, string[]>,
  id: UniqueIdentifier,
): { group: string; index: number } | null {
  const key = String(id);
  for (const [group, ids] of Object.entries(containers)) {
    const index = ids.indexOf(key);
    if (index >= 0) {
      return { group, index };
    }
  }
  return null;
}

/**
 * Deferred reorder for multi-list maps (`{ ordered: string[], rest: string[] }`).
 * Use on dragend with the plugin's indicator — not live on dragover.
 */
export function applyDropIndicatorMove<T extends Record<string, string[]>>(
  containers: T,
  sourceId: UniqueIdentifier,
  targetId: UniqueIdentifier,
  edge: DropEdge,
): T {
  const sourceLoc = findInContainers(containers, sourceId);
  const targetLoc = findInContainers(containers, targetId);
  if (!sourceLoc || !targetLoc) {
    return containers;
  }
  if (
    sourceLoc.group === targetLoc.group &&
    sourceLoc.index === targetLoc.index
  ) {
    return containers;
  }

  const sourceList = containers[sourceLoc.group].slice();
  const [item] = sourceList.splice(sourceLoc.index, 1);
  if (item == null) {
    return containers;
  }

  if (sourceLoc.group === targetLoc.group) {
    let to: number;
    if (sourceLoc.index < targetLoc.index) {
      // Target shifted left after removal.
      to = edge === "after" ? targetLoc.index : targetLoc.index - 1;
    } else {
      to = edge === "after" ? targetLoc.index + 1 : targetLoc.index;
    }
    to = Math.max(0, Math.min(to, sourceList.length));
    sourceList.splice(to, 0, item);
    return { ...containers, [sourceLoc.group]: sourceList };
  }

  const targetList = containers[targetLoc.group].slice();
  const to = edge === "after" ? targetLoc.index + 1 : targetLoc.index;
  targetList.splice(Math.max(0, Math.min(to, targetList.length)), 0, item);
  return {
    ...containers,
    [sourceLoc.group]: sourceList,
    [targetLoc.group]: targetList,
  };
}

/** Append/prepend into a container list key (e.g. empty "ordered" zone). */
export function moveToContainerEnd<T extends Record<string, string[]>>(
  containers: T,
  sourceId: UniqueIdentifier,
  containerId: string,
  edge: DropEdge = "after",
): T {
  return moveMultipleToContainerEnd(containers, [sourceId], containerId, edge);
}

/**
 * Ids from `candidates` that appear in `containers`, in container iteration
 * order (stable relative order for multi-drag).
 */
export function idsInContainerOrder(
  containers: Record<string, string[]>,
  candidates: Iterable<UniqueIdentifier>,
): string[] {
  const want = new Set([...candidates].map(String));
  const out: string[] = [];
  for (const list of Object.values(containers)) {
    for (const id of list) {
      if (want.has(id)) {
        out.push(id);
      }
    }
  }
  return out;
}

/**
 * Keys to move for a drag: the full selection (in list order) when the active
 * item is selected with others; otherwise just the active item.
 */
export function resolveDragIds(
  containers: Record<string, string[]>,
  sourceId: UniqueIdentifier,
  selectedIds?: Iterable<UniqueIdentifier> | null,
): string[] {
  const source = String(sourceId);
  const selected = [...(selectedIds ?? [])].map(String);
  if (selected.length > 1 && selected.includes(source)) {
    const ordered = idsInContainerOrder(containers, selected);
    return ordered.length > 0 ? ordered : [source];
  }
  return [source];
}

/**
 * Move several ids as one block to `targetId` + edge. `movingIds` should
 * already be in the order to preserve (see `idsInContainerOrder`).
 */
export function applyMultiDropIndicatorMove<T extends Record<string, string[]>>(
  containers: T,
  movingIds: UniqueIdentifier[],
  targetId: UniqueIdentifier,
  edge: DropEdge,
): T {
  const moving = movingIds.map(String);
  if (moving.length === 0) {
    return containers;
  }
  if (moving.length === 1) {
    return applyDropIndicatorMove(containers, moving[0], targetId, edge);
  }

  const targetKey = String(targetId);
  if (moving.includes(targetKey)) {
    return containers;
  }
  const targetLoc = findInContainers(containers, targetKey);
  if (!targetLoc) {
    return containers;
  }

  const next: Record<string, string[]> = {};
  for (const [group, list] of Object.entries(containers)) {
    next[group] = list.filter((id) => !moving.includes(id));
  }

  const targetList = next[targetLoc.group];
  const targetIndex = targetList.indexOf(targetKey);
  if (targetIndex < 0) {
    return containers;
  }
  let to = edge === "after" ? targetIndex + 1 : targetIndex;
  to = Math.max(0, Math.min(to, targetList.length));
  targetList.splice(to, 0, ...moving);
  return next as T;
}

/** Append/prepend several ids into a container list as one block. */
export function moveMultipleToContainerEnd<T extends Record<string, string[]>>(
  containers: T,
  movingIds: UniqueIdentifier[],
  containerId: string,
  edge: DropEdge = "after",
): T {
  const moving = movingIds.map(String);
  if (!(containerId in containers) || moving.length === 0) {
    return containers;
  }

  const next: Record<string, string[]> = {};
  for (const [group, list] of Object.entries(containers)) {
    next[group] = list.filter((id) => !moving.includes(id));
  }
  const targetList = next[containerId];
  if (edge === "before") {
    targetList.unshift(...moving);
  } else {
    targetList.push(...moving);
  }
  return next as T;
}
