/**
 * Helper to parse XUL template string into a DocumentFragment
 */
export function parseXULTemplate(xul: string): DocumentFragment {
  const win = Zotero.getMainWindow();
  return win.MozXULElement.parseXULToFragment(xul);
}
