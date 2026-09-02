import { getCachedItem } from "./cache";
import { getItemAbstractSnippet, snippetFromAbstractNote } from "./items";
import {
  firstPdfContentText,
  shouldSkipFrontmatter,
  sliceFromPdfAbstract,
  sliceFromFirstProseParagraph,
} from "./pdfFrontmatter";

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
  { stamp: string; promise: Promise<string> }
>();

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
export function blurbFromAttachmentText(
  raw: string,
  options?: { skipFrontmatter?: boolean },
): string {
  let text = raw.split("\u0000").join(" ");
  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
  }
  const fromAbstract = sliceFromPdfAbstract(text);
  if (fromAbstract) {
    text = fromAbstract;
  } else {
    if (options?.skipFrontmatter) {
      text = firstPdfContentText(text);
    } else {
      const fromProse = sliceFromFirstProseParagraph(text);
      if (fromProse) {
        text = fromProse;
      }
    }
  }
  text = snippetFromAbstractNote(text)
    .replace(/\bpage\s+\d+\b/gi, " ")
    .replace(/\b\d+\s*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 40) {
    return "";
  }
  return text.slice(0, BLURB_MAX_CHARS).trim();
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
  const stamp = itemStamp(item);
  const cached = blurbMemo.get(item.id);
  if (cached && cached.stamp === stamp) {
    return cached.promise;
  }
  const promise = readAttachmentBlurb(item).catch((error) => {
    ztoolkit.log("getItemBlurb failed:", error);
    return "";
  });
  blurbMemo.set(item.id, { stamp, promise });
  return promise;
}

async function readAttachmentBlurb(item: Zotero.Item): Promise<string> {
  let ids: number[] = [];
  try {
    ids = item.getAttachments();
  } catch {
    return "";
  }
  for (const id of ids) {
    const att = getCachedItem(id);
    if (!att || typeof att.isAttachment !== "function" || !att.isAttachment()) {
      continue;
    }
    const snippet = await readOneAttachmentBlurb(
      att,
      shouldSkipFrontmatter(String(item.itemType || "")),
    );
    if (snippet) {
      return snippet;
    }
  }
  return "";
}

async function readOneAttachmentBlurb(
  att: Zotero.Item,
  skipFrontmatter: boolean,
): Promise<string> {
  let path = "";
  try {
    path = (await att.getFilePathAsync()) || "";
  } catch {
    path = "";
  }
  if (!path) {
    return "";
  }
  const maxBytes = skipFrontmatter ? BLURB_BOOK_READ_BYTES : BLURB_READ_BYTES;
  const dir = parentDir(path);
  if (dir) {
    const cachePath = joinPath(dir, ".zotero-ft-cache");
    const fromCache = await readTextPrefix(cachePath, maxBytes);
    const cacheBlurb = blurbFromAttachmentText(fromCache, { skipFrontmatter });
    if (cacheBlurb) {
      return cacheBlurb;
    }
  }
  const type = String(att.attachmentContentType || "").toLowerCase();
  if (
    type.includes("html") ||
    type.includes("xhtml") ||
    type === "text/plain"
  ) {
    const fromFile = await readTextPrefix(path, maxBytes);
    return blurbFromAttachmentText(fromFile, { skipFrontmatter });
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
