import { getCachedItem } from "./cache";
import { youtubeThumbnailUrl, youtubeUrlFromItem, youtubeVideoIdFromUrl } from "./youtube";

const THUMB_DIR_NAME = "syllabus-gallery-thumbs";
const THUMB_WIDTH = 280;
const JPEG_QUALITY = 0.82;
const PDF_RENDER_CONCURRENCY = 2;
const WEB_FETCH_CONCURRENCY = 2;
const ISBN_MIN_BYTES = 1000;
const WEB_THUMB_MIN_BYTES = 1500;
const WEB_THUMB_MAX_BYTES = 2_500_000;
const WEB_HTML_HEAD_CHARS = 100_000;

const WEB_GALLERY_ITEM_TYPES = new Set([
  "webpage",
  "blogPost",
  "newspaperArticle",
]);

const VIDEO_GALLERY_ITEM_TYPES = new Set(["film", "videoRecording"]);

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
  | { kind: "image"; src: string; fit: CoverFit }
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
  try {
    return (item.getField("title") || "").trim() || "Untitled";
  } catch {
    return "Untitled";
  }
}

function itemCreator(item: Zotero.Item): string {
  try {
    return (item.firstCreator || item.getField("firstCreator") || "").trim();
  } catch {
    return "";
  }
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
      String(item.getField("publicationTitle") || "").trim()
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
  return VIDEO_HOSTS.some(
    (site) => host === site || host.endsWith(`.${site}`),
  );
}

export function isVideoGalleryItem(item: Zotero.Item): boolean {
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
    creator: itemCreator(item),
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
    return { kind: "image", src: imageSrc, fit: "cover" };
  }

  const youtubeSrc = findYoutubeThumb(item);
  if (youtubeSrc) {
    return { kind: "image", src: youtubeSrc, fit: "cover" };
  }

  if (isWebGalleryItem(item) || isVideoGalleryItem(item)) {
    const webSrc = await fetchWebThumbnail(item);
    if (webSrc) {
      return { kind: "image", src: webSrc, fit: "cover" };
    }
  }

  const pdfSrc = await renderPdfPageOne(item);
  if (pdfSrc) {
    return { kind: "image", src: pdfSrc, fit: "contain" };
  }

  const isbnSrc = await fetchIsbnCover(item);
  if (isbnSrc) {
    return { kind: "image", src: isbnSrc, fit: "cover" };
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

async function findCachedPdfThumb(cacheKey: string): Promise<string | null> {
  const exact = joinPath(await ensureThumbDir(), `${cacheKey}.jpg`);
  if (await fileExists(exact)) {
    return exact;
  }
  return (await loadPdfThumbIndex()).get(cacheKey) || null;
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
      child.includes("/") || child.includes("\\")
        ? child
        : joinPath(dir, name);
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

  const pdfjs = await loadPdfjs();
  if (!pdfjs) {
    return null;
  }

  const cachePath = joinPath(await ensureThumbDir(), `${cacheKey}.jpg`);
  return withPdfSlot(async () => {
    const queued = pdfThumbUris.get(cacheKey);
    if (queued) {
      return queued;
    }
    const queuedPath = await findCachedPdfThumb(cacheKey);
    if (queuedPath) {
      return rememberPdfThumb(cacheKey, queuedPath);
    }
    try {
      const uri = await Promise.race([
        renderPdfToCache(pdfjs, pdfPath, cachePath),
        new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error("PDF thumb timed out")), 12000);
        }),
      ]);
      if (uri) {
        pdfThumbUris.set(cacheKey, uri);
        const index = await loadPdfThumbIndex();
        index.set(cacheKey, cachePath);
        return uri;
      }
      pdfThumbMisses.add(cacheKey);
      return null;
    } catch (error) {
      ztoolkit.log("PDF page-1 render failed:", error);
      pdfThumbMisses.add(cacheKey);
      return null;
    }
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
    const page = await pdf.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const scale = THUMB_WIDTH / Math.max(unscaled.width, 1);
    const viewport = page.getViewport({ scale });
    const canvas = win.document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    await page.render({ canvasContext: context, viewport }).promise;
    const jpeg = dataURLToBytes(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    await writeFileBytes(cachePath, jpeg);
    return Zotero.File.pathToFileURI(cachePath);
  } finally {
    try {
      await pdf.destroy?.();
    } catch {
      // Ignore worker cleanup errors.
    }
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
      const raw =
        el?.getAttribute("content") || el?.getAttribute("href") || "";
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
  const isbn = cleanIsbn(item);
  if (!isbn || isbnMisses.has(isbn)) {
    return null;
  }

  const cachePath = joinPath(await ensureThumbDir(), `isbn-${isbn}.jpg`);
  const missPath = joinPath(await ensureThumbDir(), `isbn-${isbn}.missing`);
  if (await fileExists(cachePath)) {
    return Zotero.File.pathToFileURI(cachePath);
  }
  if (await fileExists(missPath)) {
    isbnMisses.add(isbn);
    return null;
  }

  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
  try {
    const xhr = await Zotero.HTTP.request("GET", url, {
      responseType: "arraybuffer",
      successCodes: [200, 404],
      timeout: 8000,
    });
    const buffer = xhr.response as ArrayBuffer | null;
    if (xhr.status !== 200 || !buffer || buffer.byteLength < ISBN_MIN_BYTES) {
      isbnMisses.add(isbn);
      await writeFileBytes(missPath, new Uint8Array(0));
      return null;
    }
    await writeFileBytes(cachePath, new Uint8Array(buffer));
    return Zotero.File.pathToFileURI(cachePath);
  } catch (error) {
    ztoolkit.log("ISBN cover fetch failed:", error);
    isbnMisses.add(isbn);
    return null;
  }
}

function cleanIsbn(item: Zotero.Item): string | null {
  let raw = "";
  try {
    raw = String(item.getField("ISBN") || "");
  } catch {
    return null;
  }
  if (!raw.trim()) {
    return null;
  }
  try {
    const cleaned = (Zotero.Utilities as any).cleanISBN?.(raw);
    if (typeof cleaned === "string" && cleaned.length >= 10) {
      return cleaned.replace(/[^0-9Xx]/g, "");
    }
  } catch {
    // Fall through to a local cleanup.
  }
  const digits = raw.replace(/[^0-9Xx]/g, "");
  return digits.length === 10 || digits.length === 13 ? digits : null;
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
