/**
 * Shared data layer helpers (Jotai default store).
 *
 * Conventions:
 * - External truth (Zotero pane, prefs, syllabus note cache) → atomFromExternal /
 *   atomFamilyFromExternal with onMount subscribe + equality-aware set.
 * - Plugin UI truth (syllabus identifiers, …) → plain atom; write with
 *   useSetAtom / getDefaultStore().set — never useState + sync effect.
 * - Never wrap renderComponent roots in <Provider>; default store is shared
 *   across Syllabus / ItemPane / Gallery / Explorer.
 */

import { atom, type PrimitiveAtom } from "jotai";
import { atomFamily, type AtomFamily } from "jotai-family";

export type ExternalSource<T> = {
  getSnapshot: () => T;
  subscribe: (onStoreChange: () => void) => () => void;
  /** Skip set when unchanged. Defaults to Object.is. */
  equal?: (a: T, b: T) => boolean;
  /**
   * Fallback when `getSnapshot` throws at module load (circular import /
   * SyllabusManager TDZ / cold Zotero). onMount still syncs the real value.
   */
  initial?: T;
};

/**
 * Atom that mirrors an external source. onMount attaches once for the default
 * store (first subscriber) and cleans up when the last subscriber leaves.
 */
export function atomFromExternal<T>(
  source: ExternalSource<T>,
): PrimitiveAtom<T> {
  const equal = source.equal ?? Object.is;
  let initial: T;
  try {
    initial = source.getSnapshot();
  } catch {
    initial =
      "initial" in source ? (source.initial as T) : (undefined as unknown as T);
  }
  const anAtom = atom(initial) as PrimitiveAtom<T>;

  anAtom.onMount = (setAtom) => {
    const sync = () => {
      const next = source.getSnapshot();
      setAtom((prev: T) => (equal(prev, next) ? prev : next));
    };
    // Subscribe first so sources can prime module caches before the first sync.
    const unsubscribe = source.subscribe(sync);
    sync();
    return unsubscribe;
  };

  return anAtom;
}

export type { AtomFamily };

/**
 * Per-key external atoms via `jotai-family` (atomFamily left jotai/utils in v3).
 */
export function atomFamilyFromExternal<Key, T>(
  createSource: (key: Key) => ExternalSource<T>,
  areEqual?: (a: Key, b: Key) => boolean,
): AtomFamily<Key, PrimitiveAtom<T>> {
  return atomFamily(
    (key: Key) => atomFromExternal(createSource(key)),
    areEqual,
  );
}
