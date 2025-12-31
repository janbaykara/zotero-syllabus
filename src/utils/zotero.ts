export function getSelectedCollection() {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  return pane?.getSelectedCollection() || null;
}

export function getAllCollections() {
  const libraries = Array.from(Zotero.Libraries.getAll())
  const library = libraries.find(
    (library) => library.name === "My Library",
  )
  if (!library) {
    return [];
  }
  return Zotero.Collections.getByLibrary(library.id);
}
