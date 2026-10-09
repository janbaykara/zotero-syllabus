import type { Env } from "./types";
import { queryViewStats, syllabusStatsKey, type ViewStats } from "./analytics";
import {
  readSyllabusItemKeys,
  removeSyllabusFromItems,
  unpublishItemPage,
} from "./itemRefs";
import {
  PathError,
  itemObjectKey,
  objectKey,
  publicUrlForItem,
  publicUrlForSyllabus,
  userSyllabusPrefix,
} from "./paths";
import { reconcileUsage } from "./quota";
import { syllabusMetaFromCustomMetadata } from "./syllabusMeta";

export type ShareKind = "syllabus" | "item";

/** One published syllabus or individual item share page. */
export type PublishedShare = {
  kind: ShareKind;
  userId: string;
  libraryId: string;
  /** Set when kind === "syllabus". */
  collectionKey: string;
  /** Set when kind === "item". */
  itemKey: string;
  publicUrl: string;
  bytes: number;
  files: number;
  hasIndex: boolean;
  title: string;
  courseCode: string;
  institution: string;
  /** Item shares: localized item type. */
  itemType: string;
  /** Item / collection shares: "y" | "n" | "". */
  annotations: string;
  /** Collection shares: "syllabus" | "gallery" | "". */
  shareKind: string;
  /** True when published from a development plugin build. */
  dev: boolean;
};

/** @deprecated Prefer PublishedShare */
export type PublishedSyllabus = PublishedShare;

export type AdminReport = {
  /** All shares (syllabi + item pages), sorted. */
  shares: PublishedShare[];
  /** Alias of shares filtered to syllabi (kept for chart helpers). */
  syllabi: PublishedShare[];
  totalBytes: number;
  totalFiles: number;
  syllabusCount: number;
  itemCount: number;
  userCount: number;
  views: ViewStats;
};

const SYLLABUS_KEY = /^users\/([^/]+)\/syllabi\/([^/]+)\/([^/]+)\/(.+)$/;
const ITEM_KEY = /^users\/([^/]+)\/items\/([^/]+)\/([^/]+)\/(.+)$/;

/** Timing-safe equality for secrets of equal length; rejects otherwise. */
export function adminKeyMatches(
  provided: string | null,
  expected: string | undefined,
): boolean {
  if (!expected || !provided) {
    return false;
  }
  const a = provided;
  const b = expected;
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function shareId(
  kind: ShareKind,
  userId: string,
  libraryId: string,
  key: string,
): string {
  return `${kind}\0${userId}\0${libraryId}\0${key}`;
}

function shareStatsKey(row: PublishedShare): string {
  if (row.kind === "item") {
    return syllabusStatsKey(row.userId, row.libraryId, `item/${row.itemKey}`);
  }
  return syllabusStatsKey(row.userId, row.libraryId, row.collectionKey);
}

function shareSortLabel(row: PublishedShare): string {
  return (
    row.title.trim() ||
    row.courseCode.trim() ||
    (row.kind === "item" ? row.itemKey : row.collectionKey)
  );
}

/** Parallel head() of index.html customMetadata after a cheap key-only list. */
async function attachIndexMeta(
  env: Env,
  shares: PublishedShare[],
): Promise<void> {
  await Promise.all(
    shares.map(async (row) => {
      try {
        const key =
          row.kind === "item"
            ? itemObjectKey(
                row.userId,
                row.libraryId,
                row.itemKey,
                "index.html",
              )
            : objectKey(
                row.userId,
                row.libraryId,
                row.collectionKey,
                "index.html",
              );
        const obj = await env.BUCKET.head(key);
        const meta = syllabusMetaFromCustomMetadata(obj?.customMetadata);
        row.title = meta.title;
        row.courseCode = meta.courseCode;
        row.institution = meta.institution;
        row.itemType = meta.itemType;
        row.annotations = meta.annotations;
        row.shareKind = meta.shareKind;
        row.dev = meta.dev === "y";
      } catch {
        // Leave empty; storage row is still useful.
      }
    }),
  );
}

type AccRow = {
  kind: ShareKind;
  userId: string;
  libraryId: string;
  collectionKey: string;
  itemKey: string;
  bytes: number;
  files: number;
  hasIndex: boolean;
};

/** List published syllabi and item share pages by scanning R2 under users/. */
export async function listPublishedSyllabi(
  env: Env,
  publicBaseUrl: string,
): Promise<AdminReport> {
  const base = publicBaseUrl.replace(/\/+$/, "");
  const byId = new Map<string, AccRow>();

  let cursor: string | undefined;
  do {
    const listed = await env.BUCKET.list({
      prefix: "users/",
      cursor,
      limit: 1000,
    });
    for (const obj of listed.objects) {
      const syllabusMatch = SYLLABUS_KEY.exec(obj.key);
      if (syllabusMatch) {
        const userId = syllabusMatch[1];
        const libraryId = syllabusMatch[2];
        const collectionKey = syllabusMatch[3];
        const relPath = syllabusMatch[4];
        const id = shareId("syllabus", userId, libraryId, collectionKey);
        let row = byId.get(id);
        if (!row) {
          row = {
            kind: "syllabus",
            userId,
            libraryId,
            collectionKey,
            itemKey: "",
            bytes: 0,
            files: 0,
            hasIndex: false,
          };
          byId.set(id, row);
        }
        row.bytes += obj.size;
        if (relPath === "index.html") {
          row.hasIndex = true;
        } else if (relPath.startsWith("files/")) {
          row.files += 1;
        }
        continue;
      }

      const itemMatch = ITEM_KEY.exec(obj.key);
      if (!itemMatch) continue;
      const userId = itemMatch[1];
      const libraryId = itemMatch[2];
      const itemKey = itemMatch[3];
      const relPath = itemMatch[4];
      const id = shareId("item", userId, libraryId, itemKey);
      let row = byId.get(id);
      if (!row) {
        row = {
          kind: "item",
          userId,
          libraryId,
          collectionKey: "",
          itemKey,
          bytes: 0,
          files: 0,
          hasIndex: false,
        };
        byId.set(id, row);
      }
      row.bytes += obj.size;
      if (relPath === "index.html") {
        row.hasIndex = true;
      } else if (relPath.startsWith("files/")) {
        row.files += 1;
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  const shares: PublishedShare[] = [];
  for (const row of byId.values()) {
    // Only rows with a public cover page (syllabus publish or Share via URL).
    if (!row.hasIndex) continue;
    if (row.kind === "syllabus") {
      shares.push({
        kind: "syllabus",
        userId: row.userId,
        libraryId: row.libraryId,
        collectionKey: row.collectionKey,
        itemKey: "",
        publicUrl: publicUrlForSyllabus(
          base,
          row.userId,
          row.libraryId,
          row.collectionKey,
        ),
        bytes: row.bytes,
        files: row.files,
        hasIndex: true,
        title: "",
        courseCode: "",
        institution: "",
        itemType: "",
        annotations: "",
        shareKind: "",
        dev: false,
      });
    } else {
      shares.push({
        kind: "item",
        userId: row.userId,
        libraryId: row.libraryId,
        collectionKey: "",
        itemKey: row.itemKey,
        publicUrl: publicUrlForItem(
          base,
          row.userId,
          row.libraryId,
          row.itemKey,
        ),
        bytes: row.bytes,
        files: row.files,
        hasIndex: true,
        title: "",
        courseCode: "",
        institution: "",
        itemType: "",
        annotations: "",
        shareKind: "",
        dev: false,
      });
    }
  }

  await attachIndexMeta(env, shares);

  shares.sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.userId.localeCompare(b.userId);
    }
    if (a.kind !== b.kind) {
      // Syllabi first, then items.
      return a.kind === "syllabus" ? -1 : 1;
    }
    const titleCmp = shareSortLabel(a).localeCompare(shareSortLabel(b));
    if (titleCmp !== 0) return titleCmp;
    return b.bytes - a.bytes;
  });

  let totalBytes = 0;
  let totalFiles = 0;
  let syllabusCount = 0;
  let itemCount = 0;
  const users = new Set<string>();
  const excludeFromChartKeys = new Set<string>();
  for (const s of shares) {
    totalBytes += s.bytes;
    totalFiles += s.files;
    users.add(s.userId);
    if (s.kind === "syllabus") syllabusCount += 1;
    else itemCount += 1;
    if (s.dev) {
      excludeFromChartKeys.add(shareStatsKey(s));
    }
  }

  let views: ViewStats;
  try {
    views = await queryViewStats(env, { excludeFromChartKeys });
  } catch (e) {
    views = {
      available: false,
      error: e instanceof Error ? e.message : "Views unavailable",
      pageViews30d: 0,
      fileDownloads30d: 0,
      citationDownloads30d: 0,
      daily: [],
      bySyllabus: {},
    };
  }

  return {
    shares,
    syllabi: shares.filter((s) => s.kind === "syllabus"),
    totalBytes,
    totalFiles,
    syllabusCount,
    itemCount,
    userCount: users.size,
    views,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatCount(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function visitsLabel(n: number): string {
  return `${Math.round(n)} ${n === 1 ? "visit" : "visits"}`;
}

function shareChartLabel(
  sharesByKey: Map<string, PublishedShare>,
  key: string,
): string {
  const parts = key.split("/");
  const userIdFromKey = parts[0] || "";
  const s = sharesByKey.get(key);
  let label = "";
  if (s) {
    const code = s.courseCode.trim();
    const title = s.title.trim();
    const kind = s.kind === "item" ? "Item" : "Syllabus";
    if (code && title) label = `${kind}: ${code} — ${title}`;
    else if (code) label = `${kind}: ${code}`;
    else if (title) label = `${kind}: ${title}`;
    else if (s.kind === "item" && s.itemKey) label = `${kind}: ${s.itemKey}`;
    else if (s.collectionKey) label = `${kind}: ${s.collectionKey}`;
  }
  if (!label) {
    if (parts[2] === "item" && parts[3]) label = `Item: ${parts[3]}`;
    else label = parts[2] || key;
  }
  const userId = (s?.userId || userIdFromKey).trim();
  return userId ? `${userId} · ${label}` : label;
}

function renderDailyChart(views: ViewStats, shares: PublishedShare[]): string {
  if (!views.available) {
    return `<p class="muted chart-note">${escapeHtml(views.error || "Views unavailable")}</p>`;
  }
  const sharesByKey = new Map(shares.map((s) => [shareStatsKey(s), s]));
  const max = Math.max(1, ...views.daily.map((d) => d.pageViews));
  const bars = views.daily
    .map((d) => {
      const pct = Math.round((d.pageViews / max) * 100);
      const total = visitsLabel(d.pageViews);
      const top = d.topSyllabi || [];
      const topRows = top
        .map((t) => {
          const share = sharesByKey.get(t.key);
          const isDev = !!(t.dev || share?.dev);
          const name = escapeHtml(shareChartLabel(sharesByKey, t.key));
          const pill = isDev
            ? ` <span class="type-pill type-dev" title="Development plugin publish">Dev</span>`
            : "";
          return `<div class="bar-tip-row${isDev ? " is-dev" : ""}"><span class="bar-tip-name">${name}${pill}</span><span class="bar-tip-n">${escapeHtml(formatCount(t.pageViews))}</span></div>`;
        })
        .join("");
      const list = topRows ? `<div class="bar-tip-list">${topRows}</div>` : "";
      const ariaTop = top
        .map((t) => {
          const share = sharesByKey.get(t.key);
          const isDev = !!(t.dev || share?.dev);
          const name = shareChartLabel(sharesByKey, t.key);
          return `${name}${isDev ? " (Dev)" : ""}: ${visitsLabel(t.pageViews)}`;
        })
        .join("; ");
      const aria = ariaTop
        ? `${d.day}: ${total}. ${ariaTop}`
        : `${d.day}: ${total}`;
      return `<div class="bar" role="listitem" tabindex="0" aria-label="${escapeHtml(aria)}" style="--pct:${pct}%"><template class="bar-tip"><div class="bar-tip-head"><span class="bar-tip-date">${escapeHtml(d.day)}</span><span class="bar-tip-total">${escapeHtml(total)}</span></div>${list}</template><div class="bar-fill"></div></div>`;
    })
    .join("");
  const first = views.daily[0]?.day || "";
  const last = views.daily[views.daily.length - 1]?.day || "";
  return `<div class="chart-wrap">
  <div class="chart-label muted">Page views by day (30d)</div>
  <div class="chart" role="list" aria-label="Daily page views for the last 30 days">${bars}</div>
  <div class="chart-axis muted"><span>${escapeHtml(first)}</span><span>${escapeHtml(last)}</span></div>
  <div class="chart-hover" hidden></div>
</div>`;
}

function typeLabel(row: PublishedShare | ShareKind): string {
  if (typeof row === "string") {
    return row === "item" ? "Item" : "Syllabus";
  }
  if (row.kind === "item") return "Item";
  if (row.shareKind === "gallery") return "Reading list";
  return "Syllabus";
}

/** Metadata column: code + institution (syllabus) or item type (item). */
function formatShareMetadata(row: PublishedShare): {
  text: string;
  sort: string;
} {
  if (row.kind === "item") {
    const text = row.itemType.trim();
    return { text, sort: text.toLowerCase() };
  }
  const parts: string[] = [];
  if (row.courseCode.trim()) parts.push(row.courseCode.trim());
  if (row.institution.trim()) parts.push(row.institution.trim());
  const text = parts.join(" · ");
  return { text, sort: text.toLowerCase() };
}

/** Annotations column: checked box when included, dash when not. */
function formatAnnotationsCell(row: PublishedShare): {
  html: string;
  sort: number;
} {
  if (row.annotations === "y") {
    return {
      html: `<input type="checkbox" class="ann-check" checked disabled title="Annotations included" aria-label="Annotations included" />`,
      sort: 2,
    };
  }
  if (row.annotations === "n") {
    return {
      html: `<span class="muted" title="Annotations not included">—</span>`,
      sort: 1,
    };
  }
  return {
    html: `<span class="muted">—</span>`,
    sort: 0,
  };
}

function userSummary(rows: PublishedShare[]): string {
  const syllabi = rows.filter((r) => r.kind === "syllabus").length;
  const items = rows.filter((r) => r.kind === "item").length;
  const parts: string[] = [];
  if (syllabi) {
    parts.push(`${syllabi} ${syllabi === 1 ? "syllabus" : "syllabi"}`);
  }
  if (items) {
    parts.push(`${items} ${items === 1 ? "item" : "items"}`);
  }
  return parts.join(", ") || "0 shares";
}

export function renderAdminHtml(report: AdminReport): string {
  const views = report.views;
  const byUser = new Map<string, PublishedShare[]>();
  for (const s of report.shares) {
    const list = byUser.get(s.userId) || [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  const sections: string[] = [];
  for (const [userId, rows] of byUser) {
    const userBytes = rows.reduce((n, r) => n + r.bytes, 0);
    const userFiles = rows.reduce((n, r) => n + r.files, 0);
    const trs = rows
      .map((r) => {
        const key = shareStatsKey(r);
        const counts = views.bySyllabus[key];
        const viewCell = views.available
          ? formatCount(counts?.pageViews ?? 0)
          : "—";
        const dlCell = views.available
          ? formatCount(counts?.fileDownloads ?? 0)
          : "—";
        const citeCell = views.available
          ? formatCount(counts?.citationDownloads ?? 0)
          : "—";
        const label = shareSortLabel(r) || r.publicUrl;
        const viewSort = views.available ? String(counts?.pageViews ?? 0) : "";
        const dlSort = views.available
          ? String(counts?.fileDownloads ?? 0)
          : "";
        const citeSort = views.available
          ? String(counts?.citationDownloads ?? 0)
          : "";
        const type = typeLabel(r);
        const meta = formatShareMetadata(r);
        const ann = formatAnnotationsCell(r);
        const deleteAttrs =
          r.kind === "item"
            ? `data-kind="item" data-user-id="${escapeHtml(r.userId)}" data-library-id="${escapeHtml(r.libraryId)}" data-item-key="${escapeHtml(r.itemKey)}" data-label="${escapeHtml(label)}"`
            : `data-kind="syllabus" data-user-id="${escapeHtml(r.userId)}" data-library-id="${escapeHtml(r.libraryId)}" data-collection-key="${escapeHtml(r.collectionKey)}" data-label="${escapeHtml(label)}"`;
        const typeClass =
          r.kind === "item"
            ? "item"
            : r.shareKind === "gallery"
              ? "gallery"
              : "syllabus";
        const typeSort =
          r.kind === "item"
            ? "item"
            : r.shareKind === "gallery"
              ? "gallery"
              : "syllabus";
        const typePills = `<span class="type-pill type-${typeClass}">${escapeHtml(type)}</span>`;
        const devCell = r.dev
          ? `<span class="type-pill type-dev" title="Published from a development plugin build">Dev</span>`
          : `<span class="muted">—</span>`;
        const titleText = r.title.trim() || shareSortLabel(r) || r.publicUrl;
        const titleLinkClass = r.dev ? "title-link is-dev" : "title-link";
        const titleTitle = r.dev
          ? `Development plugin publish — ${r.publicUrl}`
          : r.publicUrl;
        const titleCell = `<a class="${titleLinkClass}" href="${escapeHtml(r.publicUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(titleTitle)}">${escapeHtml(titleText)}</a>`;
        return `<tr${r.dev ? ` class="is-dev"` : ""}>
  <td class="check-col"><input type="checkbox" class="row-check" aria-label="Select ${escapeHtml(titleText)}" ${deleteAttrs}></td>
  <td class="mono" data-sort="${escapeHtml(r.userId)}">${escapeHtml(r.userId)}</td>
  <td data-sort="${escapeHtml(typeSort)}">${typePills}</td>
  <td class="dev-col" data-sort="${r.dev ? "1" : "0"}" data-sort-type="num">${devCell}</td>
  <td data-sort="${escapeHtml(titleText.toLowerCase())}">${titleCell}</td>
  <td data-sort="${escapeHtml(meta.sort)}">${meta.text ? escapeHtml(meta.text) : `<span class="muted">—</span>`}</td>
  <td class="ann-col" data-sort="${ann.sort}" data-sort-type="num">${ann.html}</td>
  <td class="num" data-sort="${r.bytes}" data-sort-type="num">${escapeHtml(formatBytes(r.bytes))}</td>
  <td class="num" data-sort="${r.files}" data-sort-type="num">${r.files}</td>
  <td class="num" data-sort="${escapeHtml(viewSort)}" data-sort-type="num">${viewCell}</td>
  <td class="num" data-sort="${escapeHtml(dlSort)}" data-sort-type="num">${dlCell}</td>
  <td class="num" data-sort="${escapeHtml(citeSort)}" data-sort-type="num">${citeCell}</td>
  <td><button type="button" class="delete" ${deleteAttrs}>Delete</button></td>
</tr>`;
      })
      .join("\n");
    sections.push(`<section>
  <h2>User <span class="mono">${escapeHtml(userId)}</span>
    <span class="muted">— ${escapeHtml(userSummary(rows))},
    ${escapeHtml(formatBytes(userBytes))}, ${userFiles} file${userFiles === 1 ? "" : "s"}</span>
  </h2>
  <table class="sortable">
    <thead>
      <tr>
        <th scope="col" class="check-col"><input type="checkbox" class="select-table" title="Select all in this table" aria-label="Select all in this table"></th>
        <th scope="col" data-col="1"><button type="button" class="sort">User</button></th>
        <th scope="col" data-col="2"><button type="button" class="sort">Type</button></th>
        <th scope="col" data-col="3"><button type="button" class="sort">Dev</button></th>
        <th scope="col" data-col="4"><button type="button" class="sort">Title</button></th>
        <th scope="col" data-col="5"><button type="button" class="sort">Metadata</button></th>
        <th scope="col" data-col="6"><button type="button" class="sort">Annotations</button></th>
        <th scope="col" class="num" data-col="7"><button type="button" class="sort">Size</button></th>
        <th scope="col" class="num" data-col="8"><button type="button" class="sort">Files</button></th>
        <th scope="col" class="num" data-col="9"><button type="button" class="sort">Views (30d)</button></th>
        <th scope="col" class="num" data-col="10"><button type="button" class="sort">Downloads (30d)</button></th>
        <th scope="col" class="num" data-col="11"><button type="button" class="sort">Citations (30d)</button></th>
        <th></th>
      </tr>
    </thead>
    <tbody>
${trs}
    </tbody>
  </table>
</section>`);
  }

  const body =
    report.shares.length === 0
      ? `<p class="muted">No published syllabi or shared items found.</p>`
      : sections.join("\n");

  const viewsTotal = views.available ? formatCount(views.pageViews30d) : "—";
  const downloadsTotal = views.available
    ? formatCount(views.fileDownloads30d)
    : "—";
  const citationsTotal = views.available
    ? formatCount(views.citationDownloads30d)
    : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Syllabus publish admin</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 1.5rem 1.75rem 3rem;
      font: 14px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #111;
      background: #fafafa;
    }
    h1 { font-size: 1.35rem; margin: 0 0 0.35rem; }
    h2 { font-size: 1.05rem; margin: 1.75rem 0 0.6rem; font-weight: 600; }
    .muted { color: #6b7280; font-weight: 400; font-size: 0.92em; }
    .totals {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1.5rem;
      margin: 1rem 0 0.5rem; padding: 0.85rem 1rem;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;
    }
    .totals div strong { display: block; font-size: 1.15rem; }
    .totals div span { color: #6b7280; font-size: 12px; }
    .chart-wrap {
      position: relative;
      overflow: visible;
      margin: 0.75rem 0 1.25rem; padding: 0.85rem 1rem;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;
    }
    .chart-label { margin-bottom: 0.5rem; }
    .chart {
      display: flex; align-items: flex-end; gap: 2px;
      height: 88px; width: 100%;
    }
    .chart .bar {
      position: relative;
      flex: 1 1 0; min-width: 0;
      height: 100%;
      display: flex; align-items: flex-end;
      background: transparent;
      outline: none;
    }
    .chart .bar-fill {
      width: 100%;
      height: var(--pct, 0%);
      min-height: 2px;
      background: #3b82f6;
      border-radius: 2px 2px 0 0;
    }
    .chart .bar:hover,
    .chart .bar:focus-visible,
    .chart .bar.is-active { background: rgba(59, 130, 246, 0.08); }
    .chart .bar:hover .bar-fill,
    .chart .bar:focus-visible .bar-fill,
    .chart .bar.is-active .bar-fill { background: #1d4ed8; }
    .chart-hover {
      margin-top: 0.65rem;
      padding: 0.55rem 0.7rem;
      background: #f8fafc;
      color: #111;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.4;
    }
    .chart-hover[hidden] { display: none; }
    .chart-hover .bar-tip-head {
      display: flex; justify-content: space-between; gap: 1rem;
      align-items: baseline;
    }
    .chart-hover .bar-tip-date { color: #6b7280; font-size: 11px; }
    .chart-hover .bar-tip-total { font-weight: 600; }
    .chart-hover .bar-tip-list { margin-top: 0.35rem; }
    .chart-hover .bar-tip-row {
      display: flex; justify-content: space-between; gap: 0.75rem;
      margin-top: 0.15rem;
      align-items: baseline;
    }
    .chart-hover .bar-tip-row.is-dev {
      background: #fffbeb;
      margin-inline: -0.35rem;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
    }
    .chart-hover .bar-tip-name {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      min-width: 0;
    }
    .chart-hover .bar-tip-n { color: #6b7280; flex: 0 0 auto; }
    .chart-axis {
      display: flex; justify-content: space-between;
      margin-top: 0.35rem; font-size: 11px;
    }
    .chart-note { margin: 0.75rem 0 1rem; }
    table {
      width: 100%; border-collapse: collapse; background: #fff;
      border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;
    }
    th, td {
      text-align: left; padding: 0.45rem 0.65rem;
      border-bottom: 1px solid #eee; vertical-align: top;
    }
    th { background: #f3f4f6; font-size: 12px; text-transform: uppercase;
      letter-spacing: 0.04em; color: #4b5563; }
    tr:last-child td { border-bottom: 0; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    th.num .sort { justify-content: flex-end; }
    .type-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      white-space: nowrap;
    }
    .type-pill.type-syllabus {
      color: #1e40af;
      background: #dbeafe;
    }
    .type-pill.type-item {
      color: #065f46;
      background: #d1fae5;
    }
    .type-pill.type-gallery {
      color: #6b21a8;
      background: #f3e8ff;
    }
    .type-pill.type-dev {
      color: #92400e;
      background: #fef3c7;
    }
    tr.is-dev td { background: #fffbeb; }
    td.dev-col { white-space: nowrap; }
    td.ann-col { text-align: center; white-space: nowrap; }
    td.ann-col .ann-check {
      width: 1rem;
      height: 1rem;
      margin: 0;
      accent-color: #15803d;
      vertical-align: middle;
      pointer-events: none;
    }
    th.check-col, td.check-col {
      width: 2rem;
      text-align: center;
      vertical-align: middle;
      padding-left: 0.5rem;
      padding-right: 0.35rem;
    }
    th.check-col input, td.check-col input.row-check,
    input.select-table {
      width: 1rem;
      height: 1rem;
      margin: 0;
      accent-color: #1d4ed8;
      cursor: pointer;
      vertical-align: middle;
    }
    tr.is-selected td { background: #eff6ff; }
    tr.is-dev.is-selected td { background: #fef3c7; }
    a.title-link { color: #1d4ed8; text-decoration: underline; text-underline-offset: 0.12em; }
    a.title-link.is-dev { color: #92400e; font-weight: 600; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    a { color: #1d4ed8; word-break: break-word; }
    button.sort {
      display: inline-flex; align-items: center; gap: 0.25rem;
      width: 100%; margin: 0; padding: 0;
      font: inherit; font-size: inherit; font-weight: inherit;
      letter-spacing: inherit; text-transform: inherit; text-align: inherit;
      color: inherit; background: none; border: 0; cursor: pointer;
    }
    button.sort::after {
      content: ""; width: 0.45em; opacity: 0.35;
      border-left: 0.3em solid transparent;
      border-right: 0.3em solid transparent;
      border-bottom: 0.35em solid currentColor;
    }
    th[aria-sort="ascending"] button.sort::after { opacity: 1; }
    th[aria-sort="descending"] button.sort::after {
      opacity: 1;
      border-bottom: 0;
      border-top: 0.35em solid currentColor;
    }
    button.delete, button.bulk-delete {
      font: inherit; font-size: 12px;
      padding: 0.25rem 0.55rem;
      color: #991b1b;
      background: #fff;
      border: 1px solid #fecaca;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }
    button.delete:hover, button.bulk-delete:hover { background: #fef2f2; }
    button.delete:disabled, button.bulk-delete:disabled { opacity: 0.55; cursor: wait; }
    .bulk-bar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: none;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.65rem 1rem;
      margin: 0 0 0.85rem;
      padding: 0.65rem 0.85rem;
      background: #1e3a8a;
      color: #fff;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
    }
    .bulk-bar.is-visible { display: flex; }
    .bulk-bar .bulk-count { font-weight: 600; }
    .bulk-bar .bulk-clear {
      font: inherit; font-size: 12px;
      padding: 0.25rem 0.55rem;
      color: #fff;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.45);
      border-radius: 4px;
      cursor: pointer;
    }
    .bulk-bar .bulk-clear:hover { background: rgba(255,255,255,0.12); }
    .bulk-bar button.bulk-delete {
      background: #fff;
      color: #991b1b;
      border-color: #fecaca;
    }
    .bulk-bar .bulk-status { font-size: 12px; opacity: 0.9; }
  </style>
</head>
<body>
  <h1>Syllabus publish admin</h1>
  <p class="muted">Storage and attachment counts from R2 for published syllabi and Share via URL item pages. Metadata is course code · institution for syllabi, or item type for items (from index.html customMetadata; re-publish/sync to populate older shares). <strong>Title</strong> links to the public page. <strong>Annotations</strong> is a checkbox when the share included annotations, otherwise —. Pages published from a <strong>development</strong> plugin build are marked in the <strong>Dev</strong> column (and amber title links); they are omitted from chart bar heights and 30-day header totals, but still appear in chart tooltips with a <span class="type-pill type-dev">Dev</span> badge (row-level counts still show). Page views, file downloads, and citation exports (RIS/BIB/RDF) are last-30-day totals from Analytics Engine. Use row checkboxes for <strong>bulk delete</strong>, or Delete on a single row (syllabus wipe or item page unpublish); the publisher can re-publish from the plugin.</p>
  <div class="bulk-bar" id="bulk-bar" aria-live="polite">
    <span class="bulk-count" id="bulk-count">0 selected</span>
    <button type="button" class="bulk-delete" id="bulk-delete">Delete selected</button>
    <button type="button" class="bulk-clear" id="bulk-clear">Clear selection</button>
    <span class="bulk-status" id="bulk-status"></span>
  </div>
  <div class="totals">
    <div><strong>${report.syllabusCount}</strong><span>Syllabi</span></div>
    <div><strong>${report.itemCount}</strong><span>Items</span></div>
    <div><strong>${report.userCount}</strong><span>Users</span></div>
    <div><strong>${escapeHtml(formatBytes(report.totalBytes))}</strong><span>Total storage</span></div>
    <div><strong>${report.totalFiles}</strong><span>Total files</span></div>
    <div><strong>${viewsTotal}</strong><span>Page views (30d)</span></div>
    <div><strong>${downloadsTotal}</strong><span>File downloads (30d)</span></div>
    <div><strong>${citationsTotal}</strong><span>Citations (30d)</span></div>
  </div>
  ${renderDailyChart(views, report.shares)}
  ${body}
  <script>
  (function () {
    var key = new URLSearchParams(location.search).get("key") || "";

    function shareFromEl(el) {
      return {
        kind: el.getAttribute("data-kind") || "syllabus",
        userId: el.getAttribute("data-user-id") || "",
        libraryId: el.getAttribute("data-library-id") || "",
        collectionKey: el.getAttribute("data-collection-key") || "",
        itemKey: el.getAttribute("data-item-key") || "",
        label: el.getAttribute("data-label") || "",
      };
    }

    function deleteUrl(share) {
      var url = new URL(share.kind === "item" ? "/admin/item" : "/admin/syllabus", location.origin);
      url.searchParams.set("key", key);
      url.searchParams.set("userId", share.userId);
      url.searchParams.set("libraryId", share.libraryId);
      if (share.kind === "item") {
        url.searchParams.set("itemKey", share.itemKey);
      } else {
        url.searchParams.set("collectionKey", share.collectionKey);
      }
      return url.toString();
    }

    async function deleteShare(share) {
      if (!key || !share.userId || !share.libraryId) {
        throw new Error("Missing share identity");
      }
      if (share.kind === "item" && !share.itemKey) {
        throw new Error("Missing item key");
      }
      if (share.kind !== "item" && !share.collectionKey) {
        throw new Error("Missing collection key");
      }
      var res = await fetch(deleteUrl(share), { method: "DELETE" });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        throw new Error(body.message || body.error || ("HTTP " + res.status));
      }
      return body;
    }

    var bulkBar = document.getElementById("bulk-bar");
    var bulkCount = document.getElementById("bulk-count");
    var bulkDeleteBtn = document.getElementById("bulk-delete");
    var bulkClearBtn = document.getElementById("bulk-clear");
    var bulkStatus = document.getElementById("bulk-status");

    function selectedChecks() {
      return Array.prototype.slice.call(document.querySelectorAll("input.row-check:checked"));
    }

    function syncTableSelectAll(table) {
      var master = table.querySelector("thead input.select-table");
      if (!master) return;
      var checks = table.querySelectorAll("tbody input.row-check");
      var total = checks.length;
      var checked = 0;
      checks.forEach(function (c) { if (c.checked) checked += 1; });
      master.checked = total > 0 && checked === total;
      master.indeterminate = checked > 0 && checked < total;
    }

    function syncBulkBar() {
      var selected = selectedChecks();
      var n = selected.length;
      document.querySelectorAll("tbody tr").forEach(function (tr) {
        var check = tr.querySelector("input.row-check");
        tr.classList.toggle("is-selected", !!(check && check.checked));
      });
      document.querySelectorAll("table.sortable").forEach(syncTableSelectAll);
      if (!bulkBar) return;
      if (n === 0) {
        bulkBar.classList.remove("is-visible");
        if (bulkStatus) bulkStatus.textContent = "";
        return;
      }
      bulkBar.classList.add("is-visible");
      if (bulkCount) {
        bulkCount.textContent = n + " selected";
      }
    }

    document.querySelectorAll("input.row-check").forEach(function (check) {
      check.addEventListener("change", syncBulkBar);
    });

    document.querySelectorAll("thead input.select-table").forEach(function (master) {
      master.addEventListener("change", function () {
        var table = master.closest("table");
        if (!table) return;
        table.querySelectorAll("tbody input.row-check").forEach(function (c) {
          c.checked = master.checked;
        });
        syncBulkBar();
      });
    });

    if (bulkClearBtn) {
      bulkClearBtn.addEventListener("click", function () {
        document.querySelectorAll("input.row-check").forEach(function (c) { c.checked = false; });
        syncBulkBar();
      });
    }

    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener("click", async function () {
        var checks = selectedChecks();
        if (!checks.length || !key) return;
        var shares = checks.map(shareFromEl);
        var labels = shares.map(function (s) { return s.label || s.itemKey || s.collectionKey; });
        var preview = labels.slice(0, 8).join("\\n");
        if (labels.length > 8) preview += "\\n… and " + (labels.length - 8) + " more";
        if (!confirm("Delete " + shares.length + " published share" + (shares.length === 1 ? "" : "s") + "?\\n\\n" + preview + "\\n\\nThis cannot be undone.")) {
          return;
        }
        bulkDeleteBtn.disabled = true;
        document.querySelectorAll("button.delete").forEach(function (b) { b.disabled = true; });
        document.querySelectorAll("input.row-check, input.select-table").forEach(function (c) { c.disabled = true; });
        var failed = [];
        for (var i = 0; i < shares.length; i++) {
          if (bulkStatus) {
            bulkStatus.textContent = "Deleting " + (i + 1) + " of " + shares.length + "…";
          }
          try {
            await deleteShare(shares[i]);
          } catch (err) {
            failed.push((shares[i].label || shares[i].itemKey || shares[i].collectionKey) + ": " + (err && err.message ? err.message : String(err)));
          }
        }
        if (failed.length) {
          alert("Deleted " + (shares.length - failed.length) + " of " + shares.length + ". Failures:\\n\\n" + failed.join("\\n"));
          location.reload();
          return;
        }
        location.reload();
      });
    }

    document.querySelectorAll("button.delete").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var share = shareFromEl(btn);
        var label = share.label || share.collectionKey || share.itemKey;
        if (!key || !share.userId || !share.libraryId) return;
        if (share.kind === "item") {
          if (!share.itemKey) return;
          if (!confirm("Unpublish shared item?\\n\\n" + label + "\\n\\nRemoves the public item page (attached files stay if a syllabus still links to them).")) {
            return;
          }
        } else {
          if (!share.collectionKey) return;
          if (!confirm("Delete published syllabus?\\n\\n" + label + "\\n\\nThis cannot be undone.")) {
            return;
          }
        }
        btn.disabled = true;
        try {
          await deleteShare(share);
          location.reload();
        } catch (err) {
          alert("Delete failed: " + (err && err.message ? err.message : String(err)));
          btn.disabled = false;
        }
      });
    });

    syncBulkBar();

    function cellValue(td) {
      if (!td) return { empty: true, num: 0, text: "" };
      var raw = td.getAttribute("data-sort");
      if (raw == null) raw = (td.textContent || "").trim();
      var empty = raw === "";
      if (td.getAttribute("data-sort-type") === "num") {
        var n = empty ? Number.NEGATIVE_INFINITY : Number(raw);
        return { empty: empty, num: Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY, text: raw };
      }
      return { empty: empty, num: 0, text: String(raw).toLowerCase() };
    }

    function compareCells(a, b, col, dir) {
      var av = cellValue(a.children[col]);
      var bv = cellValue(b.children[col]);
      if (av.empty !== bv.empty) return av.empty ? 1 : -1;
      var td = a.children[col];
      var cmp;
      if (td && td.getAttribute("data-sort-type") === "num") {
        cmp = av.num - bv.num;
      } else {
        cmp = av.text < bv.text ? -1 : av.text > bv.text ? 1 : 0;
      }
      return dir === "desc" ? -cmp : cmp;
    }

    var chart = document.querySelector(".chart");
    var hover = document.querySelector(".chart-hover");
    if (chart && hover) {
      var activeBar = null;
      function showBar(bar) {
        var src = bar.querySelector(".bar-tip");
        if (!src) return;
        if (activeBar) activeBar.classList.remove("is-active");
        activeBar = bar;
        bar.classList.add("is-active");
        hover.innerHTML = src.innerHTML || "";
        hover.hidden = false;
      }
      function hideBar() {
        if (activeBar) activeBar.classList.remove("is-active");
        activeBar = null;
        hover.hidden = true;
        hover.innerHTML = "";
      }
      chart.addEventListener("pointerover", function (e) {
        var bar = e.target.closest(".bar");
        if (bar) showBar(bar);
      });
      chart.addEventListener("pointerleave", hideBar);
      chart.addEventListener("focusin", function (e) {
        var bar = e.target.closest(".bar");
        if (bar) showBar(bar);
      });
      chart.addEventListener("focusout", function (e) {
        if (!chart.contains(e.relatedTarget)) hideBar();
      });
    }

    document.querySelectorAll("table.sortable").forEach(function (table) {
      var tbody = table.tBodies[0];
      if (!tbody) return;
      table.querySelectorAll("thead th[data-col]").forEach(function (th) {
        var btn = th.querySelector("button.sort");
        if (!btn) return;
        btn.addEventListener("click", function () {
          var col = Number(th.getAttribute("data-col"));
          var current = th.getAttribute("aria-sort");
          var dir = current === "ascending" ? "desc" : "asc";
          table.querySelectorAll("thead th[data-col]").forEach(function (other) {
            other.removeAttribute("aria-sort");
          });
          th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
          var rows = Array.prototype.slice.call(tbody.rows);
          rows.sort(function (a, b) { return compareCells(a, b, col, dir); });
          rows.forEach(function (row) { tbody.appendChild(row); });
        });
      });
    });
  })();
  </script>
</body>
</html>`;
}

function adminJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function requireAdminKey(request: Request, env: Env): boolean {
  const url = new URL(request.url);
  return adminKeyMatches(
    url.searchParams.get("key"),
    env.ADMIN_DASHBOARD_SECRET,
  );
}

export async function handleAdminDashboard(
  request: Request,
  env: Env,
  publicBaseUrl: string,
): Promise<Response> {
  if (!requireAdminKey(request, env)) {
    return adminJson({ error: "not_found" }, 404);
  }

  const report = await listPublishedSyllabi(env, publicBaseUrl);
  return new Response(renderAdminHtml(report), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

/** Wipe one published syllabus (all R2 keys under the prefix). Admin secret required. */
export async function handleAdminDeleteSyllabus(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!requireAdminKey(request, env)) {
    return adminJson({ error: "not_found" }, 404);
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || "";
  const libraryId = url.searchParams.get("libraryId") || "";
  const collectionKey = url.searchParams.get("collectionKey") || "";

  let prefix: string;
  try {
    prefix = userSyllabusPrefix(userId, libraryId, collectionKey);
  } catch (e) {
    if (e instanceof PathError) {
      return adminJson({ error: "bad_path", message: e.message }, 400);
    }
    throw e;
  }

  const itemKeys = await readSyllabusItemKeys(
    env,
    userId,
    libraryId,
    collectionKey,
    prefix,
  );

  let cursor: string | undefined;
  let deleted = 0;
  do {
    const listed = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    await Promise.all(listed.objects.map((obj) => env.BUCKET.delete(obj.key)));
    deleted += listed.objects.length;
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  const gc = await removeSyllabusFromItems(
    env,
    userId,
    libraryId,
    collectionKey,
    itemKeys,
  );

  const usageBytes = await reconcileUsage(env, userId);
  return adminJson({
    ok: true,
    deleted: deleted + gc.gcDeleted,
    gcDeleted: gc.gcDeleted,
    usageBytes,
  });
}

/** Unpublish one shared item page (same as plugin Unpublish shared URL). */
export async function handleAdminDeleteItem(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!requireAdminKey(request, env)) {
    return adminJson({ error: "not_found" }, 404);
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || "";
  const libraryId = url.searchParams.get("libraryId") || "";
  const itemKey = url.searchParams.get("itemKey") || "";

  try {
    const result = await unpublishItemPage(env, userId, libraryId, itemKey);
    const usageBytes = await reconcileUsage(env, userId);
    return adminJson({
      ok: true,
      deleted: result.deleted,
      gcDeleted: result.gcDeleted,
      refs: result.refs,
      usageBytes,
    });
  } catch (e) {
    if (e instanceof PathError) {
      return adminJson({ error: "bad_path", message: e.message }, 400);
    }
    throw e;
  }
}
