import { getCachedCollectionById } from "./cache";

/**
 * Compare the running Zotero app version against a major.minor.patch target.
 */
export function isZoteroVersionAtLeast(minVersion: string): boolean {
  const parse = (v: string) =>
    v
      .split(".")
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0);
  const [aMaj, aMin = 0, aPatch = 0] = parse(Zotero.version);
  const [bMaj, bMin = 0, bPatch = 0] = parse(minVersion);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPatch >= bPatch;
}

/** Zotero 8+ platform / UI features (also true on Zotero 9/10). */
export function isZotero8OrLater(): boolean {
  return isZoteroVersionAtLeast("8.0");
}

type ZoteroPaneSelection = {
  getSelectedCollections?: () => Zotero.Collection[] | false | null | undefined;
  getSelectedCollection?: () => Zotero.Collection | false | null | undefined;
  collectionsView?: { selectByID: (id: string) => unknown } | false | null;
};

/** Active collections pane, or undefined if Zotero has no main window yet. */
function getZoteroPane(): ZoteroPaneSelection | undefined {
  try {
    return (
      Zotero.getActiveZoteroPane() ?? Zotero.getMainWindow()?.ZoteroPane
    ) as ZoteroPaneSelection | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Collections currently selected in the collections pane.
 * Zotero 10 removed the singular getters; use the plural API when present.
 */
export function getSelectedCollections(): Zotero.Collection[] {
  try {
    const pane = getZoteroPane();
    if (!pane) return [];

    if (typeof pane.getSelectedCollections === "function") {
      const collections = pane.getSelectedCollections();
      return Array.isArray(collections) ? collections : [];
    }

    if (typeof pane.getSelectedCollection === "function") {
      const collection = pane.getSelectedCollection();
      return collection ? [collection] : [];
    }

    return [];
  } catch {
    return [];
  }
}

/** The selected collection, or null if none or more than one is selected. */
export function getSelectedCollection(): Zotero.Collection | null {
  const collections = getSelectedCollections();
  return collections.length === 1 ? collections[0] : null;
}

export function selectZoteroCollection(collectionId: number): boolean {
  try {
    const pane = getZoteroPane();
    const collection = getCachedCollectionById(collectionId);
    if (!collection || !pane?.collectionsView) {
      return false;
    }
    pane.collectionsView.selectByID(collection.treeViewID);
    return true;
  } catch (error) {
    ztoolkit.log("Error selecting collection:", error);
    return false;
  }
}

export function getAllCollections(recursive = true) {
  const libraries = Array.from(Zotero.Libraries.getAll());
  const collections: Zotero.Collection[] = [];
  for (const library of libraries) {
    const libraryCollections = Zotero.Collections.getByLibrary(library.id);
    collections.push(...libraryCollections);
  }
  if (recursive) {
    for (const collection of collections) {
      collection.getDescendents().forEach((childObject) => {
        if (childObject.type === "collection") {
          const childCollection = getCachedCollectionById(childObject.id);
          if (childCollection) {
            collections.push(childCollection);
          }
        }
      });
    }
  }
  const collectionMap = new Map<string, Zotero.Collection>();
  for (const collection of collections) {
    collectionMap.set(collection.key, collection);
  }
  return Array.from(collectionMap.values());
}
