import { useMemo } from "preact/hooks";
import { useSyncExternalStore } from "react-dom/src";

/**
 * Cross-root selection keys for ItemPane highlighting.
 * Assignment format: `assignment:${collectionId}:${assignmentId}`
 * Item format (unused by ItemPane today): `item:${itemId}`
 */
let selectedIdentifiers: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

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

function getSnapshot(): ReadonlySet<string> {
  return selectedIdentifiers;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

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

/** Publish syllabus identifier selection for other Preact roots (e.g. ItemPane). */
export function setSelectedSyllabusIdentifiers(
  next: Iterable<string> | ReadonlySet<string>,
): void {
  const nextSet: ReadonlySet<string> =
    next instanceof Set ? next : new Set(next);
  if (setsEqual(selectedIdentifiers, nextSet)) {
    return;
  }
  // Always store a fresh Set so useSyncExternalStore sees a new snapshot.
  selectedIdentifiers = new Set(nextSet);
  listeners.forEach((listener) => listener());
}

export function useSelectedSyllabusIdentifiers(): ReadonlySet<string> {
  const store = useMemo(() => ({ getSnapshot, subscribe }), []);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
