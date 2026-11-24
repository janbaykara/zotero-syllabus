import { atom, getDefaultStore, useAtomValue } from "jotai";

/** Parent item id for Annotation Feed single-book isolation (`null` = whole library). */
export const myAnnotationsParentItemIdAtom = atom<number | null>(null);

export function getMyAnnotationsParentItemId(): number | null {
  return getDefaultStore().get(myAnnotationsParentItemIdAtom);
}

export function setMyAnnotationsParentItemId(itemId: number | null): void {
  getDefaultStore().set(myAnnotationsParentItemIdAtom, itemId);
}

export function useMyAnnotationsParentItemId(): number | null {
  return useAtomValue(myAnnotationsParentItemIdAtom);
}
