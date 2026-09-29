/** Minimum length for highlighting the full query as a phrase. */
export const SEARCH_HIGHLIGHT_FULL_MIN = 6;

/** Minimum length for highlighting individual query words. */
export const SEARCH_HIGHLIGHT_WORD_MIN = 4;

/** Lines kept before/after the primary match when trimming a long hit. */
export const SEARCH_SNIPPET_CONTEXT_LINES = 1;

/**
 * A blank-line paragraph at or below this size is shown in full.
 * Larger blocks (page dumps or oversized “paragraphs”) are trimmed.
 */
export const SEARCH_SNIPPET_PARAGRAPH_MAX_LINES = 5;

/** Soft character budget for a discernible paragraph (single-line dumps too). */
export const SEARCH_SNIPPET_PARAGRAPH_MAX_CHARS = 360;

/** Approximate characters per soft-wrapped line when the source has no newlines. */
export const SEARCH_SNIPPET_SOFT_LINE_CHARS = 72;

/** Hard cap on lines kept in a trimmed snippet window. */
export const SEARCH_SNIPPET_WINDOW_MAX_LINES = 5;

export type SearchHighlightKind = "full" | "word";

export type SearchHighlightSegment = {
  text: string;
  kind?: SearchHighlightKind;
};

type MatchRange = {
  start: number;
  end: number;
  kind: SearchHighlightKind;
};

function rangesOverlap(a: MatchRange, b: MatchRange): boolean {
  return a.start < b.end && b.start < a.end;
}

function collectNeedleRanges(
  haystackLower: string,
  needle: string,
  kind: SearchHighlightKind,
): MatchRange[] {
  if (!needle) {
    return [];
  }
  const ranges: MatchRange[] = [];
  let from = 0;
  while (from <= haystackLower.length - needle.length) {
    const start = haystackLower.indexOf(needle, from);
    if (start < 0) {
      break;
    }
    ranges.push({ start, end: start + needle.length, kind });
    from = start + needle.length;
  }
  return ranges;
}

/** Collect full-query and word match ranges (full takes priority). */
export function collectSearchMatchRanges(
  text: string,
  query: string,
): MatchRange[] {
  const source = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!source || !q) {
    return [];
  }

  const haystackLower = source.toLowerCase();
  const ranges: MatchRange[] = [];

  if (q.length >= SEARCH_HIGHLIGHT_FULL_MIN) {
    for (const range of collectNeedleRanges(
      haystackLower,
      q.toLowerCase(),
      "full",
    )) {
      ranges.push(range);
    }
  }

  const words = [
    ...new Set(
      q
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= SEARCH_HIGHLIGHT_WORD_MIN),
    ),
  ].sort((a, b) => b.length - a.length);

  for (const word of words) {
    for (const range of collectNeedleRanges(
      haystackLower,
      word.toLowerCase(),
      "word",
    )) {
      if (ranges.some((existing) => rangesOverlap(existing, range))) {
        continue;
      }
      ranges.push(range);
    }
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  return ranges;
}

/**
 * Split `text` into plain + highlighted segments for a search query.
 * Full-query matches (query length ≥ 6) take priority over word matches
 * (token length ≥ 4). Case-insensitive; original casing is preserved.
 */
export function segmentSearchHighlights(
  text: string,
  query: string,
): SearchHighlightSegment[] {
  const source = String(text ?? "");
  if (!source) {
    return [];
  }
  const ranges = collectSearchMatchRanges(source, query);
  if (ranges.length === 0) {
    return [{ text: source }];
  }

  const segments: SearchHighlightSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) {
      continue;
    }
    if (range.start > cursor) {
      segments.push({ text: source.slice(cursor, range.start) });
    }
    segments.push({
      text: source.slice(range.start, range.end),
      kind: range.kind,
    });
    cursor = range.end;
  }
  if (cursor < source.length) {
    segments.push({ text: source.slice(cursor) });
  }
  return segments;
}

type LineSpan = { start: number; end: number; text: string };

function lineSpansForText(text: string): LineSpan[] {
  if (text.includes("\n")) {
    const lines = text.split("\n");
    const spans: LineSpan[] = [];
    let offset = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const start = offset;
      const end = start + line.length;
      spans.push({ start, end, text: line });
      offset = end + (i < lines.length - 1 ? 1 : 0);
    }
    return spans;
  }

  const width = SEARCH_SNIPPET_SOFT_LINE_CHARS;
  const spans: LineSpan[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(text.length, offset + width);
    if (end < text.length) {
      const slice = text.slice(offset, end);
      const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("-"));
      if (breakAt >= Math.floor(width * 0.45)) {
        end = offset + breakAt + 1;
      }
    }
    spans.push({ start: offset, end, text: text.slice(offset, end) });
    offset = end;
  }
  return spans;
}

/**
 * True when the extract looks like a normal paragraph (show in full).
 * Oversized blocks — many hard lines, or a long soft-wrapped blob — are
 * treated as page dumps and trimmed around matches.
 */
export function isDiscernibleSearchParagraph(text: string): boolean {
  const source = String(text ?? "").trim();
  if (!source) {
    return true;
  }
  const hardLines = source.split("\n").filter((line) => line.trim()).length;
  const chars = source.replace(/\s+/g, " ").length;
  const softLines = Math.max(
    1,
    Math.ceil(chars / SEARCH_SNIPPET_SOFT_LINE_CHARS),
  );
  const lineCount = Math.max(hardLines, softLines);
  if (lineCount > SEARCH_SNIPPET_PARAGRAPH_MAX_LINES) {
    return false;
  }
  return chars <= SEARCH_SNIPPET_PARAGRAPH_MAX_CHARS;
}

/**
 * Trim a long full-text hit around a single primary match (full-query hit if
 * any, otherwise the first word hit). Scattered matches used to merge into
 * one oversized window — keep the snippet small and focused.
 */
export function trimSearchSnippet(
  text: string,
  query: string,
  options?: { contextLines?: number; maxLines?: number },
): string {
  const source = String(text ?? "")
    .split("\0")
    .join("");
  const q = String(query ?? "").trim();
  if (!source.trim()) {
    return "";
  }
  if (!q) {
    return source.trim();
  }

  const ranges = collectSearchMatchRanges(source, q);
  if (ranges.length === 0) {
    return source.trim();
  }

  const primary = ranges.find((range) => range.kind === "full") || ranges[0];
  const contextLines = Math.max(
    0,
    options?.contextLines ?? SEARCH_SNIPPET_CONTEXT_LINES,
  );
  const maxLines = Math.max(
    1,
    options?.maxLines ?? SEARCH_SNIPPET_WINDOW_MAX_LINES,
  );
  const spans = lineSpansForText(source);
  if (spans.length === 0) {
    return source.trim();
  }

  let matchLine = 0;
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (primary.start < span.end && primary.end > span.start) {
      matchLine = i;
      break;
    }
  }

  let from = Math.max(0, matchLine - contextLines);
  let to = Math.min(spans.length - 1, matchLine + contextLines);
  while (to - from + 1 > maxLines) {
    // Prefer keeping context after the match when we must shrink.
    if (to > matchLine && to - from + 1 > maxLines) {
      to -= 1;
    } else if (from < matchLine) {
      from += 1;
    } else {
      break;
    }
  }

  const chunk = spans
    .slice(from, to + 1)
    .map((span) => span.text)
    .join("\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
  if (!chunk) {
    return source.trim();
  }

  const prefix = from > 0 ? "… " : "";
  const suffix = to < spans.length - 1 ? " …" : "";
  return `${prefix}${chunk}${suffix}`.trim();
}

/**
 * Full-text feed quote: keep a normal paragraph whole; trim page-sized dumps
 * down to the highlighted neighborhood.
 */
export function formatFulltextSearchHit(text: string, query: string): string {
  const source = String(text ?? "").trim();
  if (!source) {
    return "";
  }
  if (isDiscernibleSearchParagraph(source)) {
    return source;
  }
  return trimSearchSnippet(source, query);
}

function forEachChild(node: Node, fn: (child: Node) => void): void {
  const kids = node.childNodes;
  for (let i = 0; i < kids.length; i++) {
    const child = kids.item(i);
    if (child) {
      fn(child);
    }
  }
}

function serializeXhtmlFragment(wrap: Element): string {
  const ser = new XMLSerializer();
  let out = "";
  forEachChild(wrap, (child) => {
    out += ser.serializeToString(child);
  });
  return out.replace(/\sxmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "");
}

/**
 * Insert search highlight &lt;mark&gt;s into already-sanitized display HTML
 * (text nodes only). Safe for XHTML innerHTML.
 */
export function highlightSearchInHtml(html: string, query: string): string {
  const source = String(html ?? "");
  const q = String(query ?? "").trim();
  if (!source) {
    return "";
  }
  if (!q) {
    return source;
  }
  try {
    const doc = new DOMParser().parseFromString(
      `<body>${source}</body>`,
      "text/html",
    );
    if (!doc.body) {
      return source;
    }

    const walk = (node: Node) => {
      if (node.nodeType === 3 /* TEXT_NODE */) {
        const text = node.textContent || "";
        if (!text) {
          return;
        }
        const segments = segmentSearchHighlights(text, q);
        if (segments.length === 1 && !segments[0].kind) {
          return;
        }
        const frag = doc.createDocumentFragment();
        for (const segment of segments) {
          if (!segment.text) {
            continue;
          }
          if (!segment.kind) {
            frag.appendChild(doc.createTextNode(segment.text));
            continue;
          }
          const mark = doc.createElement("mark");
          mark.setAttribute(
            "class",
            segment.kind === "full"
              ? "syllabus-search-hit syllabus-search-hit-full"
              : "syllabus-search-hit syllabus-search-hit-word",
          );
          mark.textContent = segment.text;
          frag.appendChild(mark);
        }
        node.parentNode?.replaceChild(frag, node);
        return;
      }
      if (node.nodeType !== 1 /* ELEMENT_NODE */) {
        return;
      }
      const el = node as Element;
      if (el.tagName.toUpperCase() === "MARK") {
        return;
      }
      for (const child of Array.from(el.childNodes)) {
        if (child) {
          walk(child);
        }
      }
    };

    walk(doc.body);
    return serializeXhtmlFragment(doc.body) || source;
  } catch {
    return source;
  }
}
