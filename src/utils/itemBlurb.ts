import { getCachedItem } from "./cache";
import { getItemAbstractSnippet, snippetFromAbstractNote } from "./items";
import {
  firstPdfContentText,
  pageIndexOfSnippet,
  shouldSkipFrontmatter,
  sliceFromPdfAbstract,
  sliceFromFirstProseParagraph,
} from "./pdfFrontmatter";

export type ItemBlurbLocation = {
  text: string;
  attachmentID?: number;
  pageIndex?: number;
};

const BLURB_READ_BYTES = 12_000;
const BLURB_BOOK_READ_BYTES = 160_000;
const BLURB_MAX_CHARS = 1_200;

const SHOP_COPY_ABSTRACT =
  /purchase online|\bbuy (?:the|this) (?:pdf|e-?book|book)\b|add to (?:cart|basket)|learning matters\s*[-–—]\s*e-book/i;

/** Shop/catalog paste in `abstractNote` — not a standfirst. */
export function isShopCopyAbstract(text: string): boolean {
  return SHOP_COPY_ABSTRACT.test(text);
}

export function usableAbstractSnippet(item: Zotero.Item): string {
  const text = getItemAbstractSnippet(item);
  if (!text || isShopCopyAbstract(text)) {
    return "";
  }
  return text;
}

const blurbMemo = new Map<
  number,
  { stamp: string; promise: Promise<ItemBlurbLocation> }
>();

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

/** Turn extracted PDF/HTML attachment text into a short magazine standfirst. */
export function extractAttachmentBlurb(
  raw: string,
  options?: { skipFrontmatter?: boolean },
): { text: string; pageIndex?: number } {
  const cleanedRaw = cleanAttachmentExtractText(raw);
  let text = cleanedRaw;
  const fromAbstract = sliceFromPdfAbstract(text);
  if (fromAbstract) {
    text = fromAbstract;
  } else if (options?.skipFrontmatter) {
    text = firstPdfContentText(text);
  } else {
    const fromProse = sliceFromFirstProseParagraph(text);
    if (fromProse) {
      text = fromProse;
    }
  }
  text = snippetFromAbstractNote(text)
    .replace(/\bpage\s+\d+\b/gi, " ")
    .replace(/\b\d+\s*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 40) {
    return { text: "" };
  }
  const cleaned = text.slice(0, BLURB_MAX_CHARS).trim();
  return {
    text: cleaned,
    pageIndex: pageIndexOfSnippet(cleanedRaw, cleaned),
  };
}

/** Turn extracted PDF/HTML attachment text into a short magazine standfirst. */
export function blurbFromAttachmentText(
  raw: string,
  options?: { skipFrontmatter?: boolean },
): string {
  return extractAttachmentBlurb(raw, options).text;
}

function itemStamp(item: Zotero.Item): string {
  let attachments = "";
  try {
    for (const id of item.getAttachments()) {
      const att = getCachedItem(id);
      attachments += att ? `${att.key}:${att.dateModified || ""};` : `${id};`;
    }
  } catch {
    attachments = "";
  }
  return `${item.id}:${item.dateModified || ""}:${attachments}`;
}

/**
 * Abstract when present; otherwise a snippet of indexed attachment text
 * (`.zotero-ft-cache` or HTML snapshot). Empty if neither exists.
 */
export function getItemBlurb(item: Zotero.Item): Promise<string> {
  const fromAbstract = usableAbstractSnippet(item);
  if (fromAbstract) {
    return Promise.resolve(fromAbstract);
  }
  return getItemBlurbLocation(item).then((blurb) => blurb.text);
}

/**
 * Same text as `getItemBlurb`, plus the attachment and 0-based page the
 * standfirst was taken from (when the full-text cache kept page breaks).
 */
export function getItemBlurbLocation(
  item: Zotero.Item,
): Promise<ItemBlurbLocation> {
  const stamp = itemStamp(item);
  const cached = blurbMemo.get(item.id);
  if (cached && cached.stamp === stamp) {
    return cached.promise;
  }
  const fromAbstract = usableAbstractSnippet(item);
  const promise = (
    fromAbstract
      ? locateAbstractBlurb(item, fromAbstract)
      : readAttachmentBlurbLocation(item)
  ).catch((error) => {
    ztoolkit.log("getItemBlurbLocation failed:", error);
    return { text: fromAbstract || "" };
  });
  blurbMemo.set(item.id, { stamp, promise });
  return promise;
}

async function locateAbstractBlurb(
  item: Zotero.Item,
  text: string,
): Promise<ItemBlurbLocation> {
  const located = await locateSnippetInAttachments(item, text);
  return { text, ...located };
}

async function readAttachmentBlurbLocation(
  item: Zotero.Item,
): Promise<ItemBlurbLocation> {
  let ids: number[];
  try {
    ids = item.getAttachments();
  } catch {
    return { text: "" };
  }
  const skipFrontmatter = shouldSkipFrontmatter(String(item.itemType || ""));
  for (const id of ids) {
    const att = getCachedItem(id);
    if (!att || typeof att.isAttachment !== "function" || !att.isAttachment()) {
      continue;
    }
    const extracted = await readOneAttachmentBlurb(att, skipFrontmatter);
    if (extracted.text) {
      return { ...extracted, attachmentID: id };
    }
  }
  return { text: "" };
}

async function locateSnippetInAttachments(
  item: Zotero.Item,
  snippet: string,
): Promise<{ attachmentID?: number; pageIndex?: number }> {
  let ids: number[];
  try {
    ids = item.getAttachments();
  } catch {
    return {};
  }
  const skipFrontmatter = shouldSkipFrontmatter(String(item.itemType || ""));
  let fallbackID = 0;
  for (const id of ids) {
    const att = getCachedItem(id);
    if (!att || typeof att.isAttachment !== "function" || !att.isAttachment()) {
      continue;
    }
    if (!fallbackID) {
      fallbackID = id;
    }
    const raw = await readAttachmentSearchText(att, skipFrontmatter);
    if (!raw) {
      continue;
    }
    const pageIndex = pageIndexOfSnippet(raw, snippet);
    if (pageIndex != null) {
      return { attachmentID: id, pageIndex };
    }
    const needle = snippet
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40)
      .toLowerCase();
    const haystack = raw.replace(/\s+/g, " ").toLowerCase();
    if (needle.length >= 16 && haystack.includes(needle)) {
      return { attachmentID: id };
    }
  }
  return fallbackID ? { attachmentID: fallbackID } : {};
}

async function readOneAttachmentBlurb(
  att: Zotero.Item,
  skipFrontmatter: boolean,
): Promise<{ text: string; pageIndex?: number }> {
  const raw = await readAttachmentSearchText(att, skipFrontmatter);
  if (!raw) {
    return { text: "" };
  }
  return extractAttachmentBlurb(raw, { skipFrontmatter });
}

async function readAttachmentSearchText(
  att: Zotero.Item,
  skipFrontmatter: boolean,
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
  const maxBytes = skipFrontmatter ? BLURB_BOOK_READ_BYTES : BLURB_READ_BYTES;
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
