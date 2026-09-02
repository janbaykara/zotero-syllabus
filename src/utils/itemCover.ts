import { getCachedItem } from "./cache";
import { getItemCreatorLine, getItemTitle } from "./items";
import { getString } from "./locale";
import {
  youtubeThumbnailUrl,
  youtubeUrlFromItem,
  youtubeVideoIdFromUrl,
} from "./youtube";

const THUMB_DIR_NAME = "syllabus-gallery-thumbs";
const THUMB_WIDTH = 280;
const JPEG_QUALITY = 0.82;
const PDF_RENDER_CONCURRENCY = 2;
const WEB_FETCH_CONCURRENCY = 2;
const ISBN_MIN_BYTES = 1000;
const WEB_THUMB_MIN_BYTES = 1500;
const WEB_THUMB_MAX_BYTES = 2_500_000;
const WEB_HTML_HEAD_CHARS = 100_000;
/** Reject PDF thumbs with fewer than this share of non-near-white pixels. */
const PDF_BLANK_MIN_NONWHITE = 0.02;
/** Only re-decode cached PDF thumbs under this size when checking for blanks. */
const PDF_CACHE_BLANK_CHECK_MAX_BYTES = 16_000;
/** Try this many leading PDF pages when page 1 is blank (common for scanned books). */
const PDF_COVER_MAX_PAGES = 5;
const EPUB_COVER_MIN_BYTES = 1500;

const WEB_GALLERY_ITEM_TYPES = new Set([
  "webpage",
  "blogPost",
  "newspaperArticle",
  "magazineArticle",
  "encyclopediaArticle",
]);

const VIDEO_GALLERY_ITEM_TYPES = new Set([
  "film",
  "videoRecording",
  "tvBroadcast",
]);

const AUDIO_GALLERY_ITEM_TYPES = new Set([
  "radioBroadcast",
  "audioRecording",
  "podcast",
]);

const VIDEO_HOSTS = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "vimeo.com",
  "dailymotion.com",
  "twitch.tv",
  "tiktok.com",
];

const PLACEHOLDER_COLORS = [
  "#4072e5",
  "#39bf68",
  "#db2c3a",
  "#cc9200",
  "#ff794c",
  "#59adc4",
  "#cc7a52",
  "#7b4ddb",
  "#66adff",
];

const PDFJS_CANDIDATES = [
  "resource://zotero/reader/pdf/build/pdf.mjs",
  "resource://zotero/reader/pdfjs/build/pdf.mjs",
  "resource://zotero/reader/pdf/pdf.mjs",
];

const PDFJS_WORKER_CANDIDATES = [
  "resource://zotero/reader/pdf/build/pdf.worker.mjs",
  "resource://zotero/reader/pdfjs/build/pdf.worker.mjs",
  "resource://zotero/reader/pdf/pdf.worker.mjs",
];

export type CoverFit = "cover" | "contain";

export type ResolvedCover =
  | { kind: "image"; src: string; fit: CoverFit; fromAttachment?: boolean }
  | { kind: "placeholder"; color: string; title: string; creator: string };

type PdfjsModule = {
  getDocument: (src: Record<string, unknown>) => { promise: Promise<any> };
  GlobalWorkerOptions?: { workerSrc: string };
};

const coverMemo = new Map<
  number,
  { stamp: string; promise: Promise<ResolvedCover> }
>();
const pdfThumbUris = new Map<string, string>();
const pdfThumbMisses = new Set<string>();
let pdfThumbIndex: Promise<Map<string, string>> | null = null;
const isbnMisses = new Set<string>();
let pdfjsModule: PdfjsModule | null | undefined;
let pdfjsLoad: Promise<PdfjsModule | null> | null = null;
let thumbDirReady: Promise<string> | null = null;
let pdfActive = 0;
const pdfWaiters: Array<() => void> = [];
let webActive = 0;
const webWaiters: Array<() => void> = [];
const webMisses = new Set<string>();

function joinPath(...parts: string[]): string {
  if (
    typeof PathUtils !== "undefined" &&
    typeof PathUtils.join === "function"
  ) {
    return PathUtils.join(...parts);
  }
  return parts.join(/win/i.test(Zotero.platform || "") ? "\\" : "/");
}

function itemStamp(item: Zotero.Item): string {
  let attachments = "";
  try {
    for (const id of item.getAttachments()) {
      const att = getCachedItem(id);
      attachments += att
        ? `${att.key}:${att.attachmentContentType || ""};`
        : `${id};`;
    }
  } catch {
    attachments = "";
  }
  let url = "";
  let isbn = "";
  try {
    url = item.getField("url") || "";
  } catch {
    url = "";
  }
  try {
    isbn = item.getField("ISBN") || "";
  } catch {
    isbn = "";
  }
  return `${item.id}:${item.itemType}:${url}:${isbn}:${attachments}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function itemTitle(item: Zotero.Item): string {
  return getItemTitle(item) || getString("untitled");
}

export function isWebGalleryItem(item: Zotero.Item): boolean {
  return WEB_GALLERY_ITEM_TYPES.has(item.itemType);
}

export function getItemPageUrl(item: Zotero.Item): string | null {
  const candidates: string[] = [];
  try {
    const url = String(item.getField("url") || "").trim();
    if (url) {
      candidates.push(url);
    }
  } catch {
    // Field may be missing for this item type.
  }
  try {
    for (const attId of item.getAttachments()) {
      const att = getCachedItem(attId);
      if (!att || !att.isAttachment()) {
        continue;
      }
      const attUrl = String(att.getField("url") || "").trim();
      if (attUrl) {
        candidates.push(attUrl);
      }
    }
  } catch {
    // Attachments may not be loaded.
  }
  return candidates.find((url) => /^https?:\/\//i.test(url)) || null;
}

export function getItemHostname(item: Zotero.Item): string {
  const pageUrl = getItemPageUrl(item);
  if (pageUrl) {
    try {
      return new URL(pageUrl).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      // Fall through to site-title fields.
    }
  }
  try {
    return (
      String(item.getField("websiteTitle") || "").trim() ||
      String(item.getField("publicationTitle") || "").trim() ||
      String(item.getField("encyclopediaTitle") || "").trim()
    );
  } catch {
    return "";
  }
}

function hostIsVideoSite(hostname: string): boolean {
  const host = hostname
    .replace(/^www\./i, "")
    .replace(/^m\./i, "")
    .toLowerCase();
  return VIDEO_HOSTS.some((site) => host === site || host.endsWith(`.${site}`));
}

export function isVideoGalleryItem(item: Zotero.Item): boolean {
  if (isAudioGalleryItem(item)) {
    return false;
  }
  if (VIDEO_GALLERY_ITEM_TYPES.has(item.itemType)) {
    return true;
  }
  const pageUrl = getItemPageUrl(item);
  if (!pageUrl) {
    return false;
  }
  if (youtubeVideoIdFromUrl(pageUrl)) {
    return true;
  }
  try {
    return hostIsVideoSite(new URL(pageUrl).hostname);
  } catch {
    return false;
  }
}

export function isAudioGalleryItem(item: Zotero.Item): boolean {
  return AUDIO_GALLERY_ITEM_TYPES.has(item.itemType);
}

export function isPlayableGalleryItem(item: Zotero.Item): boolean {
  return isVideoGalleryItem(item) || isAudioGalleryItem(item);
}

export function getVideoSiteHostname(item: Zotero.Item): string {
  const host = getItemHostname(item);
  if (!host || !host.includes(".")) {
    return "";
  }
  if (
    host === "youtu.be" ||
    host.endsWith("youtube.com") ||
    host.endsWith("youtube-nocookie.com")
  ) {
    return "youtube.com";
  }
  return host;
}

export function faviconUrlForHostname(hostname: string): string | null {
  const host = hostname.trim();
  if (!host || /\s/.test(host) || !host.includes(".")) {
    return null;
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
}

export function getPlaceholderCover(
  item: Zotero.Item,
): Extract<ResolvedCover, { kind: "placeholder" }> {
  const title = itemTitle(item);
  const color =
    PLACEHOLDER_COLORS[
      hashString(`${item.itemType}:${title}`) % PLACEHOLDER_COLORS.length
    ];
  return {
    kind: "placeholder",
    color,
    title,
    creator: getItemCreatorLine(item),
  };
}

export function resolveItemCover(item: Zotero.Item): Promise<ResolvedCover> {
  const stamp = itemStamp(item);
  const cached = coverMemo.get(item.id);
  if (cached && cached.stamp === stamp) {
    return cached.promise;
  }
  const promise = resolveItemCoverUncached(item).catch((error) => {
    ztoolkit.log("resolveItemCover failed:", error);
    return getPlaceholderCover(item);
  });
  coverMemo.set(item.id, { stamp, promise });
  return promise;
}

async function resolveItemCoverUncached(
  item: Zotero.Item,
): Promise<ResolvedCover> {
  const imageSrc = await findImageAttachmentSrc(item);
  if (imageSrc) {
    return { kind: "image", src: imageSrc, fit: "cover", fromAttachment: true };
  }

  const youtubeSrc = findYoutubeThumb(item);
  if (youtubeSrc) {
    return { kind: "image", src: youtubeSrc, fit: "cover" };
  }

  if (
    isWebGalleryItem(item) ||
    isVideoGalleryItem(item) ||
    isAudioGalleryItem(item)
  ) {
    const webSrc = await fetchWebThumbnail(item);
    if (webSrc) {
      return { kind: "image", src: webSrc, fit: "cover" };
    }
  }

  if (!isAudioGalleryItem(item)) {
    const epubSrc = await extractEpubCover(item);
    if (epubSrc) {
      return { kind: "image", src: epubSrc, fit: "cover" };
    }

    const pdfSrc = await renderPdfPageOne(item);
    if (pdfSrc) {
      return { kind: "image", src: pdfSrc, fit: "contain" };
    }

    const isbnSrc = await fetchIsbnCover(item);
    if (isbnSrc) {
      return { kind: "image", src: isbnSrc, fit: "cover" };
    }
  }

  return getPlaceholderCover(item);
}

function findYoutubeThumb(item: Zotero.Item): string | null {
  const url = youtubeUrlFromItem(item);
  const videoId = youtubeVideoIdFromUrl(url);
  return videoId ? youtubeThumbnailUrl(videoId, "mq") : null;
}

async function findImageAttachmentSrc(
  item: Zotero.Item,
): Promise<string | null> {
  for (const attId of item.getAttachments()) {
    const att = getCachedItem(attId);
    if (!att || !att.isAttachment()) {
      continue;
    }
    const contentType = (att.attachmentContentType || "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      continue;
    }
    try {
      const path = await att.getFilePathAsync();
      if (path) {
        return Zotero.File.pathToFileURI(path);
      }
    } catch {
      continue;
    }
  }
  return null;
}

function pdfThumbCacheKey(attachment: Zotero.Item): string {
  return `pdf-${attachment.libraryID}-${attachment.key}`;
}

function rememberPdfThumb(cacheKey: string, path: string): string {
  const uri = Zotero.File.pathToFileURI(path);
  pdfThumbUris.set(cacheKey, uri);
  return uri;
}

function canvasLooksBlank(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  if (width < 1 || height < 1) {
    return true;
  }
  let data: ImageData;
  try {
    data = context.getImageData(0, 0, width, height);
  } catch {
    return false;
  }
  const pixels = data.data;
  const total = width * height;
  const stride = Math.max(1, Math.floor(Math.sqrt(total / 2000)));
  let sampled = 0;
  let nonWhite = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      sampled += 1;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // Near-white / paper backgrounds don't count as content.
      if (r < 245 || g < 245 || b < 245) {
        nonWhite += 1;
      }
    }
  }
  if (sampled === 0) {
    return true;
  }
  return nonWhite / sampled < PDF_BLANK_MIN_NONWHITE;
}

async function markPdfThumbBlank(cacheKey: string): Promise<void> {
  pdfThumbMisses.add(cacheKey);
  pdfThumbUris.delete(cacheKey);
  const dir = await ensureThumbDir();
  const blankPath = joinPath(dir, `${cacheKey}.blank`);
  const jpgPath = joinPath(dir, `${cacheKey}.jpg`);
  try {
    await writeFileBytes(blankPath, new Uint8Array(0));
  } catch {
    // Ignore marker write failures.
  }
  await removeFile(jpgPath);
  const index = await loadPdfThumbIndex();
  index.delete(cacheKey);
}

async function removeFile(path: string): Promise<void> {
  try {
    if (
      typeof IOUtils !== "undefined" &&
      typeof IOUtils.remove === "function"
    ) {
      await IOUtils.remove(path, { ignoreAbsent: true });
      return;
    }
    const file = Zotero.File.pathToFile(path);
    if (file.exists()) {
      file.remove(false);
    }
  } catch {
    // Ignore cleanup failures.
  }
}

async function fileSize(path: string): Promise<number> {
  try {
    if (typeof IOUtils !== "undefined") {
      return (await IOUtils.stat(path)).size;
    }
    return Zotero.File.pathToFile(path).fileSize;
  } catch {
    return 0;
  }
}

async function imageFileLooksBlank(path: string): Promise<boolean> {
  const size = await fileSize(path);
  if (size <= 0) {
    return true;
  }
  if (size > PDF_CACHE_BLANK_CHECK_MAX_BYTES) {
    return false;
  }
  try {
    const bytes = await readFileBytes(path);
    const win = Zotero.getMainWindow() as Window & {
      createImageBitmap?: (image: Blob) => Promise<ImageBitmap>;
      Blob?: typeof Blob;
    };
    if (typeof win.createImageBitmap !== "function" || !win.Blob) {
      return size < 4000;
    }
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new win.Blob([copy], { type: "image/jpeg" });
    const bitmap = await win.createImageBitmap(blob);
    try {
      const canvas = win.document.createElement("canvas");
      canvas.width = Math.max(1, bitmap.width);
      canvas.height = Math.max(1, bitmap.height);
      const context = canvas.getContext("2d");
      if (!context) {
        return size < 4000;
      }
      context.drawImage(bitmap, 0, 0);
      return canvasLooksBlank(context, canvas.width, canvas.height);
    } finally {
      try {
        bitmap.close();
      } catch {
        // Ignore.
      }
    }
  } catch {
    return size < 4000;
  }
}

async function findCachedPdfThumb(cacheKey: string): Promise<string | null> {
  const dir = await ensureThumbDir();
  const blankPath = joinPath(dir, `${cacheKey}.blank`);
  // Older builds marked blank after page 1 only; clear so multi-page retry can run.
  if (await fileExists(blankPath)) {
    await removeFile(blankPath);
  }

  const exact = joinPath(dir, `${cacheKey}.jpg`);
  if (await fileExists(exact)) {
    if (await imageFileLooksBlank(exact)) {
      await markPdfThumbBlank(cacheKey);
      return null;
    }
    return exact;
  }

  const legacy = (await loadPdfThumbIndex()).get(cacheKey) || null;
  if (!legacy) {
    return null;
  }
  if (await imageFileLooksBlank(legacy)) {
    await markPdfThumbBlank(cacheKey);
    await removeFile(legacy);
    return null;
  }
  return legacy;
}

async function loadPdfThumbIndex(): Promise<Map<string, string>> {
  if (!pdfThumbIndex) {
    pdfThumbIndex = indexPdfThumbs();
  }
  return pdfThumbIndex;
}

async function indexPdfThumbs(): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  const dir = await ensureThumbDir();
  let children: string[] = [];
  try {
    const getChildren = (
      IOUtils as { getChildren?: (path: string) => Promise<string[]> }
    ).getChildren;
    if (typeof getChildren === "function") {
      children = await getChildren(dir);
    }
  } catch {
    return index;
  }
  for (const child of children) {
    const name = child.split(/[/\\]/).pop() || "";
    const match = name.match(/^(pdf-\d+-[A-Z0-9]+)/i);
    if (!match || !name.toLowerCase().endsWith(".jpg")) {
      continue;
    }
    const key = match[1];
    const path =
      child.includes("/") || child.includes("\\") ? child : joinPath(dir, name);
    if (name === `${key}.jpg` || !index.has(key)) {
      index.set(key, path);
    }
  }
  return index;
}

async function renderPdfPageOne(item: Zotero.Item): Promise<string | null> {
  let attachment: Zotero.Item | false | undefined;
  try {
    attachment = await item.getBestAttachment();
  } catch {
    return null;
  }
  if (!attachment || !attachment.isPDFAttachment?.()) {
    return null;
  }

  const cacheKey = pdfThumbCacheKey(attachment);
  const remembered = pdfThumbUris.get(cacheKey);
  if (remembered) {
    return remembered;
  }
  if (pdfThumbMisses.has(cacheKey)) {
    return null;
  }

  const cachedPath = await findCachedPdfThumb(cacheKey);
  if (cachedPath) {
    return rememberPdfThumb(cacheKey, cachedPath);
  }

  let path: string | false | undefined;
  try {
    path = await attachment.getFilePathAsync();
  } catch {
    path = false;
  }
  if (!path) {
    try {
      path = attachment.getFilePath();
    } catch {
      path = false;
    }
  }
  if (!path) {
    return null;
  }
  const pdfPath = path;

  const cachePath = joinPath(await ensureThumbDir(), `${cacheKey}.jpg`);
  const pdfjs = await loadPdfjs();

  return withPdfSlot(async () => {
    const queued = pdfThumbUris.get(cacheKey);
    if (queued) {
      return queued;
    }
    const queuedPath = await findCachedPdfThumb(cacheKey);
    if (queuedPath) {
      return rememberPdfThumb(cacheKey, queuedPath);
    }

    const remember = async (uri: string | null) => {
      if (!uri) {
        return null;
      }
      pdfThumbUris.set(cacheKey, uri);
      const index = await loadPdfThumbIndex();
      index.set(cacheKey, cachePath);
      return uri;
    };

    if (pdfjs) {
      try {
        const uri = await Promise.race([
          renderPdfToCache(pdfjs, pdfPath, cachePath),
          new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error("PDF thumb timed out")), 12000);
          }),
        ]);
        if (uri) {
          return remember(uri);
        }
      } catch (error) {
        ztoolkit.log("PDF page render failed:", error);
      }
    }

    try {
      const qlUri = await renderPdfViaQuickLook(pdfPath, cachePath);
      if (qlUri) {
        return remember(qlUri);
      }
    } catch (error) {
      ztoolkit.log("Quick Look PDF thumb failed:", error);
    }

    await markPdfThumbBlank(cacheKey);
    return null;
  });
}

async function renderPdfToCache(
  pdfjs: PdfjsModule,
  path: string,
  cachePath: string,
): Promise<string | null> {
  const data = await readFileBytes(path);
  const win = Zotero.getMainWindow();
  const winBytes = new (win as any).Uint8Array(data.byteLength) as Uint8Array;
  winBytes.set(data);
  const loadingTask = pdfjs.getDocument({
    data: winBytes,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  try {
    const pageCount =
      typeof pdf.numPages === "number" ? pdf.numPages : PDF_COVER_MAX_PAGES;
    const lastPage = Math.min(PDF_COVER_MAX_PAGES, Math.max(1, pageCount));
    for (let pageNumber = 1; pageNumber <= lastPage; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const unscaled = page.getViewport({ scale: 1 });
      const scale = THUMB_WIDTH / Math.max(unscaled.width, 1);
      const viewport = page.getViewport({ scale });
      const canvas = win.document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d");
      if (!context) {
        continue;
      }
      await page.render({ canvasContext: context, viewport }).promise;
      if (canvasLooksBlank(context, canvas.width, canvas.height)) {
        continue;
      }
      const jpeg = dataURLToBytes(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      await writeFileBytes(cachePath, jpeg);
      return Zotero.File.pathToFileURI(cachePath);
    }
    return null;
  } finally {
    try {
      await pdf.destroy?.();
    } catch {
      // Ignore worker cleanup errors.
    }
  }
}

/**
 * macOS Quick Look fallback for PDFs that pdf.js paints as blank
 * (common with some image-heavy publisher PDFs).
 */
async function renderPdfViaQuickLook(
  pdfPath: string,
  cachePath: string,
): Promise<string | null> {
  if (!Zotero.isMac) {
    return null;
  }
  const exec = (Zotero.Utilities as any)?.Internal?.exec;
  if (typeof exec !== "function") {
    return null;
  }

  const tmpDir = joinPath(
    await ensureThumbDir(),
    `.ql-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  );
  try {
    if (typeof IOUtils !== "undefined") {
      await IOUtils.makeDirectory(tmpDir, {
        createAncestors: true,
        ignoreExisting: true,
      });
    } else {
      await Zotero.File.createDirectoryIfMissingAsync(tmpDir);
    }

    await exec("/usr/bin/qlmanage", [
      "-t",
      "-s",
      String(Math.max(THUMB_WIDTH, 280)),
      "-o",
      tmpDir,
      pdfPath,
    ]);

    let children: string[] = [];
    try {
      const getChildren = (
        IOUtils as { getChildren?: (path: string) => Promise<string[]> }
      ).getChildren;
      if (typeof getChildren === "function") {
        children = await getChildren(tmpDir);
      }
    } catch {
      children = [];
    }
    const pngPath =
      children.find((child) => /\.png$/i.test(child)) ||
      children
        .map((child) =>
          child.includes("/") || child.includes("\\")
            ? child
            : joinPath(tmpDir, child),
        )
        .find((child) => /\.png$/i.test(child));
    if (!pngPath) {
      return null;
    }
    const resolvedPng =
      pngPath.includes("/") || pngPath.includes("\\")
        ? pngPath
        : joinPath(tmpDir, pngPath);

    const jpegUri = await rasterImageFileToJpegCache(resolvedPng, cachePath);
    return jpegUri;
  } catch (error) {
    ztoolkit.log("Quick Look PDF thumb failed:", error);
    return null;
  } finally {
    await removeFileTree(tmpDir);
  }
}

async function rasterImageFileToJpegCache(
  imagePath: string,
  cachePath: string,
): Promise<string | null> {
  const bytes = await readFileBytes(imagePath);
  if (bytes.byteLength < EPUB_COVER_MIN_BYTES) {
    return null;
  }
  const win = Zotero.getMainWindow() as Window & {
    createImageBitmap?: (image: Blob) => Promise<ImageBitmap>;
    Blob?: typeof Blob;
  };
  if (typeof win.createImageBitmap !== "function" || !win.Blob) {
    // Store the PNG bytes under the jpg cache name as a last resort.
    await writeFileBytes(cachePath, bytes);
    return Zotero.File.pathToFileURI(cachePath);
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new win.Blob([copy]);
  const bitmap = await win.createImageBitmap(blob);
  try {
    const scale = THUMB_WIDTH / Math.max(bitmap.width, 1);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = win.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    if (canvasLooksBlank(context, width, height)) {
      return null;
    }
    const jpeg = dataURLToBytes(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    await writeFileBytes(cachePath, jpeg);
    return Zotero.File.pathToFileURI(cachePath);
  } finally {
    try {
      bitmap.close();
    } catch {
      // Ignore.
    }
  }
}

async function removeFileTree(path: string): Promise<void> {
  try {
    if (typeof IOUtils !== "undefined") {
      const remove = (
        IOUtils as {
          remove?: (
            path: string,
            options?: { recursive?: boolean; ignoreAbsent?: boolean },
          ) => Promise<void>;
        }
      ).remove;
      if (typeof remove === "function") {
        await remove(path, { recursive: true, ignoreAbsent: true });
        return;
      }
    }
    const file = Zotero.File.pathToFile(path);
    if (file.exists()) {
      file.remove(true);
    }
  } catch {
    // Ignore cleanup failures.
  }
}

async function fetchWebThumbnail(item: Zotero.Item): Promise<string | null> {
  const pageUrl = getItemPageUrl(item);
  if (!pageUrl || youtubeVideoIdFromUrl(pageUrl)) {
    return null;
  }
  if (webMisses.has(pageUrl)) {
    return null;
  }

  const cacheKey = `web-${hashString(pageUrl)}`;
  const cachePath = joinPath(await ensureThumbDir(), `${cacheKey}.jpg`);
  const missPath = joinPath(await ensureThumbDir(), `${cacheKey}.missing`);
  if (await fileExists(cachePath)) {
    return Zotero.File.pathToFileURI(cachePath);
  }
  if (await fileExists(missPath)) {
    webMisses.add(pageUrl);
    return null;
  }

  return withWebSlot(async () => {
    if (await fileExists(cachePath)) {
      return Zotero.File.pathToFileURI(cachePath);
    }
    if (await fileExists(missPath)) {
      webMisses.add(pageUrl);
      return null;
    }
    try {
      const html = await readWebHtml(item, pageUrl);
      const imageUrl = html ? parseOgImage(html, pageUrl) : null;
      if (!imageUrl) {
        webMisses.add(pageUrl);
        await writeFileBytes(missPath, new Uint8Array(0));
        return null;
      }
      const saved = await downloadWebImage(imageUrl, cachePath);
      if (!saved) {
        webMisses.add(pageUrl);
        await writeFileBytes(missPath, new Uint8Array(0));
        return null;
      }
      return saved;
    } catch (error) {
      ztoolkit.log("Web thumbnail fetch failed:", error);
      webMisses.add(pageUrl);
      return null;
    }
  });
}

async function readWebHtml(
  item: Zotero.Item,
  pageUrl: string,
): Promise<string | null> {
  const fromSnapshot = await readSnapshotHtml(item);
  if (fromSnapshot) {
    return fromSnapshot;
  }
  try {
    const xhr = await Zotero.HTTP.request("GET", pageUrl, {
      timeout: 8000,
      successCodes: [200],
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
    });
    const html = String(xhr.responseText || "");
    return html ? html.slice(0, WEB_HTML_HEAD_CHARS) : null;
  } catch (error) {
    ztoolkit.log("Web HTML fetch failed:", error);
    return null;
  }
}

async function readSnapshotHtml(item: Zotero.Item): Promise<string | null> {
  for (const attId of item.getAttachments()) {
    const att = getCachedItem(attId);
    if (!att || !att.isAttachment()) {
      continue;
    }
    const isSnapshot =
      typeof att.isSnapshotAttachment === "function"
        ? att.isSnapshotAttachment()
        : false;
    const contentType = (att.attachmentContentType || "").toLowerCase();
    if (!isSnapshot && !contentType.includes("html")) {
      continue;
    }
    let path: string | false | undefined;
    try {
      path = await att.getFilePathAsync();
    } catch {
      continue;
    }
    if (!path) {
      continue;
    }
    try {
      const bytes = await readFileBytesLimited(path, WEB_HTML_HEAD_CHARS);
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch {
      continue;
    }
  }
  return null;
}

function parseOgImage(html: string, baseUrl: string): string | null {
  const win = Zotero.getMainWindow();
  try {
    const doc = new win.DOMParser().parseFromString(html, "text/html");
    const selectors = [
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'link[rel="image_src"]',
    ];
    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      const raw = el?.getAttribute("content") || el?.getAttribute("href") || "";
      const resolved = resolveHttpUrl(raw, baseUrl);
      if (resolved) {
        return resolved;
      }
    }
  } catch {
    // Fall through to regex.
  }
  const patterns = [
    /property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i,
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const resolved = match ? resolveHttpUrl(match[1], baseUrl) : null;
    if (resolved) {
      return resolved;
    }
  }
  return null;
}

function resolveHttpUrl(raw: string, baseUrl: string): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed.startsWith("data:")) {
    return null;
  }
  try {
    const url = new URL(trimmed, baseUrl);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    return null;
  }
  return null;
}

async function downloadWebImage(
  imageUrl: string,
  cachePath: string,
): Promise<string | null> {
  const xhr = await Zotero.HTTP.request("GET", imageUrl, {
    responseType: "arraybuffer",
    successCodes: [200],
    timeout: 8000,
  });
  const buffer = xhr.response as ArrayBuffer | null;
  if (!buffer || buffer.byteLength < WEB_THUMB_MIN_BYTES) {
    return null;
  }
  if (buffer.byteLength > WEB_THUMB_MAX_BYTES) {
    return null;
  }
  const bytes = new Uint8Array(buffer);
  const contentType = String(
    xhr.getResponseHeader?.("Content-Type") || "",
  ).toLowerCase();
  if (!contentType.startsWith("image/") && !looksLikeRasterImage(bytes)) {
    return null;
  }
  await writeFileBytes(cachePath, bytes);
  return Zotero.File.pathToFileURI(cachePath);
}

function looksLikeRasterImage(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const gif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  const webp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return jpeg || png || gif || webp;
}

async function readFileBytesLimited(
  path: string,
  maxBytes: number,
): Promise<Uint8Array> {
  if (typeof IOUtils !== "undefined") {
    return await IOUtils.read(path, { maxBytes });
  }
  const all = await readFileBytes(path);
  return all.length > maxBytes ? all.slice(0, maxBytes) : all;
}

async function fetchIsbnCover(item: Zotero.Item): Promise<string | null> {
  const isbns = listIsbns(item);
  if (isbns.length === 0) {
    return null;
  }

  for (const isbn of isbns) {
    if (isbnMisses.has(isbn)) {
      continue;
    }

    const cachePath = joinPath(await ensureThumbDir(), `isbn-${isbn}.jpg`);
    const missPath = joinPath(await ensureThumbDir(), `isbn-${isbn}.missing`);
    if (await fileExists(cachePath)) {
      return Zotero.File.pathToFileURI(cachePath);
    }
    if (await fileExists(missPath)) {
      isbnMisses.add(isbn);
      continue;
    }

    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
    try {
      const xhr = await Zotero.HTTP.request("GET", url, {
        responseType: "arraybuffer",
        successCodes: false,
        timeout: 8000,
      });
      const buffer = xhr.response as ArrayBuffer | null;
      const status = Number(xhr.status);
      if (
        status < 200 ||
        status >= 300 ||
        !buffer ||
        buffer.byteLength < ISBN_MIN_BYTES
      ) {
        isbnMisses.add(isbn);
        await writeFileBytes(missPath, new Uint8Array(0));
        continue;
      }
      await writeFileBytes(cachePath, new Uint8Array(buffer));
      return Zotero.File.pathToFileURI(cachePath);
    } catch (error) {
      ztoolkit.log("ISBN cover fetch failed:", error);
      isbnMisses.add(isbn);
      continue;
    }
  }
  return null;
}

function listIsbns(item: Zotero.Item): string[] {
  let raw = "";
  try {
    raw = String(item.getField("ISBN") || "");
  } catch {
    return [];
  }
  if (!raw.trim()) {
    return [];
  }

  const found: string[] = [];
  const seen = new Set<string>();
  const push = (value: string | null | undefined) => {
    if (!value) {
      return;
    }
    const digits = value.replace(/[^0-9Xx]/g, "");
    if (digits.length !== 10 && digits.length !== 13) {
      return;
    }
    if (seen.has(digits)) {
      return;
    }
    seen.add(digits);
    found.push(digits);
  };

  try {
    const cleaned = (Zotero.Utilities as any).cleanISBN?.(raw);
    push(typeof cleaned === "string" ? cleaned : null);
  } catch {
    // Fall through to regex splits.
  }

  for (const part of raw.split(/[\s,;|/]+/)) {
    push(part);
  }

  // Catch concatenated digits that cleanISBN skipped after the first ISBN.
  const digitRuns = raw.match(/(?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dXx]/g) || [];
  for (const run of digitRuns) {
    push(run);
  }

  return found;
}

async function extractEpubCover(item: Zotero.Item): Promise<string | null> {
  let attachment: Zotero.Item | null = null;
  for (const attId of item.getAttachments()) {
    const att = getCachedItem(attId);
    if (!att || !att.isAttachment()) {
      continue;
    }
    if (att.isEPUBAttachment?.()) {
      attachment = att;
      break;
    }
    const contentType = (att.attachmentContentType || "").toLowerCase();
    if (
      contentType === "application/epub+zip" ||
      contentType === "application/epub"
    ) {
      attachment = att;
      break;
    }
  }
  if (!attachment) {
    return null;
  }

  const cacheKey = `epub-${attachment.libraryID}-${attachment.key}`;
  const cachePath = joinPath(await ensureThumbDir(), `${cacheKey}.jpg`);
  const missPath = joinPath(await ensureThumbDir(), `${cacheKey}.missing`);
  if (await fileExists(cachePath)) {
    return Zotero.File.pathToFileURI(cachePath);
  }
  if (await fileExists(missPath)) {
    return null;
  }

  let path: string | false | undefined;
  try {
    path = await attachment.getFilePathAsync();
  } catch {
    path = false;
  }
  if (!path) {
    try {
      path = attachment.getFilePath();
    } catch {
      path = false;
    }
  }
  if (!path) {
    return null;
  }

  try {
    const bytes = readEpubCoverBytes(path);
    if (!bytes || bytes.byteLength < EPUB_COVER_MIN_BYTES) {
      await writeFileBytes(missPath, new Uint8Array(0));
      return null;
    }
    await writeFileBytes(cachePath, bytes);
    return Zotero.File.pathToFileURI(cachePath);
  } catch (error) {
    ztoolkit.log("EPUB cover extract failed:", error);
    await writeFileBytes(missPath, new Uint8Array(0));
    return null;
  }
}

function readEpubCoverBytes(epubPath: string): Uint8Array | null {
  const zipReader = Components.classes[
    "@mozilla.org/libjar/zip-reader;1"
  ].createInstance(Components.interfaces.nsIZipReader);
  zipReader.open(Zotero.File.pathToFile(epubPath));
  try {
    const entries: string[] = [];
    const enumerator = zipReader.findEntries("*");
    while (enumerator.hasMore()) {
      entries.push(enumerator.getNext());
    }

    const opfPath =
      findEpubOpfPath(zipReader, entries) ||
      entries.find((entry) => /\.opf$/i.test(entry)) ||
      null;
    let coverEntry: string | null = null;
    if (opfPath) {
      const opfXml = readZipEntryText(zipReader, opfPath);
      coverEntry = resolveEpubCoverEntry(opfXml, opfPath, entries);
    }
    if (!coverEntry) {
      coverEntry =
        entries.find((entry) =>
          /(?:^|\/)cover\.(jpe?g|png|webp|gif)$/i.test(entry),
        ) ||
        entries.find((entry) =>
          /(?:^|\/)Images\/0\.(jpe?g|png)$/i.test(entry),
        ) ||
        null;
    }
    if (!coverEntry || !zipReader.hasEntry(coverEntry)) {
      return null;
    }
    return readZipEntryBytes(zipReader, coverEntry);
  } finally {
    try {
      zipReader.close();
    } catch {
      // Ignore.
    }
  }
}

function findEpubOpfPath(
  zipReader: { hasEntry: (name: string) => boolean },
  entries: string[],
): string | null {
  const containerPath = entries.find(
    (entry) =>
      entry.replace(/\\/g, "/").toLowerCase() === "meta-inf/container.xml",
  );
  if (!containerPath || !zipReader.hasEntry(containerPath)) {
    return null;
  }
  try {
    const xml = readZipEntryText(zipReader as any, containerPath);
    const match = xml.match(/full-path=["']([^"']+)["']/i);
    return match?.[1]?.replace(/\\/g, "/") || null;
  } catch {
    return null;
  }
}

function resolveEpubCoverEntry(
  opfXml: string,
  opfPath: string,
  entries: string[],
): string | null {
  const opfDir = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
    : "";

  const resolveHref = (href: string): string | null => {
    const cleaned = href.trim().replace(/^\.\//, "");
    if (!cleaned) {
      return null;
    }
    const joined = `${opfDir}${cleaned}`.replace(/\\/g, "/");
    if (entries.includes(joined)) {
      return joined;
    }
    const matched = entries.find(
      (entry) => entry.replace(/\\/g, "/") === joined,
    );
    return matched || null;
  };

  const itemHrefById = new Map<string, string>();
  const itemTagRe = /<item\b[^>]*>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemTagRe.exec(opfXml))) {
    const tag = itemMatch[0];
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (id && href) {
      itemHrefById.set(id, href);
    }
    if (/\bproperties=["'][^"']*\bcover-image\b[^"']*["']/i.test(tag) && href) {
      const resolved = resolveHref(href);
      if (resolved) {
        return resolved;
      }
    }
  }

  const coverMeta =
    opfXml.match(
      /<meta\b[^>]*\bname=["']cover["'][^>]*\bcontent=["']([^"']+)["'][^>]*\/?>/i,
    ) ||
    opfXml.match(
      /<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bname=["']cover["'][^>]*\/?>/i,
    );
  if (coverMeta?.[1]) {
    const href = itemHrefById.get(coverMeta[1]) || coverMeta[1];
    const resolved = resolveHref(href);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function readZipEntryText(
  zipReader: {
    getInputStream: (name: string) => unknown;
  },
  entryName: string,
): string {
  const stream = zipReader.getInputStream(entryName) as {
    available: () => number;
  };
  const sis = Components.classes[
    "@mozilla.org/scriptableinputstream;1"
  ].createInstance(Components.interfaces.nsIScriptableInputStream);
  sis.init(stream);
  try {
    return sis.read(stream.available());
  } finally {
    try {
      sis.close();
    } catch {
      // Ignore.
    }
  }
}

function readZipEntryBytes(
  zipReader: {
    getInputStream: (name: string) => unknown;
  },
  entryName: string,
): Uint8Array {
  const stream = zipReader.getInputStream(entryName);
  const bis = Components.classes[
    "@mozilla.org/binaryinputstream;1"
  ].createInstance(Components.interfaces.nsIBinaryInputStream);
  bis.setInputStream(stream);
  const size = bis.available();
  const values = bis.readByteArray(size) as number[];
  return Uint8Array.from(values);
}

async function loadPdfjs(): Promise<PdfjsModule | null> {
  if (pdfjsModule !== undefined) {
    return pdfjsModule;
  }
  if (!pdfjsLoad) {
    pdfjsLoad = importPdfjs();
  }
  return pdfjsLoad;
}

async function importPdfjs(): Promise<PdfjsModule | null> {
  const win = Zotero.getMainWindow() as Window & {
    ChromeUtils?: typeof ChromeUtils;
  };
  const loader = win.ChromeUtils || ChromeUtils;
  if (!loader?.importESModule) {
    pdfjsModule = null;
    return null;
  }
  for (const path of PDFJS_CANDIDATES) {
    try {
      const imported = loader.importESModule(path, {
        global: "current",
      });
      const mod = unwrapPdfjs(imported);
      if (!mod?.getDocument) {
        continue;
      }
      if (mod.GlobalWorkerOptions) {
        for (const workerSrc of PDFJS_WORKER_CANDIDATES) {
          try {
            mod.GlobalWorkerOptions.workerSrc = workerSrc;
            break;
          } catch {
            continue;
          }
        }
      }
      pdfjsModule = mod;
      return mod;
    } catch {
      continue;
    }
  }
  ztoolkit.log("Could not import Zotero PDF.js; gallery will skip PDF thumbs");
  pdfjsModule = null;
  return null;
}

function unwrapPdfjs(mod: Record<string, any>): PdfjsModule | null {
  if (mod?.getDocument) {
    return mod as PdfjsModule;
  }
  if (mod?.pdfjsLib?.getDocument) {
    return mod.pdfjsLib as PdfjsModule;
  }
  if (mod?.default?.getDocument) {
    return mod.default as PdfjsModule;
  }
  return null;
}

async function withPdfSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (pdfActive >= PDF_RENDER_CONCURRENCY) {
    await new Promise<void>((resolve) => {
      pdfWaiters.push(resolve);
    });
  }
  pdfActive += 1;
  try {
    return await fn();
  } finally {
    pdfActive -= 1;
    pdfWaiters.shift()?.();
  }
}

async function withWebSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (webActive >= WEB_FETCH_CONCURRENCY) {
    await new Promise<void>((resolve) => {
      webWaiters.push(resolve);
    });
  }
  webActive += 1;
  try {
    return await fn();
  } finally {
    webActive -= 1;
    webWaiters.shift()?.();
  }
}

async function ensureThumbDir(): Promise<string> {
  if (!thumbDirReady) {
    thumbDirReady = (async () => {
      const dir = joinPath(Zotero.DataDirectory.dir, THUMB_DIR_NAME);
      if (typeof IOUtils !== "undefined") {
        await IOUtils.makeDirectory(dir, {
          createAncestors: true,
          ignoreExisting: true,
        });
      } else {
        await Zotero.File.createDirectoryIfMissingAsync(dir);
      }
      return dir;
    })();
  }
  return thumbDirReady;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    if (typeof IOUtils !== "undefined") {
      return await IOUtils.exists(path);
    }
    return Zotero.File.pathToFile(path).exists();
  } catch {
    return false;
  }
}

async function readFileBytes(path: string): Promise<Uint8Array> {
  if (typeof IOUtils !== "undefined") {
    return await IOUtils.read(path);
  }
  const str = await Zotero.File.getBinaryContentsAsync(path);
  const data = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    data[i] = str.charCodeAt(i) & 0xff;
  }
  return data;
}

async function writeFileBytes(path: string, data: Uint8Array): Promise<void> {
  if (typeof IOUtils !== "undefined") {
    await IOUtils.write(path, data);
    return;
  }
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  await Zotero.File.putContentsAsync(path, copy.buffer);
}

function dataURLToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
