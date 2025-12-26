export function getSelectedCollection() {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  return pane?.getSelectedCollection() || null;
}
