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
 * Escape text and emit HTML paragraphs with &lt;br&gt; soft breaks.
 * For Zotero note HTML (already escaped context).
 */
export function proseToHtml(text: string | null | undefined): string {
  const paragraphs = splitProse(text);
  if (paragraphs.length === 0) {
    return "";
  }
  return paragraphs
    .map((lines) => {
      const inner = lines.map(escapeHtml).join("<br/>");
      return `<p>${inner}</p>`;
    })
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
