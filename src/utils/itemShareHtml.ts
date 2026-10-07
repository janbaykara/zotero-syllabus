/** Static HTML for an individually shared library item. */

import type { FluentMessageId } from "../../typings/i10n";
import { getString } from "./locale";
import {
  getItemAbstractSnippet,
  getItemCreatorLine,
  getItemField,
  getItemTitle,
} from "./items";
import { buildPublishCreditHtml } from "./printSyllabus";

export type ItemShareFileLink = {
  relPath: string;
  label: string;
  contentType: string;
  embeddable: boolean;
};

export type ItemShareMetaRow = {
  label: string;
  value: string;
  href?: string;
};

export type BuildItemShareHtmlOpts = {
  title: string;
  creators: string;
  itemTypeLabel: string;
  description?: string;
  canonicalUrl: string;
  coverDataUrl?: string | null;
  coverPlaceholder?: { color: string; title: string; creator: string } | null;
  ogImageUrl?: string;
  metaRows: ItemShareMetaRow[];
  citationHtml?: string;
  files: ItemShareFileLink[];
  /** Relative path of the primary embeddable file, if any. */
  embedRelPath?: string | null;
  citationDownloads?: {
    risHref?: string;
    bibHref?: string;
    rdfHref?: string;
  };
};

export function isEmbeddableShareContentType(
  contentType: string,
  ext: string,
): boolean {
  const type = (contentType || "").toLowerCase();
  const e = (ext || "").toLowerCase();
  if (type.includes("pdf") || e === "pdf") return true;
  if (
    type.includes("html") ||
    type.includes("xhtml") ||
    e === "html" ||
    e === "htm"
  ) {
    return true;
  }
  if (
    type.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp"].includes(e)
  ) {
    return true;
  }
  return false;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

/** Collect chief bibliographic fields for the share sidebar. */
export function collectItemShareMeta(item: Zotero.Item): ItemShareMetaRow[] {
  const rows: ItemShareMetaRow[] = [];
  const add = (labelKey: FluentMessageId, value: string, href?: string) => {
    const v = value.trim();
    if (!v) return;
    rows.push({ label: getString(labelKey), value: v, href });
  };

  add("item-share-meta-creators", getItemCreatorLine(item));
  const date = getItemField(item, "date");
  if (date) {
    const year = date.match(/\d{4}/)?.[0] || date;
    add("item-share-meta-date", year);
  }
  try {
    const typeName =
      Zotero.ItemTypes.getLocalizedString?.(item.itemTypeID) ||
      item.itemType ||
      "";
    add("item-share-meta-type", String(typeName));
  } catch {
    add("item-share-meta-type", String(item.itemType || ""));
  }
  add("item-share-meta-publication", getItemField(item, "publicationTitle"));
  add("item-share-meta-publisher", getItemField(item, "publisher"));
  const volume = getItemField(item, "volume");
  const issue = getItemField(item, "issue");
  const pages = getItemField(item, "pages");
  const vip = [volume, issue, pages].filter(Boolean).join(" · ");
  if (vip) {
    add("item-share-meta-pages", vip);
  }
  const doi = getItemField(item, "DOI");
  if (doi) {
    const href = doi.startsWith("http")
      ? doi
      : `https://doi.org/${doi.replace(/^doi:/i, "")}`;
    add("item-share-meta-doi", doi, href);
  }
  add("item-share-meta-isbn", getItemField(item, "ISBN"));
  const url = getItemField(item, "url");
  if (url) {
    add("item-share-meta-url", url, url);
  }
  const abstract = getItemAbstractSnippet(item);
  if (abstract) {
    add(
      "item-share-meta-abstract",
      abstract.length > 2000 ? `${abstract.slice(0, 2000)}…` : abstract,
    );
  }
  try {
    const tags = (item.getTags?.() || [])
      .map((t: { tag?: string } | string) =>
        typeof t === "string" ? t : String(t.tag || ""),
      )
      .filter(Boolean);
    if (tags.length) {
      add("item-share-meta-tags", tags.join(", "));
    }
  } catch {
    // ignore
  }
  return rows;
}

export function buildItemShareHtml(opts: BuildItemShareHtmlOpts): string {
  const title = opts.title || getString("item-share-untitled");
  const creators = opts.creators || "";
  const description = (opts.description || "").trim();
  const creditHtml = buildPublishCreditHtml({ className: "item-share-credit" });

  const coverBlock = opts.coverDataUrl
    ? `<div class="cover"><img src="${escapeAttr(opts.coverDataUrl)}" alt="" /></div>`
    : opts.coverPlaceholder
      ? `<div class="cover placeholder" style="background:${escapeAttr(opts.coverPlaceholder.color)}">
          <div class="ph-title">${escapeHtml(opts.coverPlaceholder.title)}</div>
          <div class="ph-creator">${escapeHtml(opts.coverPlaceholder.creator)}</div>
        </div>`
      : `<div class="cover placeholder" style="background:#64748b"></div>`;

  const metaRowsHtml = opts.metaRows
    .map((row) => {
      const value = row.href
        ? `<a href="${escapeAttr(row.href)}" rel="noopener noreferrer">${escapeHtml(row.value)}</a>`
        : escapeHtml(row.value);
      return `<div class="meta-row"><dt>${escapeHtml(row.label)}</dt><dd>${value}</dd></div>`;
    })
    .join("\n");

  const filesHtml =
    opts.files.length > 0
      ? `<ul class="files">${opts.files
          .map(
            (f) =>
              `<li><a href="${escapeAttr(f.relPath)}" rel="noopener">${escapeHtml(f.label)}</a></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${escapeHtml(getString("item-share-no-files"))}</p>`;

  const citeLinks: string[] = [];
  if (opts.citationDownloads?.risHref) {
    citeLinks.push(
      `<a href="${escapeAttr(opts.citationDownloads.risHref)}">${escapeHtml(getString("publish-html-download-ris"))}</a>`,
    );
  }
  if (opts.citationDownloads?.bibHref) {
    citeLinks.push(
      `<a href="${escapeAttr(opts.citationDownloads.bibHref)}">${escapeHtml(getString("publish-html-download-bib"))}</a>`,
    );
  }
  if (opts.citationDownloads?.rdfHref) {
    citeLinks.push(
      `<a href="${escapeAttr(opts.citationDownloads.rdfHref)}">${escapeHtml(getString("publish-html-download-rdf"))}</a>`,
    );
  }

  const citationBlock = opts.citationHtml
    ? `<div class="citation">${opts.citationHtml}</div>`
    : "";

  const viewer =
    opts.embedRelPath &&
    `<section class="viewer">
      <iframe src="${escapeAttr(opts.embedRelPath)}" title="${escapeAttr(getString("item-share-viewer-title"))}"></iframe>
    </section>`;

  const ogImage = opts.ogImageUrl
    ? `<meta property="og:image" content="${escapeAttr(opts.ogImageUrl)}" />
<meta name="twitter:image" content="${escapeAttr(opts.ogImageUrl)}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description || creators || title)}" />
<link rel="canonical" href="${escapeAttr(opts.canonicalUrl)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeAttr(title)}" />
<meta property="og:description" content="${escapeAttr(description || creators || title)}" />
<meta property="og:url" content="${escapeAttr(opts.canonicalUrl)}" />
<meta name="twitter:card" content="${opts.ogImageUrl ? "summary_large_image" : "summary"}" />
<meta name="twitter:title" content="${escapeAttr(title)}" />
<meta name="twitter:description" content="${escapeAttr(description || creators || title)}" />
${ogImage}
<style>
  :root {
    --bg: #f6f4ef;
    --ink: #1a1a1a;
    --muted: #5c5c5c;
    --line: #d9d4c8;
    --panel: #fffdf8;
    --accent: #1f4b7a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: var(--ink);
    background:
      radial-gradient(ellipse 80% 50% at 10% 0%, #ebe6d9 0%, transparent 55%),
      var(--bg);
    line-height: 1.45;
  }
  .wrap {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 3rem;
  }
  .hero {
    display: grid;
    grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
    gap: 1.5rem 2rem;
    align-items: start;
  }
  @media (max-width: 720px) {
    .hero { grid-template-columns: 1fr; }
  }
  .cover {
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: 2px;
    overflow: hidden;
    box-shadow: 0 12px 28px rgba(0,0,0,0.12);
    background: #ddd;
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .cover.placeholder {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 1rem;
    color: #fff;
  }
  .ph-title { font-size: 1.05rem; font-weight: 600; }
  .ph-creator { font-size: 0.85rem; opacity: 0.9; margin-top: 0.35rem; }
  h1 {
    font-size: clamp(1.5rem, 3vw, 2.1rem);
    margin: 0 0 0.35rem;
    font-weight: 650;
    letter-spacing: -0.02em;
  }
  .byline {
    color: var(--muted);
    margin: 0 0 1rem;
    font-size: 1.05rem;
  }
  .type-pill {
    display: inline-block;
    font-family: system-ui, sans-serif;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
    margin-bottom: 0.75rem;
  }
  details.meta {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 0.65rem 0.9rem;
  }
  details.meta > summary {
    cursor: pointer;
    font-family: system-ui, sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    list-style: none;
  }
  details.meta > summary::-webkit-details-marker { display: none; }
  .meta-body { margin-top: 0.75rem; }
  .meta-row {
    display: grid;
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: 0.35rem 0.75rem;
    padding: 0.35rem 0;
    border-top: 1px solid var(--line);
    font-size: 0.92rem;
  }
  .meta-row dt {
    margin: 0;
    color: var(--muted);
    font-family: system-ui, sans-serif;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .meta-row dd { margin: 0; }
  .meta-row a { color: var(--accent); }
  .section {
    margin-top: 1.25rem;
  }
  .section h2 {
    font-family: system-ui, sans-serif;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin: 0 0 0.5rem;
  }
  .files { margin: 0; padding-left: 1.1rem; }
  .files a { color: var(--accent); }
  .cite-links { display: flex; flex-wrap: wrap; gap: 0.75rem; font-family: system-ui, sans-serif; font-size: 0.9rem; }
  .cite-links a { color: var(--accent); }
  .citation {
    font-size: 0.95rem;
    margin-top: 0.5rem;
    padding: 0.65rem 0.8rem;
    background: var(--panel);
    border: 1px solid var(--line);
  }
  .muted { color: var(--muted); font-size: 0.9rem; }
  .viewer {
    margin-top: 2rem;
    border: 1px solid var(--line);
    background: #fff;
    min-height: 70vh;
  }
  .viewer iframe {
    width: 100%;
    height: min(85vh, 900px);
    border: 0;
    display: block;
  }
  footer.item-share-credit {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    font-family: system-ui, sans-serif;
    font-size: 0.8rem;
    color: var(--muted);
  }
  footer.item-share-credit a {
    color: var(--accent);
    text-decoration: underline;
  }
  footer.item-share-credit a:hover {
    opacity: 0.85;
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      ${coverBlock}
      <div>
        <div class="type-pill">${escapeHtml(opts.itemTypeLabel)}</div>
        <h1>${escapeHtml(title)}</h1>
        ${creators ? `<p class="byline">${escapeHtml(creators)}</p>` : ""}
        <details class="meta" open>
          <summary>${escapeHtml(getString("item-share-meta-summary"))}</summary>
          <div class="meta-body">
            ${metaRowsHtml}
            ${citationBlock}
          </div>
        </details>
        <div class="section">
          <h2>${escapeHtml(getString("item-share-files-heading"))}</h2>
          ${filesHtml}
        </div>
        ${
          citeLinks.length
            ? `<div class="section"><h2>${escapeHtml(getString("item-share-cite-heading"))}</h2><div class="cite-links">${citeLinks.join("")}</div></div>`
            : ""
        }
      </div>
    </div>
    ${viewer || ""}
    ${creditHtml}
  </div>
</body>
</html>`;
}

/** Title used when building share HTML (exported for tests). */
export function itemShareDisplayTitle(item: Zotero.Item): string {
  return getItemTitle(item) || getString("item-share-untitled");
}
