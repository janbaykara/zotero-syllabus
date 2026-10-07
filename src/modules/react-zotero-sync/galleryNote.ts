/**
 * Gallery-note change generation for layout recompute (Magazine roles, etc.).
 */

import { useAtomValue } from "jotai";
import { subscribeGalleryNoteChanges } from "../galleryNote";
import { atomFromExternal } from "./jotaiExternal";

let galleryNoteGeneration = 0;

export const galleryNoteGenerationAtom = atomFromExternal({
  getSnapshot: () => galleryNoteGeneration,
  subscribe: (onStoreChange) =>
    subscribeGalleryNoteChanges(() => {
      galleryNoteGeneration += 1;
      onStoreChange();
    }),
});

export function useGalleryNoteGeneration(): number {
  return useAtomValue(galleryNoteGenerationAtom) ?? 0;
}
