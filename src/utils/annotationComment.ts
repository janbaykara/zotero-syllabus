/**
 * Zotero annotation comments are plain text flavored with a few HTML tags
 * (typically i/b/em/strong/sub/sup, plus newlines). Render safely for display.
 *
 * Output must be XHTML-safe: Zotero chrome uses an XHTML document, where
 * `innerHTML` rejects HTML-only entities like `&nbsp;`.
 */

function isAllowedAnnotationTag(tag: string): boolean {
  switch (tag) {
    case "A":
    case "B":
    case "BR":
    case "EM":
    case "I":
    case "STRONG":
    case "SUB":
    case "SUP":
      return true;
    default:
      return false;
  }
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isSafeHref(href: string): boolean {
  return /^(https?:|mailto:|#)/i.test(href.trim());
}

function looksLikeHtml(text: string): boolean {
  return /<[a-zA-Z/!]/.test(text);
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

function sanitizeInto(node: Node, out: Node, doc: Document): void {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    out.appendChild(doc.createTextNode(node.textContent || ""));
    return;
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) {
    return;
  }

  const el = node as Element;
  const tag = el.tagName.toUpperCase();

  if (tag === "BR") {
    out.appendChild(doc.createElement("br"));
    return;
  }

  if (!isAllowedAnnotationTag(tag)) {
    forEachChild(el, (child) => sanitizeInto(child, out, doc));
    return;
  }

  if (tag === "A") {
    const href = el.getAttribute("href") || "";
    if (!isSafeHref(href)) {
      forEachChild(el, (child) => sanitizeInto(child, out, doc));
      return;
    }
    const link = doc.createElement("a");
    link.setAttribute("href", href.trim());
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    forEachChild(el, (child) => sanitizeInto(child, link, doc));
    out.appendChild(link);
    return;
  }

  const clean = doc.createElement(tag.toLowerCase());
  forEachChild(el, (child) => sanitizeInto(child, clean, doc));
  out.appendChild(clean);
}

/** Serialize for XHTML `innerHTML` (no HTML-only entities like &nbsp;). */
function serializeXhtmlFragment(wrap: Element): string {
  const ser = new XMLSerializer();
  let out = "";
  forEachChild(wrap, (child) => {
    out += ser.serializeToString(child);
  });
  return out.replace(/\sxmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "");
}

/** Sanitized HTML for display (newlines kept for `white-space: pre-wrap`). */
export function annotationCommentToDisplayHtml(
  text: string | null | undefined,
): string {
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!normalized) {
    return "";
  }
  if (!looksLikeHtml(normalized)) {
    return escapeText(normalized);
  }

  try {
    const doc = new DOMParser().parseFromString(
      `<body>${normalized}</body>`,
      "text/html",
    );
    if (!doc.body) {
      return escapeText(normalized);
    }
    const wrap = doc.createElement("div");
    forEachChild(doc.body, (child) => sanitizeInto(child, wrap, doc));
    return serializeXhtmlFragment(wrap) || escapeText(normalized);
  } catch {
    return escapeText(normalized);
  }
}

/** Plain text for clipboard / search (HTML tags stripped). */
export function annotationCommentToPlainText(
  text: string | null | undefined,
): string {
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!normalized) {
    return "";
  }
  if (!looksLikeHtml(normalized)) {
    return normalized;
  }
  try {
    const doc = new DOMParser().parseFromString(
      `<body>${normalized}</body>`,
      "text/html",
    );
    return (doc.body?.textContent || "").replace(/\r\n/g, "\n").trim();
  } catch {
    return normalized.replace(/<[^>]+>/g, "");
  }
}
