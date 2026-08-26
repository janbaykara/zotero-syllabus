import { getCachedItem } from "./cache";
import { youtubeThumbnailUrl, youtubeVideoIdFromUrl } from "./youtube";

const THUMB_DIR_NAME = "syllabus-gallery-thumbs";
const THUMB_WIDTH = 280;
const JPEG_QUALITY = 0.82;
const PDF_RENDER_CONCURRENCY = 2;
const ISBN_MIN_BYTES = 1000;

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
const isbnMisses = new Set<string>();
let pdfjsModule: PdfjsModule | null | undefined;
let pdfjsLoad: Promise<PdfjsModule | null> | null = null;
let thumbDirReady: Promise<string> | null = null;
let pdfActive = 0;
const pdfWaiters: Array<() => void> = [];

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
  return `${item.id}:${item.dateModified || ""}`;
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

  const pdfSrc = await renderPdfPageOne(item);
  if (pdfSrc) {
    return { kind: "image", src: pdfSrc, fit: "contain" };
  }

  const youtubeSrc = findYoutubeThumb(item);
  if (youtubeSrc) {
    return { kind: "image", src: youtubeSrc, fit: "cover" };
  }

  const isbnSrc = await fetchIsbnCover(item);
  if (isbnSrc) {
    return { kind: "image", src: isbnSrc, fit: "cover" };
  }

  return getPlaceholderCover(item);
}

function findYoutubeThumb(item: Zotero.Item): string | null {
  try {
    const url = item.getField("url");
    const videoId = youtubeVideoIdFromUrl(url);
    if (videoId) {
      return youtubeThumbnailUrl(videoId);
    }
  } catch {
    // Field may be missing for this item type.
  }
  return null;
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

  let path: string | false;
  try {
    path = await attachment.getFilePathAsync();
  } catch {
    return null;
  }
  if (!path) {
    return null;
  }

  const mtime = await fileMtime(path);
  const cachePath = joinPath(
    await ensureThumbDir(),
    `pdf-${attachment.libraryID}-${attachment.key}-${mtime}.jpg`,
  );
  if (await fileExists(cachePath)) {
    return Zotero.File.pathToFileURI(cachePath);
  }

  const pdfjs = await loadPdfjs();
  if (!pdfjs) {
    return null;
  }

  return withPdfSlot(async () => {
    if (await fileExists(cachePath)) {
      return Zotero.File.pathToFileURI(cachePath);
    }
    try {
      return await Promise.race([
        renderPdfToCache(pdfjs, path, cachePath),
        new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error("PDF thumb timed out")), 12000);
        }),
      ]);
    } catch (error) {
      ztoolkit.log("PDF page-1 render failed:", error);
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

async function fileMtime(path: string): Promise<number> {
  try {
    if (typeof IOUtils !== "undefined") {
      const stat = await IOUtils.stat(path);
      return stat.lastModified;
    }
    return Zotero.File.pathToFile(path).lastModifiedTime;
  } catch {
    return 0;
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
