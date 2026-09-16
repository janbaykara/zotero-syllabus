/**
 * Zotero item-type attachment icons (16px light), from
 * chrome://zotero/skin/item-type/16/light/attachment-{pdf,epub}.svg
 * Bundled so published HTML can show them outside Zotero chrome.
 */

export const ZOTERO_ATTACHMENT_PDF_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path opacity="0.5" d="M11.707 0H3V16H16V4.293L11.707 0Z" fill="white"/><path d="M11.293 1L15 4.707V15H4V1H11.293Z" fill="white"/><path opacity="0.2" d="M11.707 0H3V16H16V4.293L11.707 0ZM12 1.707L14.293 4H12V1.707ZM4 15V1H11V5H15V15H4Z" fill="black"/><path opacity="0.08" d="M12 1.70703V4H14.293L12 1.70703Z" fill="black"/><path d="M8 4H1V6H8V4Z" fill="#F1ABB0"/><path d="M8 4V6H1V4H8ZM9 3H0V7H9V3Z" fill="#DB2C3A"/></svg>`;

export const ZOTERO_ATTACHMENT_EPUB_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path opacity="0.5" d="M14 2H15C15.2652 2 15.5196 2.10536 15.7071 2.29289C15.8946 2.48043 16 2.73478 16 3V15C16 15.2652 15.8946 15.5196 15.7071 15.7071C15.5196 15.8946 15.2652 16 15 16H5C4.73481 15.9999 4.48049 15.8945 4.293 15.707L2.293 13.707C2.10545 13.5195 2.00006 13.2652 2 13V1C2 0.734784 2.10536 0.48043 2.29289 0.292893C2.48043 0.105357 2.73478 0 3 0H13C13.2652 0 13.5196 0.105357 13.7071 0.292893C13.8946 0.48043 14 0.734784 14 1V2Z" fill="white"/><path d="M14 2V13C14 13.5523 13.5523 14 13 14H4L5 15H15V3L14 2Z" fill="#EBEBEB"/><path opacity="0.2" d="M15 2H14L15 3V15H5L4 14H13C13.2652 14 13.5196 13.8946 13.7071 13.7071C13.8946 13.5196 14 13.2652 14 13V1C14 0.734784 13.8946 0.48043 13.7071 0.292893C13.5196 0.105357 13.2652 0 13 0L3 0C2.73478 0 2.48043 0.105357 2.29289 0.292893C2.10536 0.48043 2 0.734784 2 1V13C2.00006 13.2652 2.10545 13.5195 2.293 13.707L4.293 15.707C4.48049 15.8945 4.73481 15.9999 5 16H15C15.2652 16 15.5196 15.8946 15.7071 15.7071C15.8946 15.5196 16 15.2652 16 15V3C16 2.73478 15.8946 2.48043 15.7071 2.29289C15.5196 2.10536 15.2652 2 15 2ZM5 1H13V13H5V1ZM3 1H4V13H3V1Z" fill="black"/><path d="M13 1H5V13H13V1Z" fill="white"/><path d="M4 1H3V13H4V1Z" fill="white"/><path d="M8 4H1V6H8V4Z" fill="#B0E5C3"/><path d="M8 4V6H1V4H8ZM9 3H0V7H9V3Z" fill="#39BF68"/></svg>`;

/** Kind for a published relative files/… attachment link. */
export function publishFileIconKind(
  href: string,
): "pdf" | "epub" | null {
  const value = href.trim().toLowerCase();
  if (!/^files\/[a-z0-9._-]+\.[a-z0-9]+$/.test(value)) {
    return null;
  }
  if (value.endsWith(".pdf")) return "pdf";
  if (value.endsWith(".epub")) return "epub";
  return null;
}

export function svgForPublishFileKind(kind: "pdf" | "epub"): string {
  return kind === "pdf"
    ? ZOTERO_ATTACHMENT_PDF_SVG
    : ZOTERO_ATTACHMENT_EPUB_SVG;
}
