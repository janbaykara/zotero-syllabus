/** Copy plain text to the system clipboard (Zotero / Firefox chrome). */
export function copyStringToClipboard(text: string): boolean {
  try {
    const Cc = Components.classes as any;

    const Ci = Components.interfaces as any;
    const helper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
      Ci.nsIClipboardHelper,
    );
    helper.copyString(text);
    return true;
  } catch (err) {
    ztoolkit.log("copyStringToClipboard failed:", err);
    return false;
  }
}
