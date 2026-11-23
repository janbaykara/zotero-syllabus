/**
 * Gallery “separate done items”: pull ticked-done items out of the main list
 * without dropping them from a stored reading order.
 */

export function itemsWithoutDone<T extends { key: string }>(
  items: readonly T[],
  doneKeys: ReadonlySet<string>,
): T[] {
  if (doneKeys.size === 0) {
    return items as T[];
  }
  return items.filter((item) => !doneKeys.has(item.key));
}

export function itemsThatAreDone<T extends { key: string }>(
  items: readonly T[],
  doneKeys: ReadonlySet<string>,
): T[] {
  if (doneKeys.size === 0) {
    return [];
  }
  return items.filter((item) => doneKeys.has(item.key));
}

/**
 * Done items for the Gallery section. `doneKeysOldestFirst` is the note's
 * insertion order; the result is most recently done first.
 */
export function itemsMostRecentlyDone<T extends { key: string }>(
  items: readonly T[],
  doneKeysOldestFirst: readonly string[],
): T[] {
  if (doneKeysOldestFirst.length === 0 || items.length === 0) {
    return [];
  }
  const byKey = new Map(items.map((item) => [item.key, item]));
  const ordered: T[] = [];
  for (let index = doneKeysOldestFirst.length - 1; index >= 0; index -= 1) {
    const item = byKey.get(doneKeysOldestFirst[index]);
    if (item) {
      ordered.push(item);
    }
  }
  return ordered;
}

export function groupsWithoutDone<T extends { items: { key: string }[] }>(
  groups: readonly T[],
  doneKeys: ReadonlySet<string>,
): T[] {
  if (doneKeys.size === 0) {
    return groups as T[];
  }
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !doneKeys.has(item.key)),
    }))
    .filter((group) => group.items.length > 0);
}

type ItemIdNode = {
  itemIds: number[];
  children: ItemIdNode[];
};

/** Drop done item ids from a subcollection tree. Empty branches are removed. */
export function omitDoneItemIds<T extends ItemIdNode>(
  node: T | null,
  doneIds: ReadonlySet<number>,
): T | null {
  if (!node || doneIds.size === 0) {
    return node;
  }
  const children = node.children
    .map((child) => omitDoneItemIds(child as T, doneIds))
    .filter((child): child is T => child != null);
  const itemIds = node.itemIds.filter((id) => !doneIds.has(id));
  if (itemIds.length === 0 && children.length === 0) {
    return null;
  }
  return { ...node, itemIds, children };
}

/**
 * Replace the not-done subsequence of `previousOrder` with `nextActiveOrder`,
 * leaving done keys where they were so unticking restores their place.
 */
export function mergeReadingOrderPreservingDone(
  previousOrder: readonly string[],
  nextActiveOrder: readonly string[],
  doneKeys: ReadonlySet<string>,
): string[] {
  if (doneKeys.size === 0) {
    return [...nextActiveOrder];
  }
  const queue = [...nextActiveOrder];
  const result: string[] = [];
  const emitted = new Set<string>();
  for (const key of previousOrder) {
    if (doneKeys.has(key)) {
      if (!emitted.has(key)) {
        result.push(key);
        emitted.add(key);
      }
      continue;
    }
    const next = queue.shift();
    if (next != null && !emitted.has(next)) {
      result.push(next);
      emitted.add(next);
    }
  }
  for (const key of queue) {
    if (!emitted.has(key)) {
      result.push(key);
      emitted.add(key);
    }
  }
  return result;
}
