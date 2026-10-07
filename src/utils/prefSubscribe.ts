/**
 * Thin wrappers around Zotero.Prefs.registerObserver.
 * Kept separate from prefs.ts so cache can observe without a cycle
 * (prefs.ts already imports the cache).
 */

export function subscribePref(
  prefKey: string,
  onChange: () => void,
): () => void {
  const observerID = Zotero.Prefs.registerObserver(prefKey, onChange, true);
  return () => {
    Zotero.Prefs.unregisterObserver(observerID);
  };
}

export function subscribePrefs(
  prefKeys: readonly string[],
  onChange: () => void,
): () => void {
  const unsubs = prefKeys.map((key) => subscribePref(key, onChange));
  return () => {
    for (const unsub of unsubs) {
      unsub();
    }
  };
}
