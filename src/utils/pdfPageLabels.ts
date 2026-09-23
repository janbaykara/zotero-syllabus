/** PDF catalog page labels: Cover / i, ii, iii / 1, 2, 3. */

export type PdfPageLabelStyle = {
  prefix?: string;
  style?: "D" | "R" | "r" | "A" | "a";
  start?: number;
};

export type PdfPageLabelRange = {
  start: number;
  style: PdfPageLabelStyle;
};

const ROMAN = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
] as const;

export function formatPdfPageLabel(
  offset: number,
  style: PdfPageLabelStyle,
): string {
  const n = Math.max(1, (style.start ?? 1) + offset);
  let body = "";
  if (style.style === "D") {
    body = String(n);
  } else if (style.style === "R" || style.style === "r") {
    body = toRoman(n);
    if (style.style === "R") {
      body = body.toUpperCase();
    }
  } else if (style.style === "A" || style.style === "a") {
    body = toAlpha(n);
    if (style.style === "A") {
      body = body.toUpperCase();
    }
  }
  return `${style.prefix || ""}${body}`;
}

function toRoman(value: number): string {
  let n = value;
  let out = "";
  for (const [amount, glyph] of ROMAN) {
    while (n >= amount) {
      out += glyph;
      n -= amount;
    }
  }
  return out;
}

function toAlpha(value: number): string {
  let n = value;
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

export function expandPdfPageLabelRanges(
  ranges: PdfPageLabelRange[],
  pageCount: number,
): string[] {
  const ordered = [...ranges].sort((a, b) => a.start - b.start);
  const labels: string[] = [];
  for (let index = 0; index < pageCount; index++) {
    let active = ordered[0];
    for (const range of ordered) {
      if (range.start <= index) {
        active = range;
      }
    }
    if (!active) {
      labels.push(String(index + 1));
      continue;
    }
    labels.push(formatPdfPageLabel(index - active.start, active.style));
  }
  return labels;
}

export function pageIndexForPrintedLabel(
  labels: string[],
  printed: string,
): number | undefined {
  const want = printed.trim();
  if (!want) {
    return undefined;
  }
  const index = labels.findIndex((label) => label === want);
  return index >= 0 ? index : undefined;
}

export function parsePageLabelStyleDict(raw: string): PdfPageLabelStyle {
  const text = raw.replace(/\s+/g, " ");
  const style: PdfPageLabelStyle = {};
  const prefix = text.match(/\/P\s*\((?:\\\)|[^)])*\)/);
  if (prefix) {
    style.prefix = prefix[0]
      .replace(/^\/P\s*\(/, "")
      .replace(/\)$/, "")
      .replace(/\\([()\\])/g, "$1");
  }
  const kind = text.match(/\/S\s*\/([DRrAa])/);
  if (kind) {
    style.style = kind[1] as PdfPageLabelStyle["style"];
  }
  const start = text.match(/\/St\s+(\d+)/);
  if (start) {
    style.start = Number(start[1]);
  }
  return style;
}

/**
 * Parse a `/Nums [0 << /P (Cover) >> 1 << /S /r >> 11 << /S /D >>]` array,
 * resolving `N 0 R` from a same-stream object map when provided.
 */
export function parsePdfPageLabelNums(
  nums: string,
  objects?: ReadonlyMap<number, string>,
): PdfPageLabelRange[] {
  const ranges: PdfPageLabelRange[] = [];
  const token = /(?:<<.*?>>)|(?:\d+\s+0\s+R)|(?:\d+)/gs;
  const parts = nums.match(token) || [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const start = Number(parts[i]);
    if (!Number.isFinite(start)) {
      continue;
    }
    const spec = parts[i + 1];
    let dict = spec;
    const ref = spec.match(/^(\d+)\s+0\s+R$/);
    if (ref && objects) {
      dict = objects.get(Number(ref[1])) || "";
    }
    if (!dict.includes("<<")) {
      continue;
    }
    ranges.push({ start, style: parsePageLabelStyleDict(dict) });
  }
  return ranges;
}

function objectMapFromObjStm(
  decoded: string,
  first: number,
): Map<number, string> {
  const index = decoded.slice(0, first);
  const body = decoded.slice(first);
  const parts = index.trim().split(/\s+/);
  const pairs: Array<{ id: number; offset: number }> = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const id = Number(parts[i]);
    const offset = Number(parts[i + 1]);
    if (Number.isFinite(id) && Number.isFinite(offset)) {
      pairs.push({ id, offset });
    }
  }
  const map = new Map<number, string>();
  for (let i = 0; i < pairs.length; i++) {
    const end = i + 1 < pairs.length ? pairs[i + 1].offset : body.length;
    map.set(pairs[i].id, body.slice(pairs[i].offset, end));
  }
  return map;
}

function trimPdfStream(data: Uint8Array): Uint8Array {
  let end = data.length;
  while (end > 0 && (data[end - 1] === 10 || data[end - 1] === 13)) {
    end -= 1;
  }
  return end === data.length ? data : data.subarray(0, end);
}

async function inflateOnce(
  data: Uint8Array,
  encoding: "deflate" | "deflate-raw",
): Promise<string | null> {
  if (typeof DecompressionStream !== "function") {
    return null;
  }
  try {
    const stream = new DecompressionStream(encoding);
    const writer = stream.writable.getWriter();
    await writer.write(data);
    await writer.close();
    const reader = stream.readable.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        chunks.push(value);
      }
    }
    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder("latin1").decode(merged);
  } catch {
    return null;
  }
}

async function inflateFlate(data: Uint8Array): Promise<string | null> {
  const encodings = ["deflate", "deflate-raw"] as const;
  const variants = [data, trimPdfStream(data)];
  for (const encoding of encodings) {
    for (const slice of variants) {
      const inflated = await inflateOnce(slice, encoding);
      if (inflated) {
        return inflated;
      }
    }
  }
  return null;
}

function findUncompressedNums(pdf: string): string | null {
  const match = pdf.match(/\/PageLabels\b[\s\S]{0,400}\/Nums\s*\[([\s\S]*?)\]/);
  return match ? match[1] : null;
}

/**
 * Best-effort catalog page labels from PDF bytes. Empty when the file has
 * no `/PageLabels` (or they are too compressed to read here).
 */
export async function readPdfPageLabels(
  bytes: Uint8Array,
  pageCount = 80,
): Promise<string[] | null> {
  const asLatin = new TextDecoder("latin1").decode(bytes);
  const uncompressed = findUncompressedNums(asLatin);
  if (uncompressed) {
    const ranges = parsePdfPageLabelNums(uncompressed);
    if (ranges.length) {
      return expandPdfPageLabelRanges(ranges, pageCount);
    }
  }

  const streamRe = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(asLatin))) {
    const header = asLatin.slice(Math.max(0, match.index - 400), match.index);
    if (!/\/Filter(?:\s*\[)?\s*\/FlateDecode/i.test(header)) {
      continue;
    }
    const start = match.index + match[0].length;
    const endMarker = asLatin.indexOf("endstream", start);
    if (endMarker < 0 || endMarker - start > 200_000) {
      continue;
    }
    const declared = Number(
      ([...header.matchAll(/\/Length\s+(\d+)/g)].at(-1) || [])[1] || 0,
    );
    const end =
      declared > 0 && start + declared <= endMarker
        ? start + declared
        : endMarker;
    const inflated = await inflateFlate(bytes.subarray(start, end));
    if (!inflated || !inflated.includes("/Nums")) {
      continue;
    }
    const first = Number((header.match(/\/First\s+(\d+)/) || [])[1] || 0);
    const objects =
      first > 0 && /\/Type\s*\/ObjStm/.test(header)
        ? objectMapFromObjStm(inflated, first)
        : undefined;
    const nums = inflated.match(/\/Nums\s*\[([\s\S]*?)\]/);
    if (!nums) {
      continue;
    }
    const ranges = parsePdfPageLabelNums(nums[1], objects);
    if (ranges.length) {
      const lastStart = Math.max(...ranges.map((range) => range.start));
      return expandPdfPageLabelRanges(
        ranges,
        Math.max(pageCount, lastStart + 8),
      );
    }
  }
  return null;
}

export function firstArabicPageIndex(labels: string[]): number | undefined {
  const index = labels.findIndex((label) => label === "1");
  return index >= 0 ? index : undefined;
}
