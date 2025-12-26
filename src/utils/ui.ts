/**
 * Helper to escape HTML special characters
 */
export function escapeHTML(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Helper to parse HTML template string into a DocumentFragment
 */
export function parseHTMLTemplate(
  doc: Document,
  html: string,
): DocumentFragment {
  const parser = new doc.defaultView!.DOMParser();
  const parsed = parser.parseFromString(
    `<template>${html}</template>`,
    "text/html",
  );
  const template = parsed.querySelector("template")!;
  return template.content;
}

/**
 * Helper to parse XUL template string into a DocumentFragment
 */
export function parseXULTemplate(xul: string): DocumentFragment {
  const win = Zotero.getMainWindow();
  return win.MozXULElement.parseXULToFragment(xul);
}

export function getSystemTheme(): string {
  const win = Zotero.getMainWindow();
  return (win?.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false)
    ? "dark"
    : "light";
}

// <img class="syllabus-item-thumbnail-img" src="${getThumbnailForItem(item)}" alt="${escapeHTML(title)}" />
export function getThumbnailForItem(item: Zotero.Item): string | null {
  let imageSrc: string | null = null;

  // First try getImageSrc method if available
  if ((item as any).getImageSrc) {
    imageSrc = (item as any).getImageSrc();
  }

  // If no image, try to get from attachments
  if (!imageSrc) {
    const attachments = item.getAttachments();
    for (const attId of attachments) {
      try {
        const att = Zotero.Items.get(attId);
        if (
          att &&
          att.isAttachment() &&
          att.attachmentContentType?.startsWith("image/")
        ) {
          const file = att.getFilePath();
          if (file) {
            imageSrc = `file://${file}`;
            break;
          }
        }
      } catch (e) {
        // Continue to next attachment
      }
    }
  }

  return imageSrc;
}

export function generateImageSetString(
  __icon: Zotero.Item["itemType"],
  __size: number = 16,
): string {
  const icon = itemTypeToIconFileName(__icon, __icon);
  const size = 16;
  return `
    image-set(url("chrome://zotero/skin/item-type/${size}/dark/${icon}.svg") 1x, url("chrome://zotero/skin/item-type/${size}/dark/${icon}@2x.svg") 2x) no-repeat center/contain,image-set(url("chrome://zotero/skin/item-type/${size}/white/${icon}.svg") 1x, url("chrome://zotero/skin/item-type/${size}/white/${icon}@2x.svg") 2x) center/0,image-set(url("chrome://zotero/skin/item-type/${size}/light/${icon}.svg") 1x, url("chrome://zotero/skin/item-type/${size}/light/${icon}@2x.svg") 2x) center/0,image-set(url("chrome://zotero/skin/item-type/${size}/dark/${icon}.svg") 1x, url("chrome://zotero/skin/item-type/${size}/dark/${icon}@2x.svg") 2x) center/0
  `;
}

/**
 * Map Zotero item type to icon name
 */
export const itemTypeToIconFileName = (
  itemType: Zotero.Item["itemType"],
  defaultValue: string = "document",
): string => {
  return itemType.toString();

  // // Map item types to icon names
  // const iconMap: Record<Zotero.Item['itemType'], string> = {
  //   book: "book",
  //   bookSection: "book",
  //   journalArticle: "article",
  //   article: "article",
  //   magazineArticle: "article",
  //   newspaperArticle: "article",
  //   webpage: "web",
  //   website: "web",
  //   blogPost: "web",
  //   videoRecording: "video",
  //   audioRecording: "audio",
  //   film: "video",
  //   thesis: "document",
  //   report: "document",
  //   document: "document",
  //   letter: "letter",
  //   email: "email",
  //   interview: "interview",
  //   conferencePaper: "paper",
  //   presentation: "presentation",
  //   patent: "patent",
  //   map: "map",
  //   artwork: "artwork",
  //   software: "software",
  //   dataset: "dataset",
  // };

  // return iconMap[itemType] || defaultValue || "document";
};
