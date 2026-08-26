import { getCachedItem } from "./cache";

export function sortItemsByTitle(items: Zotero.Item[]): Zotero.Item[] {
  return [...items].sort((a, b) => {
    const titleA = a.getField("title") || "";
    const titleB = b.getField("title") || "";
    return titleA.localeCompare(titleB);
  });
}

/** Open the first viewable attachment, or the item URL if none. */
export function openItemBestAttachment(item: Zotero.Item): void {
  const attachments = item.getAttachments();
  const viewableAttachment = attachments.find((attId) => {
    const att = getCachedItem(attId);
    return !!(att && att.isAttachment());
  });
  if (viewableAttachment) {
    const pane = ztoolkit.getGlobal("ZoteroPane");
    void pane.viewPDF(viewableAttachment, { page: 1 } as any);
    return;
  }
  const url = item.getField("url");
  if (url) {
    Zotero.launchURL(url);
  }
}
