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

/** Zotero 8+ platform / UI features (also true on Zotero 9). */
export function isZotero8OrLater(): boolean {
  return isZoteroVersionAtLeast("8.0");
}

// import { getCurrentTab } from './window';
export function getSelectedCollection() {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  // const selectedGroup = pane?.getSelectedGroup()
  // const selectedLibraryID = pane.getSelectedLibraryID()
  // const library = Zotero.Libraries.get(selectedLibraryID)
  // const tab = getCurrentTab()
  const collection = pane?.getSelectedCollection();
  // ztoolkit.log("current", {
  //   selectedGroup,
  //   selectedLibraryID,
  //   library,
  //   collection,
  //   tab
  // });
  return collection || null;
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
