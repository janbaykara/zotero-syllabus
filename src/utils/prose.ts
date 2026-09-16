/**
 * Syllabus prose: stored as Markdown source, rendered for display / publish / notes.
 * Editing stays in a textarea as raw source.
 */

import MarkdownIt from "markdown-it";

export type ProseParagraph = string[];

const BLOCKED_MD_RULES = [
  "table",
  "code",
  "fence",
  "hr",
  "heading",
  "lheading",
  "html_block",
  "html_inline",
  "image",
] as const;

function createMarkdown(breaks: boolean) {
  const md = new MarkdownIt({
    html: false,
    xhtmlOut: true,
    linkify: true,
    breaks,
    typographer: false,
  });
  md.disable([...BLOCKED_MD_RULES]);

  // http(s), mailto, and in-page anchors only
  md.validateLink = (url) => {
    const trimmed = (url || "").trim();
    return /^(https?:|mailto:|#)/i.test(trimmed);
  };

  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    ((tokens, idx, options, _env, self) =>
      self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const targetIdx = token.attrIndex("target");
    if (targetIdx < 0) {
      token.attrPush(["target", "_blank"]);
    } else if (token.attrs) {
      token.attrs[targetIdx][1] = "_blank";
    }
    const relIdx = token.attrIndex("rel");
    if (relIdx < 0) {
      token.attrPush(["rel", "noopener noreferrer"]);
    } else if (token.attrs) {
      token.attrs[relIdx][1] = "noopener noreferrer";
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  return md;
}

/** Drop markdown links with unsafe protocols; keep the visible label only. */
function stripUnsafeMarkdownLinks(text: string): string {
  return text.replace(
    /\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g,
    (full, label: string, url: string) => {
      const trimmed = String(url || "").trim();
      if (/^(https?:|mailto:|#)/i.test(trimmed)) {
        return full;
      }
      return label;
    },
  );
}

const displayMarkdown = createMarkdown(true);

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
 * Markdown → HTML for in-app display and published / printed syllabi.
 * Soft breaks (single newlines) become &lt;br&gt;; blank lines become paragraphs.
 * Supports emphasis, strong, inline code, links, lists, and blockquotes.
 */
export function proseToDisplayHtml(text: string | null | undefined): string {
  const normalized = stripUnsafeMarkdownLinks(
    (text || "").replace(/\r\n/g, "\n").trim(),
  );
  if (!normalized) {
    return "";
  }
  return displayMarkdown.render(normalized).trim();
}

/**
 * Markdown → HTML for Zotero note bodies.
 * Soft breaks become separate &lt;p&gt; tags — Zotero's note schema often drops
 * &lt;br&gt; inside a single paragraph.
 */
export function proseToHtml(text: string | null | undefined): string {
  const html = proseToDisplayHtml(text);
  if (!html) {
    return "";
  }
  return expandBreaksToParagraphs(html);
}

function expandBreaksToParagraphs(html: string): string {
  if (!html.includes("<br")) {
    return html;
  }
  return html
    .replace(/<br\s*\/?>\s*/gi, "</p><p>")
    .replace(/<p>\s*/gi, "<p>")
    .replace(/\s*<\/p>/gi, "</p>")
    .replace(/<p><\/p>/gi, "")
    .trim();
}
