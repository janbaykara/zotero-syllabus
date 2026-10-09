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
import { buildShareCoverHtml } from "./shareCoverHtml";
import { coinsHiddenBlock } from "./zoteroCoins";

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

/** One annotation row for the public share page (already sorted). */
export type ItemShareAnnotation = {
  quote: string;
  /** Sanitized display HTML for the comment, if any. */
  commentHtml: string;
  color: string;
  pageLabel: string;
  tags: string[];
  /** Pref-baked clipboard text for Copy. */
  copyText: string;
};

export type BuildItemShareHtmlOpts = {
  title: string;
  creators: string;
  /** Zotero item type id (e.g. book) — drives cover treatments. */
  itemType: string;
  itemTypeLabel: string;
  description?: string;
  canonicalUrl: string;
  coverDataUrl?: string | null;
  coverPlaceholder?: { color: string; title: string; creator: string } | null;
  /** galleryCover.css + share-viewer-cover-shim.css */
  coverCss?: string;
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
  /** Annotations in document location order (omit or empty = no section). */
  annotations?: ItemShareAnnotation[];
  /** Highwire Press citation_* meta tags for Zotero Connector. */
  highwireMetaHtml?: string;
  /** COinS span(s) for Zotero Connector. */
  coinsHtml?: string;
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

/** Format a raw PDF page label for share pages (Cite locator or Fluent). */
export function formatSharePageLabel(page: string): string {
  try {
    const cite = (
      Zotero as typeof Zotero & {
        Cite?: { getLocatorString?: (locator: string) => string };
      }
    ).Cite;
    const locator = cite?.getLocatorString?.("page");
    if (locator) {
      return `${locator} ${page}`;
    }
  } catch {
    // Fall through to Fluent.
  }
  return getString("my-annotations-page", { args: { page } });
}

function buildAnnotationsSectionHtml(
  annotations: ItemShareAnnotation[],
): string {
  if (!annotations.length) {
    return "";
  }

  const copyLabel = getString("my-annotations-copy");
  const copiedLabel = getString("my-annotations-copied");
  const copyAllLabel = getString("my-annotations-copy-all");
  const tagsAria = getString("my-annotations-stream-tags-aria");
  const groupCopyText = annotations
    .map((a) => a.copyText)
    .filter(Boolean)
    .join("\n\n");

  const entriesHtml = annotations
    .map((ann) => {
      const pageText = ann.pageLabel ? formatSharePageLabel(ann.pageLabel) : "";
      const hasCopy = !!ann.copyText;
      const tags = ann.tags || [];
      const showMeta = !!(pageText || tags.length > 0 || hasCopy);

      const quoteHtml = ann.quote
        ? `<div class="ann-quote"><mark class="ann-mark" style="--highlight-color:${escapeAttr(ann.color || "#ffd400")}">${escapeHtml(ann.quote)}</mark></div>`
        : "";

      const metaParts: string[] = [];
      if (pageText) {
        metaParts.push(
          `<span class="ann-location">${escapeHtml(pageText)}</span>`,
        );
      }
      if (tags.length > 0) {
        if (metaParts.length) {
          metaParts.push(
            `<span class="ann-meta-sep" aria-hidden="true">·</span>`,
          );
        }
        metaParts.push(
          `<span class="ann-tags" role="list" aria-label="${escapeAttr(tagsAria)}">${tags
            .map(
              (tag) =>
                `<span role="listitem" class="ann-tag" title="${escapeAttr(tag)}">${escapeHtml(tag)}</span>`,
            )
            .join("")}</span>`,
        );
      }
      if (hasCopy) {
        if (metaParts.length) {
          metaParts.push(
            `<span class="ann-meta-sep ann-copy-sep" aria-hidden="true">·</span>`,
          );
        }
        metaParts.push(
          `<button type="button" class="ann-copy" data-copy="${escapeAttr(ann.copyText)}" data-label-copy="${escapeAttr(copyLabel)}" data-label-copied="${escapeAttr(copiedLabel)}" title="${escapeAttr(copyLabel)}" aria-label="${escapeAttr(copyLabel)}">${escapeHtml(copyLabel)}</button>`,
        );
      }

      const metaHtml = showMeta
        ? `<div class="ann-meta">${metaParts.join("")}</div>`
        : "";

      const commentHtml = ann.commentHtml
        ? `<div class="ann-comment">${ann.commentHtml}</div>`
        : "";

      return `<article class="ann-entry">
  <div class="ann-body">
    ${quoteHtml}
    ${metaHtml}
    ${commentHtml}
  </div>
</article>`;
    })
    .join("\n");

  const copyAllHtml = groupCopyText
    ? `<div class="ann-copy-all-wrap">
  <button type="button" class="ann-copy-all" data-copy="${escapeAttr(groupCopyText)}" data-label-copy="${escapeAttr(copyAllLabel)}" data-label-copied="${escapeAttr(copiedLabel)}" title="${escapeAttr(copyAllLabel)}" aria-label="${escapeAttr(copyAllLabel)}">${escapeHtml(copyAllLabel)}</button>
</div>`
    : "";

  return `<section class="annotations" aria-label="${escapeAttr(getString("item-share-annotations-heading"))}">
  <div class="annotations-head">
    <h2>${escapeHtml(getString("item-share-annotations-heading"))}</h2>
    ${copyAllHtml}
  </div>
  <div class="ann-stream">
    ${entriesHtml}
  </div>
</section>`;
}

const ANNOTATIONS_CSS = `
  .annotations {
    margin-top: 2rem;
  }
  .annotations-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    margin-bottom: 0.75rem;
  }
  .annotations-head h2 {
    font-family: system-ui, sans-serif;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin: 0;
  }
  .ann-stream {
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }
  .ann-entry {
    min-width: 0;
  }
  .ann-body {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
    padding: 0.35rem 0.45rem;
    margin: -0.35rem -0.45rem;
    border-radius: 0.35rem;
  }
  .ann-body:hover {
    background: color-mix(in srgb, var(--muted) 10%, transparent);
  }
  .ann-quote {
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    font-size: 1.2rem;
    line-height: 1.55;
    letter-spacing: 0.005em;
    white-space: pre-wrap;
  }
  .ann-mark {
    --highlight-color: #ffd400;
    color: inherit;
    font: inherit;
    font-weight: 450;
    font-style: normal;
    padding: 0.04em 0.14em;
    border-radius: 0.08em;
    background-color: transparent;
    background-image: linear-gradient(
      to bottom,
      transparent 0.1em,
      color-mix(in srgb, var(--highlight-color) 58%, var(--panel)) 0.1em,
      color-mix(in srgb, var(--highlight-color) 58%, var(--panel)) calc(100% - 0.06em),
      transparent calc(100% - 0.06em)
    );
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .ann-meta {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    font-family: system-ui, sans-serif;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .ann-location { font-variant-numeric: tabular-nums; }
  .ann-meta-sep { opacity: 0.7; }
  .ann-tags {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }
  .ann-tag {
    display: inline-block;
    max-width: 9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.05rem 0.45rem;
    border: 1px solid color-mix(in srgb, var(--muted) 40%, transparent);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font-size: inherit;
    line-height: 1.35;
  }
  .ann-copy,
  .ann-copy-all {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border: none;
    background: transparent;
    color: inherit;
    padding: 0;
    margin: 0;
    font: inherit;
    font-size: inherit;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
  }
  .ann-copy-sep { opacity: 0; }
  .ann-body:hover .ann-copy,
  .ann-body:focus-within .ann-copy,
  .ann-copy:focus-visible,
  .ann-copy.is-copied {
    opacity: 1;
  }
  .ann-body:hover .ann-copy-sep,
  .ann-body:focus-within .ann-copy-sep,
  .ann-body:has(.ann-copy.is-copied) .ann-copy-sep {
    opacity: 0.7;
  }
  .ann-copy:hover { color: var(--ink); }
  .ann-copy.is-copied { color: #15803d; }
  .ann-copy:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
    border-radius: 0.2rem;
  }
  .ann-comment {
    align-self: flex-end;
    max-width: min(28rem, 92%);
    box-sizing: border-box;
    margin-block-start: 0.15rem;
    padding: 0.55rem 0.8rem 0.6rem;
    border-radius: 1rem 1rem 0.25rem 1rem;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
    font-family: system-ui, sans-serif;
    font-size: 0.95rem;
    line-height: 1.45;
    color: color-mix(in srgb, var(--ink) 88%, transparent);
    white-space: pre-wrap;
    text-align: start;
  }
  .ann-copy-all-wrap {
    display: flex;
    justify-content: flex-end;
  }
  .ann-copy-all {
    font-family: system-ui, sans-serif;
    font-size: 0.75rem;
    color: var(--muted);
    padding: 0.2rem 0.35rem;
    border-radius: 0.3rem;
  }
  .annotations-head:hover .ann-copy-all,
  .annotations-head:focus-within .ann-copy-all,
  .ann-copy-all:focus-visible,
  .ann-copy-all.is-copied {
    opacity: 1;
  }
  .ann-copy-all:hover {
    color: var(--ink);
    background: color-mix(in srgb, var(--muted) 12%, transparent);
  }
  .ann-copy-all.is-copied {
    color: #15803d;
    background: color-mix(in srgb, #15803d 12%, transparent);
  }
  .ann-copy-all:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
`;

const ANNOTATIONS_SCRIPT = `
<script>
(function () {
  var COPIED_MS = 900;
  function flash(btn) {
    var copy = btn.getAttribute("data-label-copy") || "Copy";
    var copied = btn.getAttribute("data-label-copied") || "Copied";
    btn.classList.add("is-copied");
    btn.setAttribute("aria-label", copied);
    btn.setAttribute("title", copied);
    btn.textContent = copied;
    clearTimeout(btn._flashTimer);
    btn._flashTimer = setTimeout(function () {
      btn.classList.remove("is-copied");
      btn.setAttribute("aria-label", copy);
      btn.setAttribute("title", copy);
      btn.textContent = copy;
    }, COPIED_MS);
  }
  function onClick(ev) {
    var btn = ev.target.closest(".ann-copy, .ann-copy-all");
    if (!btn) return;
    ev.preventDefault();
    var text = btn.getAttribute("data-copy") || "";
    if (!text) return;
    var done = function () { flash(btn); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          done();
        } catch (e) {}
      });
    } else {
      try {
        var ta2 = document.createElement("textarea");
        ta2.value = text;
        ta2.setAttribute("readonly", "");
        ta2.style.position = "fixed";
        ta2.style.left = "-9999px";
        document.body.appendChild(ta2);
        ta2.select();
        document.execCommand("copy");
        document.body.removeChild(ta2);
        done();
      } catch (e) {}
    }
  }
  document.addEventListener("click", onClick);
})();
</script>
`;

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

  const coverBlock = `<div class="sv-page item-share-cover">${buildShareCoverHtml(
    {
      itemType: opts.itemType,
      coverDataUrl: opts.coverDataUrl,
      coverPlaceholder: opts.coverPlaceholder,
    },
  )}</div>`;

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

  const annotations = opts.annotations || [];
  const annotationsHtml = buildAnnotationsSectionHtml(annotations);
  const annotationsCss = annotationsHtml ? ANNOTATIONS_CSS : "";
  const annotationsScript = annotationsHtml ? ANNOTATIONS_SCRIPT : "";

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
${opts.highwireMetaHtml || ""}
<style>
  :root {
    --bg: #fafafa;
    --ink: #111;
    --muted: #666;
    --line: #e5e5e5;
    --panel: #fff;
    --accent: #2563eb;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: var(--ink);
    background: var(--bg);
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
  .item-share-cover {
    width: 100%;
    max-width: 220px;
    min-width: 0;
  }
  .item-share-cover .syllabus-gallery-cover-portrait,
  .item-share-cover .syllabus-gallery-cover-video,
  .item-share-cover .syllabus-gallery-cover-web,
  .item-share-cover .syllabus-gallery-cover-square,
  .item-share-cover .syllabus-gallery-cover-natural,
  .item-share-cover .syllabus-gallery-cover-with-binder {
    width: 100%;
  }
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
${opts.coverCss || ""}
${annotationsCss}
</style>
</head>
<body>
${coinsHiddenBlock(opts.coinsHtml || "")}  <div class="wrap">
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
    ${annotationsHtml}
    ${viewer || ""}
    ${creditHtml}
  </div>
  ${annotationsScript}
</body>
</html>`;
}

/** Title used when building share HTML (exported for tests). */
export function itemShareDisplayTitle(item: Zotero.Item): string {
  return getItemTitle(item) || getString("item-share-untitled");
}
