import { getCachedItem } from "./cache";
import { printedPageLabelFromPage, splitPdfCachePages } from "./pdfFrontmatter";
import { formatFulltextSearchHit } from "./searchHighlight";

/** Max matching paragraphs returned per attachment. */
export const FULLTEXT_PARAGRAPH_CAP = 3;

/** Read enough of `.zotero-ft-cache` to catch mid-document hits. */
export const FULLTEXT_CACHE_MAX_BYTES = 2_000_000;

export type FulltextParagraphHit = {
  text: string;
  paragraphIndex: number;
  pageIndex?: number;
  pageLabel?: string;
};

function parentDir(path: string): string {
  if (
    typeof PathUtils !== "undefined" &&
    typeof PathUtils.parent === "function"
  ) {
    return PathUtils.parent(path) || "";
  }
  return path.replace(/[/\\][^/\\]+$/, "");
}

function joinPath(...parts: string[]): string {
  if (
    typeof PathUtils !== "undefined" &&
    typeof PathUtils.join === "function"
  ) {
    return PathUtils.join(...parts);
  }
  return parts.join(/win/i.test(Zotero.platform || "") ? "\\" : "/");
}

function cleanAttachmentExtractText(raw: string): string {
  let text = raw.split("\u0000").join(" ");
  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  }
  return text;
}

/** Collapse whitespace for case-insensitive contains matching. */
export function normalizeFulltextMatchText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Collapse runs of spaces/tabs but keep single newlines (for line-based snippets). */
export function normalizeParagraphNewlines(text: string): string {
  return String(text || "")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trimEnd())
    .join("\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();
}

/** Split a PDF cache page (or whole doc) into blank-line paragraphs. */
export function splitPageIntoParagraphs(pageText: string): string[] {
  return String(pageText || "")
    .split(/\n\s*\n/)
    .map((part) => normalizeParagraphNewlines(part))
    .filter(Boolean);
}

/**
 * Find paragraphs in indexed attachment text that contain `query`.
 * Uses form-feed page breaks when present for pageIndex / pageLabel.
 */
export function findMatchingParagraphsInFulltext(
  raw: string,
  query: string,
  options?: { maxPerAttachment?: number },
): FulltextParagraphHit[] {
  const needle = normalizeFulltextMatchText(query);
  if (!needle) {
    return [];
  }
  const cleaned = cleanAttachmentExtractText(raw);
  if (!cleaned.trim()) {
    return [];
  }
  const cap = Math.max(1, options?.maxPerAttachment ?? FULLTEXT_PARAGRAPH_CAP);
  const pages = splitPdfCachePages(cleaned);
  const multiPage = pages.length > 1;
  const hits: FulltextParagraphHit[] = [];
  let paragraphIndex = 0;
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex] || "";
    for (const para of splitPageIntoParagraphs(page)) {
      const index = paragraphIndex++;
      if (!normalizeFulltextMatchText(para).includes(needle)) {
        continue;
      }
      const hit: FulltextParagraphHit = {
        text: formatFulltextSearchHit(para, query),
        paragraphIndex: index,
      };
      if (multiPage) {
        hit.pageIndex = pageIndex;
        const printed = printedPageLabelFromPage(page);
        hit.pageLabel = printed || String(pageIndex + 1);
      } else {
        hit.pageIndex = 0;
      }
      hits.push(hit);
      if (hits.length >= cap) {
        return hits;
      }
    }
  }
  return hits;
}

/**
 * Stable negative id so stream rows do not collide with real annotation ids.
 */
export function syntheticFulltextStreamId(
  attachmentID: number,
  pageIndex: number | undefined,
  paragraphIndex: number,
): number {
  const key = `${attachmentID}:${pageIndex ?? -1}:${paragraphIndex}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  if (hash === 0) {
    return -1;
  }
  return hash > 0 ? -hash : hash;
}

/** True when an annotation quote substantially overlaps a full-text paragraph. */
export function paragraphOverlapsAnnotationQuote(
  paragraph: string,
  quote: string,
): boolean {
  const p = normalizeFulltextMatchText(paragraph);
  const q = normalizeFulltextMatchText(quote);
  if (!p || !q || q.length < 8) {
    return false;
  }
  return p.includes(q) || q.includes(p);
}

async function readTextPrefix(path: string, maxBytes: number): Promise<string> {
  try {
    if (typeof IOUtils !== "undefined") {
      const exists =
        typeof IOUtils.exists === "function"
          ? await IOUtils.exists(path)
          : true;
      if (!exists) {
        return "";
      }
      const bytes = await IOUtils.read(path, { maxBytes });
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
    if (!Zotero.File.pathToFile(path).exists()) {
      return "";
    }
    const contents = await Zotero.File.getContentsAsync(path);
    return String(contents || "").slice(0, maxBytes);
  } catch {
    return "";
  }
}

/** Read indexed full text for an attachment (cache, else HTML/plain file). */
export async function readAttachmentFulltext(
  att: Zotero.Item,
  maxBytes = FULLTEXT_CACHE_MAX_BYTES,
): Promise<string> {
  let path = "";
  try {
    path = (await att.getFilePathAsync()) || "";
  } catch {
    // Keep empty when the attachment path is unavailable.
  }
  if (!path) {
    return "";
  }
  const dir = parentDir(path);
  if (dir) {
    const cachePath = joinPath(dir, ".zotero-ft-cache");
    const fromCache = await readTextPrefix(cachePath, maxBytes);
    if (fromCache) {
      return fromCache;
    }
  }
  const type = String(att.attachmentContentType || "").toLowerCase();
  if (
    type.includes("html") ||
    type.includes("xhtml") ||
    type === "text/plain"
  ) {
    return readTextPrefix(path, maxBytes);
  }
  return "";
}

/** Resolve a searchable attachment for a full-text search hit item. */
export function attachmentForFulltextHit(
  item: Zotero.Item,
): Zotero.Item | null {
  try {
    if (item.deleted) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    if (typeof item.isAttachment === "function" && item.isAttachment()) {
      return item;
    }
  } catch {
    // Fall through.
  }
  try {
    if (typeof item.isRegularItem === "function" && item.isRegularItem()) {
      const ids = item.getAttachments?.() || [];
      for (const id of ids) {
        const att = getCachedItem(id);
        if (
          att &&
          typeof att.isAttachment === "function" &&
          att.isAttachment()
        ) {
          return att;
        }
      }
    }
  } catch {
    // Keep null.
  }
  return null;
}
