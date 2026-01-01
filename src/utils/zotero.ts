export function getSelectedCollection() {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  return pane?.getSelectedCollection() || null;
}

export function getAllCollections() {
  const libraries = Array.from(Zotero.Libraries.getAll());
  const collections: Zotero.Collection[] = [];
  for (const library of libraries) {
    const libraryCollections = Zotero.Collections.getByLibrary(library.id);
    collections.push(...libraryCollections);
  }
  return collections;
}
