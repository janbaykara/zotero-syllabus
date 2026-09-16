/** Copy plain text to the system clipboard (Zotero / Firefox chrome). */
export function copyStringToClipboard(text: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Cc = Components.classes as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ci = Components.interfaces as any;
    const helper = Cc[
      "@mozilla.org/widget/clipboardhelper;1"
    ].getService(Ci.nsIClipboardHelper);
    helper.copyString(text);
    return true;
  } catch (err) {
    ztoolkit.log("copyStringToClipboard failed:", err);
    return false;
  }
}
