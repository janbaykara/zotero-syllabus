import type { Env } from "./types";

export type PublishedSyllabus = {
  userId: string;
  libraryId: string;
  collectionKey: string;
  publicUrl: string;
  bytes: number;
  files: number;
  hasIndex: boolean;
};

export type AdminReport = {
  syllabi: PublishedSyllabus[];
  totalBytes: number;
  totalFiles: number;
  userCount: number;
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
    });
  }

  syllabi.sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.userId.localeCompare(b.userId);
    }
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

  return {
    syllabi,
    totalBytes,
    totalFiles,
    userCount: users.size,
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

export function renderAdminHtml(report: AdminReport): string {
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
      .map(
        (r) => `<tr>
  <td><a href="${escapeHtml(r.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.publicUrl)}</a></td>
  <td class="num">${escapeHtml(formatBytes(r.bytes))}</td>
  <td class="num">${r.files}</td>
  <td class="mono">${escapeHtml(r.libraryId)}</td>
  <td class="mono">${escapeHtml(r.collectionKey)}</td>
</tr>`,
      )
      .join("\n");
    sections.push(`<section>
  <h2>User <span class="mono">${escapeHtml(userId)}</span>
    <span class="muted">— ${rows.length} ${rows.length === 1 ? "syllabus" : "syllabi"},
    ${escapeHtml(formatBytes(userBytes))}, ${userFiles} file${userFiles === 1 ? "" : "s"}</span>
  </h2>
  <table>
    <thead>
      <tr>
        <th>Public URL</th>
        <th class="num">Size</th>
        <th class="num">Files</th>
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
  <p class="muted">Storage and attachment counts from R2. Read throughput is not included — use the Cloudflare dashboard for that.</p>
  <div class="totals">
    <div><strong>${report.syllabi.length}</strong><span>Syllabi</span></div>
    <div><strong>${report.userCount}</strong><span>Users</span></div>
    <div><strong>${escapeHtml(formatBytes(report.totalBytes))}</strong><span>Total storage</span></div>
    <div><strong>${report.totalFiles}</strong><span>Total files</span></div>
  </div>
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
