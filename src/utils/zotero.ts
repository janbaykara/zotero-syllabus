export function getSelectedCollection() {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  return pane?.getSelectedCollection() || null;
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
          const collection = Zotero.Collections.get(childObject.id);
          collections.push(collection);
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
