export function getSelectedCollection() {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  return pane?.getSelectedCollection() || null;
}

export function getAllCollections() {
  const libraryId = Zotero.Libraries.getAll()[0].id;
  return Zotero.Collections.getByLibrary(libraryId);
}
