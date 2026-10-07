import { useCallback, useEffect, useMemo, useRef } from "preact/hooks";
import { atom, getDefaultStore, useAtomValue } from "jotai";

/**
 * Cross-root selection keys for ItemPane highlighting (Jotai default store).
 * Assignment format: `assignment:${collectionId}:${assignmentId}`
 * Item format: `item:${itemId}`
 *
 * SyllabusPage page-local format is `assignment:${assignmentId}` / `item:${itemId}`;
 * map with toCrossRootIdentifiers / fromCrossRootIdentifiers.
 */

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

export const selectedSyllabusIdentifiersAtom = atom<ReadonlySet<string>>(
  new Set<string>(),
);

/** Key used by ItemPane to highlight a specific assignment in a collection. */
export function syllabusAssignmentSelectionKey(
  collectionId: number,
  assignmentId: string,
): string {
  return `assignment:${collectionId}:${assignmentId}`;
}

/**
 * Map SyllabusPage local identifiers (`assignment:${id}` / `item:${id}`)
 * into cross-root keys that include collectionId for assignments.
 */
export function toCrossRootIdentifiers(
  identifiers: Iterable<string>,
  collectionId: number,
): Set<string> {
  const next = new Set<string>();
  for (const identifier of identifiers) {
    if (identifier.startsWith("assignment:")) {
      const assignmentId = identifier.slice("assignment:".length);
      if (assignmentId) {
        next.add(syllabusAssignmentSelectionKey(collectionId, assignmentId));
      }
    } else {
      next.add(identifier);
    }
  }
  return next;
}

/**
 * Map cross-root keys back to SyllabusPage local identifiers for one collection.
 * Assignments for other collections are dropped.
 */
export function fromCrossRootIdentifiers(
  identifiers: Iterable<string>,
  collectionId: number,
): Set<string> {
  const prefix = `assignment:${collectionId}:`;
  const next = new Set<string>();
  for (const identifier of identifiers) {
    if (identifier.startsWith(prefix)) {
      next.add(`assignment:${identifier.slice(prefix.length)}`);
    } else if (identifier.startsWith("item:")) {
      next.add(identifier);
    }
  }
  return next;
}

export function getSelectedSyllabusIdentifiers(): ReadonlySet<string> {
  return getDefaultStore().get(selectedSyllabusIdentifiersAtom);
}

/** Publish syllabus identifier selection for other Preact roots (e.g. ItemPane). */
export function setSelectedSyllabusIdentifiers(
  next: Iterable<string> | ReadonlySet<string>,
): void {
  const nextSet = next instanceof Set ? next : new Set(next);
  const store = getDefaultStore();
  const prev = store.get(selectedSyllabusIdentifiersAtom);
  if (setsEqual(prev, nextSet)) {
    return;
  }
  store.set(selectedSyllabusIdentifiersAtom, new Set(nextSet));
}

export function useSelectedSyllabusIdentifiers(): ReadonlySet<string> {
  return useAtomValue(selectedSyllabusIdentifiersAtom);
}

/**
 * Syllabus page selection: page-local ids, backed by the cross-root atom.
 * No mirror effect — writers update the atom directly.
 */
export function useSyllabusPageSelection(collectionId: number): {
  selectedIdentifiers: Set<string>;
  setSelectedIdentifiers: (
    next: Set<string> | ((prev: Set<string>) => Set<string>),
  ) => void;
  selectedIdentifiersRef: { current: Set<string> };
} {
  const crossRoot = useSelectedSyllabusIdentifiers();
  const selectedIdentifiers = useMemo(
    () => fromCrossRootIdentifiers(crossRoot, collectionId),
    [crossRoot, collectionId],
  );
  const selectedIdentifiersRef = useRef(selectedIdentifiers);
  selectedIdentifiersRef.current = selectedIdentifiers;

  const setSelectedIdentifiers = useCallback(
    (next: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      const prevLocal = fromCrossRootIdentifiers(
        getSelectedSyllabusIdentifiers(),
        collectionId,
      );
      const resolved = typeof next === "function" ? next(prevLocal) : next;
      setSelectedSyllabusIdentifiers(
        toCrossRootIdentifiers(resolved, collectionId),
      );
    },
    [collectionId],
  );

  useEffect(() => {
    return () => setSelectedSyllabusIdentifiers(new Set());
  }, []);

  return {
    selectedIdentifiers,
    setSelectedIdentifiers,
    selectedIdentifiersRef,
  };
}
