/**
 * Zotero notes are HTML (ProseMirror schema). Sanitize for display in chrome.
 *
 * Output must be XHTML-safe: Zotero chrome uses an XHTML document, where
 * `innerHTML` rejects HTML-only entities like `&nbsp;`.
 */

function isAllowedNoteTag(tag: string): boolean {
  switch (tag) {
    case "A":
    case "B":
    case "BLOCKQUOTE":
    case "BR":
    case "CODE":
    case "EM":
    case "H1":
    case "H2":
    case "H3":
    case "HR":
    case "I":
    case "LI":
    case "OL":
    case "P":
    case "PRE":
    case "S":
    case "STRIKE":
    case "STRONG":
    case "SUB":
    case "SUP":
    case "U":
    case "UL":
      return true;
    default:
      return false;
  }
}

function isSafeHref(href: string): boolean {
  return /^(https?:|mailto:|#)/i.test(href.trim());
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

  if (tag === "HR") {
    out.appendChild(doc.createElement("hr"));
    return;
  }

  if (!isAllowedNoteTag(tag)) {
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
  return out
    .replace(/\sxmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "")
    .replace(/<br>/gi, "<br />")
    .replace(/<hr>/gi, "<hr />");
}

/**
 * Sanitized note HTML for display. Empty / wrapper-only notes become "".
 * Unwraps the Zotero `data-schema-version` root; keeps emphasis, links,
 * lists, headings, quotes, and code.
 */
export function noteHtmlToDisplayHtml(html: string | null | undefined): string {
  const normalized = String(html || "").trim();
  if (!normalized) {
    return "";
  }

  try {
    const doc = new DOMParser().parseFromString(
      `<body>${normalized}</body>`,
      "text/html",
    );
    if (!doc.body) {
      return "";
    }
    const wrap = doc.createElement("div");
    forEachChild(doc.body, (child) => sanitizeInto(child, wrap, doc));
    if (!(wrap.textContent || "").trim()) {
      return "";
    }
    return serializeXhtmlFragment(wrap);
  } catch {
    return "";
  }
}

/**
 * Short sanitized preview of a note for cover thumbnails — enough to fill
 * a cover face without parsing / painting a long document.
 */
export function truncateNoteHtmlForPreview(
  html: string | null | undefined,
  maxChars = 360,
): string {
  const sanitized = noteHtmlToDisplayHtml(html);
  if (!sanitized) {
    return "";
  }
  if ((sanitized.replace(/<[^>]+>/g, "").length || 0) <= maxChars) {
    return sanitized;
  }

  try {
    const doc = new DOMParser().parseFromString(
      `<body>${sanitized}</body>`,
      "text/html",
    );
    if (!doc.body) {
      return sanitized.slice(0, maxChars);
    }
    const out = doc.createElement("div");
    let remaining = maxChars;

    const takeNode = (node: Node, parent: Node): boolean => {
      if (remaining <= 0) {
        return false;
      }
      if (node.nodeType === 3 /* TEXT_NODE */) {
        const text = node.textContent || "";
        if (!text) {
          return true;
        }
        if (text.length <= remaining) {
          parent.appendChild(doc.createTextNode(text));
          remaining -= text.length;
          return true;
        }
        parent.appendChild(doc.createTextNode(text.slice(0, remaining)));
        remaining = 0;
        return false;
      }
      if (node.nodeType !== 1 /* ELEMENT_NODE */) {
        return true;
      }
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === "br" || tag === "hr") {
        parent.appendChild(doc.createElement(tag));
        return true;
      }
      const clone = doc.createElement(tag);
      if (tag === "a") {
        const href = el.getAttribute("href");
        if (href) {
          clone.setAttribute("href", href);
        }
      }
      parent.appendChild(clone);
      const kids = el.childNodes;
      for (let i = 0; i < kids.length; i++) {
        const child = kids.item(i);
        if (!child) {
          continue;
        }
        if (!takeNode(child, clone)) {
          return false;
        }
      }
      return true;
    };

    const top = doc.body.childNodes;
    for (let i = 0; i < top.length; i++) {
      const child = top.item(i);
      if (!child) {
        continue;
      }
      if (!takeNode(child, out)) {
        break;
      }
    }
    return serializeXhtmlFragment(out);
  } catch {
    return sanitized.slice(0, maxChars);
  }
}
