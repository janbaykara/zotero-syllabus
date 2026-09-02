import { getCachedItem } from "./cache";

export type ItemHighlight = {
  id: number;
  text: string;
  color: string;
};

export const HIGHLIGHT_MIN_CHARS = 16;
export const HIGHLIGHT_PREFERRED_MIN = 40;
export const DEFAULT_HIGHLIGHT_COLOR = "#ffd400";

const highlightMemo = new Map<
  number,
  { stamp: string; promise: Promise<ItemHighlight[]> }
>();

function highlightStamp(item: Zotero.Item): string {
  let attachments = "";
  try {
    for (const id of item.getAttachments()) {
      const att = getCachedItem(id);
      if (!att) {
        attachments += `${id};`;
        continue;
      }
      let n = "";
      try {
        n =
          typeof att.numAnnotations === "function"
            ? String(att.numAnnotations())
            : "";
      } catch {
        n = "";
      }
      attachments += `${att.key}:${att.dateModified || ""}:${n};`;
    }
  } catch {
    attachments = "";
  }
  return `${item.id}:${item.dateModified || ""}:${attachments}`;
}

/** Collapse PDF extraction gaps, including spaced-out letter runs. */
export function cleanHighlightText(raw: string): string {
  const text = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "";
  }
  return text.replace(/\b(?:[\p{L}\p{M}] ){2,}[\p{L}\p{M}]\b/gu, (chunk) =>
    chunk.replace(/ /g, ""),
  );
}

export function normalizeHighlightColor(color: string): string {
  const hex = String(color || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return DEFAULT_HIGHLIGHT_COLOR;
}

export function truncateHighlightText(text: string, maxChars: number): string {
  if (maxChars <= 0 || text.length <= maxChars) {
    return text;
  }
  const slice = text.slice(0, maxChars);
  const cut = slice.lastIndexOf(" ");
  const base = (cut > maxChars * 0.6 ? slice.slice(0, cut) : slice).replace(
    /[.,;:]+$/u,
    "",
  );
  return `${base}\u2026`;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  const rng = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

function diversifyByColor<T extends { color: string }>(
  items: T[],
  count: number,
): T[] {
  const picked: T[] = [];
  const usedColors = new Set<string>();
  for (const item of items) {
    if (picked.length >= count) {
      break;
    }
    if (usedColors.has(item.color)) {
      continue;
    }
    usedColors.add(item.color);
    picked.push(item);
  }
  for (const item of items) {
    if (picked.length >= count) {
      break;
    }
    if (picked.includes(item)) {
      continue;
    }
    picked.push(item);
  }
  return picked;
}

/**
 * Stable random sample: seeded shuffle, prefer sentence-length highlights,
 * then keep distinct annotation colours when possible.
 */
export function pickHighlightSample<
  T extends { id: number; text: string; color: string },
>(highlights: T[], count: number, seed: number): T[] {
  if (count <= 0 || highlights.length === 0) {
    return [];
  }
  const preferred = highlights.filter(
    (highlight) => highlight.text.length >= HIGHLIGHT_PREFERRED_MIN,
  );
  const pool = preferred.length >= count ? preferred : highlights;
  return diversifyByColor(seededShuffle(pool, seed), count);
}

function isHighlightAnnotation(ann: Zotero.Item): boolean {
  const type = ann.annotationType as unknown;
  return type === "highlight" || type === 1;
}

async function annotationsForAttachment(
  att: Zotero.Item,
): Promise<Zotero.Item[]> {
  if (typeof att.isFileAttachment !== "function" || !att.isFileAttachment()) {
    return [];
  }
  if (typeof att.getAnnotations !== "function") {
    return [];
  }
  try {
    return att.getAnnotations(false) || [];
  } catch {
    try {
      await att.loadDataType("childItems");
      return att.getAnnotations(false) || [];
    } catch {
      return [];
    }
  }
}

async function collectItemHighlights(
  item: Zotero.Item,
): Promise<ItemHighlight[]> {
  let ids: number[] = [];
  try {
    ids = item.getAttachments();
  } catch {
    return [];
  }
  const out: ItemHighlight[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const att = getCachedItem(id);
    if (!att) {
      continue;
    }
    const annotations = await annotationsForAttachment(att);
    for (const ann of annotations) {
      try {
        if (ann.deleted || !isHighlightAnnotation(ann)) {
          continue;
        }
        const text = cleanHighlightText(String(ann.annotationText || ""));
        if (text.length < HIGHLIGHT_MIN_CHARS) {
          continue;
        }
        const key = text.toLowerCase();
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        out.push({
          id: ann.id,
          text,
          color: normalizeHighlightColor(String(ann.annotationColor || "")),
        });
      } catch {
        // Skip unreadable annotation rows.
      }
    }
  }
  return out;
}

export function getItemHighlightSample(
  item: Zotero.Item,
  options: { count: number; maxChars: number },
): Promise<ItemHighlight[]> {
  const count = Math.max(0, options.count);
  const maxChars = Math.max(0, options.maxChars);
  if (count === 0) {
    return Promise.resolve([]);
  }
  const stamp = `${highlightStamp(item)}:${count}:${maxChars}`;
  const cached = highlightMemo.get(item.id);
  if (cached && cached.stamp === stamp) {
    return cached.promise;
  }
  const promise = collectItemHighlights(item)
    .then((all) =>
      pickHighlightSample(all, count, item.id).map((highlight) => ({
        ...highlight,
        text: truncateHighlightText(highlight.text, maxChars),
      })),
    )
    .catch((error) => {
      ztoolkit.log("getItemHighlightSample failed:", error);
      return [];
    });
  highlightMemo.set(item.id, { stamp, promise });
  return promise;
}
