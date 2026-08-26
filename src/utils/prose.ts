/**
 * Split plain prose into paragraphs (blank-line separated) and soft line breaks.
 * Used for display; editing stays in a textarea as raw source.
 */

export type ProseParagraph = string[];

/** Split on blank lines; within each paragraph, split on single newlines. */
export function splitProse(text: string | null | undefined): ProseParagraph[] {
  const normalized = (text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  return normalized
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0),
    )
    .filter((lines) => lines.length > 0);
}

/**
 * Escape text and emit HTML for Zotero note bodies.
 * One &lt;p&gt; per line — Zotero's note schema often drops &lt;br&gt; soft breaks
 * inside a single paragraph, which collapses multiline prose.
 */
export function proseToHtml(text: string | null | undefined): string {
  const paragraphs = splitProse(text);
  if (paragraphs.length === 0) {
    return "";
  }
  return paragraphs
    .flatMap((lines) => lines.map((line) => `<p>${escapeHtml(line)}</p>`))
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
