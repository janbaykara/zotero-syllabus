/**
 * GalleryCover-shaped HTML for static share pages (item share).
 * Classes match ShareGalleryCover / galleryCover.css + share-viewer-cover-shim.css.
 */

const PAGE_LIKE_ITEM_TYPES = new Set([
  "book",
  "bookSection",
  "conferencePaper",
  "document",
  "journalArticle",
  "manuscript",
  "preprint",
  "report",
  "thesis",
]);

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ShareCoverHtmlInput = {
  itemType: string;
  coverDataUrl?: string | null;
  coverPlaceholder?: { color: string; title: string; creator: string } | null;
};

export function shareCoverShapeClass(
  itemType: string,
  hasImage: boolean,
): string {
  const isVideo = itemType === "videoRecording" || itemType === "film";
  const isWeb =
    itemType === "webpage" ||
    itemType === "blogPost" ||
    itemType === "forumPost";
  const isPageLike = PAGE_LIKE_ITEM_TYPES.has(itemType);
  const isArtwork = itemType === "artwork";
  const useNatural =
    hasImage && !isVideo && !isWeb && (isPageLike || isArtwork);
  if (isVideo) return "syllabus-gallery-cover-video";
  if (isWeb) return "syllabus-gallery-cover-web";
  if (useNatural) return "syllabus-gallery-cover-natural";
  if (isPageLike) return "syllabus-gallery-cover-portrait";
  return "syllabus-gallery-cover-square";
}

/** Markup identical in structure to ShareGalleryCover. */
export function buildShareCoverHtml(opts: ShareCoverHtmlInput): string {
  const itemType = opts.itemType || "";
  const hasImage = Boolean(opts.coverDataUrl);
  const isBookLike = itemType === "book" || itemType === "bookSection";
  const showSpine = isBookLike;
  const showBinder =
    itemType === "report" || itemType === "document" || itemType === "thesis";
  const shape = shareCoverShapeClass(itemType, hasImage);
  const useNatural = shape === "syllabus-gallery-cover-natural";

  let faceInner = "";
  if (opts.coverDataUrl) {
    const imgClass = useNatural
      ? "syllabus-gallery-cover-img is-natural"
      : "syllabus-gallery-cover-img";
    faceInner += `<img src="${escapeAttr(opts.coverDataUrl)}" alt="" class="${imgClass}" draggable="false" />`;
  } else if (opts.coverPlaceholder) {
    const ph = opts.coverPlaceholder;
    const faceClass = showSpine
      ? "syllabus-gallery-placeholder-face syllabus-gallery-placeholder-spine"
      : "syllabus-gallery-placeholder-face";
    const bg = `linear-gradient(165deg, color-mix(in srgb, ${ph.color} 88%, white) 0%, ${ph.color} 55%, color-mix(in srgb, ${ph.color} 72%, black) 100%)`;
    faceInner += `<div class="${faceClass}" style="background:${escapeAttr(bg)}">`;
    faceInner += `<div class="syllabus-gallery-placeholder-title">${escapeHtml(ph.title)}</div>`;
    faceInner += ph.creator
      ? `<div class="syllabus-gallery-placeholder-creator">${escapeHtml(ph.creator)}</div>`
      : `<div></div>`;
    faceInner += `</div>`;
  } else {
    faceInner += `<div class="syllabus-gallery-placeholder-face"></div>`;
  }
  if (showSpine) {
    faceInner += `<div class="syllabus-gallery-book-spine"></div>`;
  }

  if (showBinder) {
    const rings = Array.from(
      { length: 7 },
      () => `<span class="syllabus-gallery-binder-ring"></span>`,
    ).join("");
    return `<div class="syllabus-gallery-cover-with-binder"><div class="syllabus-gallery-binder" aria-hidden="true">${rings}</div><div class="syllabus-gallery-cover-face ${shape}">${faceInner}</div></div>`;
  }

  return `<div class="${shape}">${faceInner}</div>`;
}
