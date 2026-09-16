import type { Env } from "./types";
import {
  queryViewStats,
  syllabusStatsKey,
  type ViewStats,
} from "./analytics";
import { objectKey } from "./paths";
import { syllabusMetaFromCustomMetadata } from "./syllabusMeta";

export type PublishedSyllabus = {
  userId: string;
  libraryId: string;
  collectionKey: string;
  publicUrl: string;
  bytes: number;
  files: number;
  hasIndex: boolean;
  title: string;
  courseCode: string;
  institution: string;
};

export type AdminReport = {
  syllabi: PublishedSyllabus[];
  totalBytes: number;
  totalFiles: number;
  userCount: number;
  views: ViewStats;
};

const SYLLABUS_KEY = /^users\/([^/]+)\/syllabi\/([^/]+)\/([^/]+)\/(.+)$/;

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

function syllabusId(
  userId: string,
  libraryId: string,
  collectionKey: string,
): string {
  return `${userId}\0${libraryId}\0${collectionKey}`;
}

/** Parallel head() of index.html customMetadata after a cheap key-only list. */
async function attachIndexMeta(
  env: Env,
  syllabi: PublishedSyllabus[],
): Promise<void> {
  await Promise.all(
    syllabi.map(async (row) => {
      try {
        const key = objectKey(
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
      } catch {
        // Leave empty; storage row is still useful.
      }
    }),
  );
}

/** List published syllabi by scanning R2 under users/. */
export async function listPublishedSyllabi(
  env: Env,
  publicBaseUrl: string,
): Promise<AdminReport> {
  const base = publicBaseUrl.replace(/\/+$/, "");
  const byId = new Map<
    string,
    {
      userId: string;
      libraryId: string;
      collectionKey: string;
      bytes: number;
      files: number;
      hasIndex: boolean;
    }
  >();

  let cursor: string | undefined;
  do {
    const listed = await env.BUCKET.list({
      prefix: "users/",
      cursor,
      limit: 1000,
    });
    for (const obj of listed.objects) {
      const m = SYLLABUS_KEY.exec(obj.key);
      if (!m) continue;
      const userId = m[1];
      const libraryId = m[2];
      const collectionKey = m[3];
      const relPath = m[4];
      const id = syllabusId(userId, libraryId, collectionKey);
      let row = byId.get(id);
      if (!row) {
        row = {
          userId,
          libraryId,
          collectionKey,
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

  const syllabi: PublishedSyllabus[] = [];
  for (const row of byId.values()) {
    if (!row.hasIndex) continue;
    syllabi.push({
      userId: row.userId,
      libraryId: row.libraryId,
      collectionKey: row.collectionKey,
      publicUrl: `${base}/u/${row.userId}/${row.libraryId}/${row.collectionKey}/`,
      bytes: row.bytes,
      files: row.files,
      hasIndex: true,
      title: "",
      courseCode: "",
      institution: "",
    });
  }

  await attachIndexMeta(env, syllabi);

  syllabi.sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.userId.localeCompare(b.userId);
    }
    const titleCmp = (a.title || a.collectionKey).localeCompare(
      b.title || b.collectionKey,
    );
    if (titleCmp !== 0) return titleCmp;
    return b.bytes - a.bytes;
  });

  let totalBytes = 0;
  let totalFiles = 0;
  const users = new Set<string>();
  for (const s of syllabi) {
    totalBytes += s.bytes;
    totalFiles += s.files;
    users.add(s.userId);
  }

  let views: ViewStats;
  try {
    views = await queryViewStats(env);
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
    syllabi,
    totalBytes,
    totalFiles,
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

function cellOrDash(value: string): string {
  const v = value.trim();
  return v ? escapeHtml(v) : `<span class="muted">—</span>`;
}

function formatCount(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function renderDailyChart(views: ViewStats): string {
  if (!views.available) {
    return `<p class="muted chart-note">${escapeHtml(views.error || "Views unavailable")}</p>`;
  }
  const max = Math.max(1, ...views.daily.map((d) => d.pageViews));
  const bars = views.daily
    .map((d) => {
      const pct = Math.round((d.pageViews / max) * 100);
      const title = `${d.day}: ${d.pageViews} views, ${d.fileDownloads} files, ${d.citationDownloads} citations`;
      return `<div class="bar" title="${escapeHtml(title)}" style="height:${pct}%"></div>`;
    })
    .join("");
  const first = views.daily[0]?.day || "";
  const last = views.daily[views.daily.length - 1]?.day || "";
  return `<div class="chart-wrap">
  <div class="chart-label muted">Page views by day (30d)</div>
  <div class="chart" role="img" aria-label="Daily page views for the last 30 days">${bars}</div>
  <div class="chart-axis muted"><span>${escapeHtml(first)}</span><span>${escapeHtml(last)}</span></div>
</div>`;
}

export function renderAdminHtml(report: AdminReport): string {
  const views = report.views;
  const byUser = new Map<string, PublishedSyllabus[]>();
  for (const s of report.syllabi) {
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
        const key = syllabusStatsKey(r.userId, r.libraryId, r.collectionKey);
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
        return `<tr>
  <td>${cellOrDash(r.title)}</td>
  <td>${cellOrDash(r.courseCode)}</td>
  <td>${cellOrDash(r.institution)}</td>
  <td><a href="${escapeHtml(r.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.publicUrl)}</a></td>
  <td class="num">${escapeHtml(formatBytes(r.bytes))}</td>
  <td class="num">${r.files}</td>
  <td class="num">${viewCell}</td>
  <td class="num">${dlCell}</td>
  <td class="num">${citeCell}</td>
  <td class="mono">${escapeHtml(r.libraryId)}</td>
  <td class="mono">${escapeHtml(r.collectionKey)}</td>
</tr>`;
      })
      .join("\n");
    sections.push(`<section>
  <h2>User <span class="mono">${escapeHtml(userId)}</span>
    <span class="muted">— ${rows.length} ${rows.length === 1 ? "syllabus" : "syllabi"},
    ${escapeHtml(formatBytes(userBytes))}, ${userFiles} file${userFiles === 1 ? "" : "s"}</span>
  </h2>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Code</th>
        <th>Institution</th>
        <th>Public URL</th>
        <th class="num">Size</th>
        <th class="num">Files</th>
        <th class="num">Views (30d)</th>
        <th class="num">Downloads (30d)</th>
        <th class="num">Citations (30d)</th>
        <th>Library</th>
        <th>Collection</th>
      </tr>
    </thead>
    <tbody>
${trs}
    </tbody>
  </table>
</section>`);
  }

  const body =
    report.syllabi.length === 0
      ? `<p class="muted">No published syllabi found.</p>`
      : sections.join("\n");

  const viewsTotal = views.available
    ? formatCount(views.pageViews30d)
    : "—";
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
      margin: 0.75rem 0 1.25rem; padding: 0.85rem 1rem;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;
    }
    .chart-label { margin-bottom: 0.5rem; }
    .chart {
      display: flex; align-items: flex-end; gap: 2px;
      height: 88px; width: 100%;
    }
    .chart .bar {
      flex: 1 1 0; min-width: 0;
      background: #3b82f6; border-radius: 2px 2px 0 0;
      min-height: 2px;
    }
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
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    a { color: #1d4ed8; word-break: break-all; }
  </style>
</head>
<body>
  <h1>Syllabus publish admin</h1>
  <p class="muted">Storage and attachment counts from R2. Title / code / institution come from index.html metadata (re-publish to populate older syllabi). Page views, file downloads, and citation exports (RIS/BIB/RDF) are last-30-day totals from Analytics Engine.</p>
  <div class="totals">
    <div><strong>${report.syllabi.length}</strong><span>Syllabi</span></div>
    <div><strong>${report.userCount}</strong><span>Users</span></div>
    <div><strong>${escapeHtml(formatBytes(report.totalBytes))}</strong><span>Total storage</span></div>
    <div><strong>${report.totalFiles}</strong><span>Total files</span></div>
    <div><strong>${viewsTotal}</strong><span>Page views (30d)</span></div>
    <div><strong>${downloadsTotal}</strong><span>File downloads (30d)</span></div>
    <div><strong>${citationsTotal}</strong><span>Citations (30d)</span></div>
  </div>
  ${renderDailyChart(views)}
  ${body}
</body>
</html>`;
}

export async function handleAdminDashboard(
  request: Request,
  env: Env,
  publicBaseUrl: string,
): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!adminKeyMatches(key, env.ADMIN_DASHBOARD_SECRET)) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
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
