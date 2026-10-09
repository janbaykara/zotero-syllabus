/** Static HTML shell that loads share.json + the public viewer. */

import { SHARE_JSON, SHARE_VIEWER_CSS, SHARE_VIEWER_JS } from "./sharePayload";
import { coinsHiddenBlock, extractCoinsSpans } from "./zoteroCoins";

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

export function buildShareIndexHtml(opts: {
  title: string;
  description?: string;
  canonicalUrl: string;
  ogImageUrl?: string;
  /**
   * CSL bibliography HTML (or pre-extracted COinS). Spans are inlined in the
   * static shell so the Zotero Connector can multi-detect before SPA hydrate.
   */
  bibliographyHtml?: string;
  coinsHtml?: string;
}): string {
  const title = opts.title || "Reading list";
  const safeTitle = escapeHtml(title);
  const desc = (opts.description || "").trim();
  const metaParts: string[] = [
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${safeTitle}</title>`,
  ];
  if (desc) {
    metaParts.push(
      `<meta name="description" content="${escapeAttr(desc)}">`,
      `<meta property="og:description" content="${escapeAttr(desc)}">`,
      `<meta name="twitter:description" content="${escapeAttr(desc)}">`,
    );
  }
  metaParts.push(
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${escapeAttr(opts.canonicalUrl)}">`,
    `<meta name="twitter:card" content="${opts.ogImageUrl ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<link rel="canonical" href="${escapeAttr(opts.canonicalUrl)}">`,
  );
  if (opts.ogImageUrl) {
    metaParts.push(
      `<meta property="og:image" content="${escapeAttr(opts.ogImageUrl)}">`,
      `<meta name="twitter:image" content="${escapeAttr(opts.ogImageUrl)}">`,
    );
  }

  const coins =
    (opts.coinsHtml || "").trim() ||
    extractCoinsSpans(opts.bibliographyHtml || "");

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:only light">
<head>
${metaParts.join("\n")}
<link rel="stylesheet" href="${SHARE_VIEWER_CSS}">
</head>
<body>
${coinsHiddenBlock(coins)}<div id="root"></div>
<script>
window.__SYLLABUS_SHARE_JSON__=${JSON.stringify(SHARE_JSON)};
</script>
<script src="${SHARE_VIEWER_JS}" defer></script>
</body>
</html>`;
}
