/**
 * Build a 1200×630 JPEG collage of syllabus item covers for Open Graph cards.
 */

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const GAP = 8;
const BG = "#f3f4f6";
const JPEG_QUALITY = 0.85;
const MAX_COVERS = 4;
const IMAGE_LOAD_MS = 2500;
const BUILD_BUDGET_MS = 8000;

function dataURLToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function imageIsUsable(img: HTMLImageElement): boolean {
  return (img.naturalWidth || img.width) > 0;
}

function srcLooksLoadable(src: string): boolean {
  return (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    /^https?:\/\//i.test(src) ||
    /^file:/i.test(src) ||
    /^chrome:/i.test(src) ||
    /^zotero:/i.test(src)
  );
}

/** Prefer already-decoded cover <img> nodes from the live syllabus page. */
export function collectPublishCoverImages(root: ParentNode): HTMLImageElement[] {
  const imgs = Array.from(
    root.querySelectorAll(
      ".syllabus-item-thumbnail-cover img, .syllabus-item-thumbnail img",
    ),
  ) as HTMLImageElement[];
  const out: HTMLImageElement[] = [];
  const seen = new Set<string>();
  for (const img of imgs) {
    const src = (img.getAttribute("src") || img.currentSrc || "").trim();
    if (!src || !srcLooksLoadable(src) || seen.has(src)) continue;
    if (!imageIsUsable(img) && !img.complete) continue;
    if (!imageIsUsable(img)) continue;
    seen.add(src);
    out.push(img);
    if (out.length >= MAX_COVERS) break;
  }
  return out;
}

/** Collect cover image URLs (fallback when DOM images are not yet decoded). */
export function collectPublishCoverSrcs(root: ParentNode): string[] {
  const imgs = Array.from(
    root.querySelectorAll(
      ".syllabus-item-thumbnail-cover img, .syllabus-item-thumbnail img",
    ),
  ) as HTMLImageElement[];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const img of imgs) {
    const src = (img.getAttribute("src") || img.currentSrc || "").trim();
    if (!src || !srcLooksLoadable(src) || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
    if (out.length >= MAX_COVERS) break;
  }
  return out;
}

function loadImage(
  doc: Document,
  src: string,
  timeoutMs = IMAGE_LOAD_MS,
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = doc.createElement("img");
    img.decoding = "async";
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      winClearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(ok && imageIsUsable(img) ? img : null);
    };
    const timer = winSetTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    try {
      img.src = src;
    } catch {
      finish(false);
    }
  });
}

function winSetTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
  return setTimeout(fn, ms);
}

function winClearTimeout(id: ReturnType<typeof setTimeout>): void {
  clearTimeout(id);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || w <= 0 || h <= 0) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  try {
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  } catch {
    // Tainted canvas / draw failure — skip this tile.
  }
}

type Rect = { x: number; y: number; w: number; h: number };

function layoutRects(count: number): Rect[] {
  const W = OG_WIDTH;
  const H = OG_HEIGHT;
  const g = GAP;
  if (count <= 1) {
    return [{ x: 0, y: 0, w: W, h: H }];
  }
  if (count === 2) {
    const w = (W - g) / 2;
    return [
      { x: 0, y: 0, w, h: H },
      { x: w + g, y: 0, w, h: H },
    ];
  }
  if (count === 3) {
    const leftW = (W - g) * 0.55;
    const rightW = W - g - leftW;
    const rightH = (H - g) / 2;
    return [
      { x: 0, y: 0, w: leftW, h: H },
      { x: leftW + g, y: 0, w: rightW, h: rightH },
      { x: leftW + g, y: rightH + g, w: rightW, h: rightH },
    ];
  }
  const w = (W - g) / 2;
  const h = (H - g) / 2;
  return [
    { x: 0, y: 0, w, h },
    { x: w + g, y: 0, w, h },
    { x: 0, y: h + g, w, h },
    { x: w + g, y: h + g, w, h },
  ];
}

/** Content fingerprint for skip-unchanged uploads. */
export function bytesContentFingerprint(bytes: Uint8Array): string {
  let h = bytes.byteLength >>> 0;
  const step = Math.max(1, Math.floor(bytes.byteLength / 64));
  for (let i = 0; i < bytes.byteLength; i += step) {
    h = (Math.imul(h, 31) + bytes[i]) >>> 0;
  }
  if (bytes.byteLength > 0) {
    h = (Math.imul(h, 31) + bytes[bytes.byteLength - 1]) >>> 0;
  }
  return `${bytes.byteLength}:${h.toString(16)}`;
}

function renderCollage(
  doc: Document,
  loaded: HTMLImageElement[],
): Uint8Array | null {
  if (!loaded.length) return null;
  const canvas = doc.createElement("canvas");
  canvas.width = OG_WIDTH;
  canvas.height = OG_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  const rects = layoutRects(loaded.length);
  loaded.forEach((img, i) => {
    const r = rects[i];
    if (!r) return;
    drawCover(ctx, img, r.x, r.y, r.w, r.h);
  });

  try {
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const bytes = dataURLToBytes(dataUrl);
    return bytes.byteLength > 0 ? bytes : null;
  } catch (err) {
    ztoolkit.log("OG collage toDataURL failed:", err);
    return null;
  }
}

/**
 * Render up to 4 covers into a 1200×630 JPEG. Returns null if no images load.
 * Hard-capped so a hung image load cannot stall publish.
 */
export async function buildPublishOgImageJpeg(
  root: ParentNode,
): Promise<Uint8Array | null> {
  const work = async (): Promise<Uint8Array | null> => {
    const doc =
      (root as Document).defaultView?.document ||
      (root as Element).ownerDocument ||
      (typeof document !== "undefined" ? document : null);
    if (!doc?.defaultView) return null;

    // Fast path: use covers already painted in the syllabus view.
    const fromDom = collectPublishCoverImages(root);
    if (fromDom.length) {
      return renderCollage(doc, fromDom.slice(0, MAX_COVERS));
    }

    const srcs = collectPublishCoverSrcs(root);
    if (!srcs.length) return null;

    const loaded: HTMLImageElement[] = [];
    for (const src of srcs) {
      const img = await loadImage(doc, src);
      if (img) loaded.push(img);
      if (loaded.length >= MAX_COVERS) break;
    }
    return renderCollage(doc, loaded);
  };

  try {
    return await Promise.race([
      work(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), BUILD_BUDGET_MS);
      }),
    ]);
  } catch (err) {
    ztoolkit.log("buildPublishOgImageJpeg failed:", err);
    return null;
  }
}

export const PUBLISH_OG_IMAGE = "og-image.jpg";

/** Syllabus description for share cards (description field, else masthead). */
export function extractPublishShareDescription(root: ParentNode): string {
  const descEl = root.querySelector(".syllabus-collection-description");
  const fromDesc = (descEl?.textContent || "").replace(/\s+/g, " ").trim();
  if (fromDesc) {
    return truncateShareText(fromDesc, 300);
  }
  const meta = root.querySelector(".syllabus-masthead-meta");
  const fromMeta = (meta?.textContent || "")
    .replace(/\s+/g, " ")
    .replace(/\s*·\s*/g, " · ")
    .trim();
  const withoutPublished = fromMeta
    .replace(
      /\s*·\s*published\s+\d{1,2}\s+\w+\s+\d{4}\s+at\s+\d{1,2}\.\d{2}[ap]m/i,
      "",
    )
    .trim();
  return truncateShareText(withoutPublished, 300);
}

function truncateShareText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}
