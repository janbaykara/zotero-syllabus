/**
 * COinS / Highwire helpers so the Zotero Connector can detect published pages.
 * Multiple <span class="Z3988"> → folder icon; citation_* meta → single item.
 */

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Pull every COinS span out of CSL bibliography HTML (or any markup). */
export function extractCoinsSpans(html: string): string {
  if (!html?.trim()) return "";
  try {
    const doc = new DOMParser().parseFromString(
      `<div id="syllabus-coins-root">${html}</div>`,
      "text/html",
    );
    const root = doc.getElementById("syllabus-coins-root");
    if (!root) return "";
    return Array.from(root.querySelectorAll("span.Z3988"))
      .map((el) => (el as HTMLElement).outerHTML)
      .join("\n");
  } catch {
    // Regex fallback when DOMParser is unavailable
    const matches = html.match(/<span\s+class="Z3988"[^>]*><\/span>/gi);
    return matches ? matches.join("\n") : "";
  }
}

/** Hidden block for static index.html so Connector sees items before SPA hydrate. */
export function coinsHiddenBlock(coinsHtml: string): string {
  const trimmed = coinsHtml.trim();
  if (!trimmed) return "";
  return `<div id="zotero-coins" hidden aria-hidden="true">${trimmed}</div>\n`;
}

function metaTag(name: string, content: string): string {
  const value = content.trim();
  if (!value) return "";
  return `<meta name="${escapeAttr(name)}" content="${escapeAttr(value)}" />`;
}

function itemCreators(item: Zotero.Item): string[] {
  try {
    return (item.getCreators?.() || [])
      .map((c) => {
        const first = String(c.firstName || "").trim();
        const last = String(c.lastName || "").trim();
        if (first && last) return `${first} ${last}`;
        return last || first;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function field(item: Zotero.Item, name: string): string {
  try {
    return String(item.getField?.(name) || "").trim();
  } catch {
    return "";
  }
}

/**
 * Google/Highwire Press meta tags for a single shared item page.
 * Embedded Metadata translator prefers these for one-item detection.
 */
export function buildHighwireMetaTags(
  item: Zotero.Item,
  opts?: { pdfUrl?: string; pageUrl?: string },
): string {
  const tags: string[] = [];
  const title = field(item, "title") || itemShareTitleFallback(item);
  tags.push(metaTag("citation_title", title));

  for (const creator of itemCreators(item)) {
    tags.push(metaTag("citation_author", creator));
  }

  const date = field(item, "date");
  if (date) {
    tags.push(metaTag("citation_publication_date", date));
    const year = date.match(/\d{4}/)?.[0];
    if (year) tags.push(metaTag("citation_year", year));
  }

  const doi = field(item, "DOI");
  if (doi) tags.push(metaTag("citation_doi", doi.replace(/^doi:/i, "")));

  const url = field(item, "url");
  if (url) tags.push(metaTag("citation_public_url", url));
  else if (opts?.pageUrl) {
    tags.push(metaTag("citation_public_url", opts.pageUrl));
  }

  const abstract = field(item, "abstractNote");
  if (abstract) {
    tags.push(
      metaTag(
        "citation_abstract",
        abstract.length > 2000 ? `${abstract.slice(0, 2000)}…` : abstract,
      ),
    );
  }

  const itemType = String(item.itemType || "");
  const publication =
    field(item, "publicationTitle") || field(item, "websiteTitle");
  if (itemType === "book") {
    tags.push(metaTag("citation_book_title", title));
  } else if (publication) {
    if (itemType === "bookSection" || itemType === "conferencePaper") {
      tags.push(metaTag("citation_book_title", publication));
    } else {
      tags.push(metaTag("citation_journal_title", publication));
    }
  }

  const publisher = field(item, "publisher");
  if (publisher) tags.push(metaTag("citation_publisher", publisher));

  const isbn = field(item, "ISBN");
  if (isbn) tags.push(metaTag("citation_isbn", isbn));
  const issn = field(item, "ISSN");
  if (issn) tags.push(metaTag("citation_issn", issn));

  const volume = field(item, "volume");
  if (volume) tags.push(metaTag("citation_volume", volume));
  const issue = field(item, "issue");
  if (issue) tags.push(metaTag("citation_issue", issue));
  const pages = field(item, "pages");
  if (pages) {
    const [first, last] = pages.split(/\s*[-–—]\s*/);
    if (first) tags.push(metaTag("citation_firstpage", first));
    if (last) tags.push(metaTag("citation_lastpage", last));
  }

  const language = field(item, "language");
  if (language) tags.push(metaTag("citation_language", language));

  try {
    const keywords = (item.getTags?.() || [])
      .map((t: { tag?: string } | string) =>
        typeof t === "string" ? t : String(t.tag || ""),
      )
      .filter(Boolean);
    if (keywords.length) {
      tags.push(metaTag("citation_keywords", keywords.join("; ")));
    }
  } catch {
    // ignore
  }

  if (opts?.pdfUrl) {
    tags.push(metaTag("citation_pdf_url", opts.pdfUrl));
  }

  const conference = field(item, "conferenceName");
  if (conference) tags.push(metaTag("citation_conference_title", conference));

  const university = field(item, "university");
  if (university) {
    tags.push(metaTag("citation_dissertation_institution", university));
  }

  const institution = field(item, "institution");
  if (institution) {
    tags.push(metaTag("citation_technical_report_institution", institution));
  }

  return tags.filter(Boolean).join("\n");
}

function itemShareTitleFallback(item: Zotero.Item): string {
  try {
    return String(item.getDisplayTitle?.() || item.key || "Item");
  } catch {
    return "Item";
  }
}
