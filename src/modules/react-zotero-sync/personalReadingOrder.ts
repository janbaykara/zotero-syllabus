import { useAtomValue } from "jotai";
import {
  getPersonalReadingOrderDescription,
  getPersonalReadingOrderGeneration,
  getPersonalReadingOrderKeys,
  hasPersonalReadingOrder,
  subscribePersonalReadingOrderChanges,
} from "../personalReadingOrder";
import { atomFromExternal } from "./jotaiExternal";
import { getCachedCollectionById } from "../../utils/cache";

const personalReadingOrderGenerationAtom = atomFromExternal({
  getSnapshot: () => getPersonalReadingOrderGeneration(),
  subscribe: subscribePersonalReadingOrderChanges,
  initial: 0,
});

export function usePersonalReadingOrderGeneration(): number {
  return useAtomValue(personalReadingOrderGenerationAtom) ?? 0;
}

/** Reactive ordered keys for a collection (empty when unset). */
export function usePersonalReadingOrderKeys(
  collectionId: number | null | undefined,
): string[] {
  const generation = usePersonalReadingOrderGeneration();
  if (!collectionId) {
    return [];
  }
  // generation is a dependency for re-render; read is from cache.
  void generation;
  const collection =
    getCachedCollectionById(collectionId) ||
    Zotero.Collections.get(collectionId) ||
    null;
  if (!collection) {
    return [];
  }
  return getPersonalReadingOrderKeys(collection);
}

export function useHasPersonalReadingOrder(
  collectionId: number | null | undefined,
): boolean {
  const keys = usePersonalReadingOrderKeys(collectionId);
  return keys.length > 0;
}

/** Reactive gallery / reading-list description for a collection. */
export function usePersonalReadingOrderDescription(
  collectionId: number | null | undefined,
): string {
  const generation = usePersonalReadingOrderGeneration();
  if (!collectionId) {
    return "";
  }
  void generation;
  return getPersonalReadingOrderDescription(collectionId);
}

export {
  hasPersonalReadingOrder,
  getPersonalReadingOrderKeys,
  getPersonalReadingOrderDescription,
};
