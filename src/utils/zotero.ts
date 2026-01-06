import { getCachedCollectionById } from "./cache";

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
