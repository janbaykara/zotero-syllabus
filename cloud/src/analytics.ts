import type { Env } from "./types";

export const ANALYTICS_DATASET = "syllabus_views";
export const EVENT_PAGE_VIEW = "page_view";
export const EVENT_FILE_DOWNLOAD = "file_download";
/** bibliography.ris / .bib / .rdf */
export const EVENT_CITATION_DOWNLOAD = "citation_download";

export type PublicHitPath = {
  userId: string;
  libraryId: string;
  collectionKey: string;
  relPath: string;
};

export type SyllabusViewCounts = {
  pageViews: number;
  fileDownloads: number;
  citationDownloads: number;
};

export type DailyViewCounts = {
  day: string; // YYYY-MM-DD
  pageViews: number;
  fileDownloads: number;
  citationDownloads: number;
};

export type ViewStats = {
  available: boolean;
  /** Set when secrets missing or SQL query failed. */
  error?: string;
  pageViews30d: number;
  fileDownloads30d: number;
  citationDownloads30d: number;
  /** Last 30 calendar days, oldest → newest (gaps filled with zeros). */
  daily: DailyViewCounts[];
  /** Key: `${userId}/${libraryId}/${collectionKey}` */
  bySyllabus: Record<string, SyllabusViewCounts>;
};

function eventForRelPath(relPath: string): string | null {
  if (relPath === "index.html" || relPath === "") {
    return EVENT_PAGE_VIEW;
  }
  if (relPath.startsWith("files/")) {
    return EVENT_FILE_DOWNLOAD;
  }
  if (
    relPath === "bibliography.ris" ||
    relPath === "bibliography.bib" ||
    relPath === "bibliography.rdf"
  ) {
    return EVENT_CITATION_DOWNLOAD;
  }
  return null;
}

export function syllabusStatsKey(
  userId: string,
  libraryId: string,
  collectionKey: string,
): string {
  return `${userId}/${libraryId}/${collectionKey}`;
}

/** Non-blocking write; page views, attachment files, and citation exports. */
export function recordPublicHit(env: Env, parsed: PublicHitPath): void {
  const event = eventForRelPath(parsed.relPath);
  if (!event) return;
  try {
    env.ANALYTICS.writeDataPoint({
      blobs: [event, parsed.userId, parsed.libraryId, parsed.collectionKey],
      doubles: [1],
      indexes: [
        syllabusStatsKey(parsed.userId, parsed.libraryId, parsed.collectionKey),
      ],
    });
  } catch {
    // Never fail the public response because of analytics.
  }
}

type SqlJsonResponse = {
  data?: Array<Record<string, unknown>>;
  error?: string;
  errors?: Array<{ message?: string }>;
  success?: boolean;
};

function emptyDailySeries(days: number): DailyViewCounts[] {
  const out: DailyViewCounts[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    const day = d.toISOString().slice(0, 10);
    out.push({ day, pageViews: 0, fileDownloads: 0, citationDownloads: 0 });
  }
  return out;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function sqlErrorMessage(parsed: SqlJsonResponse, status: number): string {
  if (parsed.error) return parsed.error;
  if (parsed.errors?.length) {
    return parsed.errors.map((e) => e.message || "error").join("; ");
  }
  return `Analytics SQL failed (${status})`;
}

async function runAnalyticsSql(
  env: Env,
  sql: string,
): Promise<
  | { ok: true; rows: Array<Record<string, unknown>> }
  | { ok: false; error: string }
> {
  const accountId = env.CF_ACCOUNT_ID?.trim();
  const token = env.CF_ANALYTICS_API_TOKEN?.trim();
  if (!accountId || !token) {
    return {
      ok: false,
      error: "Views unavailable — set CF_ACCOUNT_ID and CF_ANALYTICS_API_TOKEN",
    };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/analytics_engine/sql`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "text/plain; charset=utf-8",
      },
      body: sql,
    });
    const text = await res.text();
    let parsed: SqlJsonResponse;
    try {
      parsed = JSON.parse(text) as SqlJsonResponse;
    } catch {
      return {
        ok: false,
        error: `Analytics SQL non-JSON (${res.status})`,
      };
    }
    if (!res.ok || parsed.success === false) {
      return {
        ok: false,
        error: sqlErrorMessage(parsed, res.status),
      };
    }
    return { ok: true, rows: parsed.data || [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Analytics SQL request failed",
    };
  }
}

/**
 * Aggregate last 30 days of page views and file downloads for the admin dashboard.
 * Degrades gracefully when secrets are missing or the dataset has no rows yet.
 */
export async function queryViewStats(env: Env): Promise<ViewStats> {
  const daily = emptyDailySeries(30);
  const bySyllabus: Record<string, SyllabusViewCounts> = {};

  const dailySql = `
SELECT
  toDate(timestamp) AS day,
  blob1 AS event,
  SUM(_sample_interval) AS hits
FROM ${ANALYTICS_DATASET}
WHERE timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY day, event
ORDER BY day
FORMAT JSON
`.trim();

  const perSyllabusSql = `
SELECT
  blob1 AS event,
  blob2 AS userId,
  blob3 AS libraryId,
  blob4 AS collectionKey,
  SUM(_sample_interval) AS hits
FROM ${ANALYTICS_DATASET}
WHERE timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY event, userId, libraryId, collectionKey
FORMAT JSON
`.trim();

  const [dailyRes, perRes] = await Promise.all([
    runAnalyticsSql(env, dailySql),
    runAnalyticsSql(env, perSyllabusSql),
  ]);

  // Empty dataset (no writes yet) surfaces as a SQL error — treat as zeros.
  const emptyDataset =
    (dailyRes.ok === false &&
      /not exist|unknown table|no such/i.test(dailyRes.error)) ||
    (perRes.ok === false &&
      /not exist|unknown table|no such/i.test(perRes.error));

  if (emptyDataset) {
    return {
      available: true,
      pageViews30d: 0,
      fileDownloads30d: 0,
      citationDownloads30d: 0,
      daily,
      bySyllabus,
    };
  }

  if (!dailyRes.ok) {
    return {
      available: false,
      error: dailyRes.error,
      pageViews30d: 0,
      fileDownloads30d: 0,
      citationDownloads30d: 0,
      daily,
      bySyllabus,
    };
  }
  if (!perRes.ok) {
    return {
      available: false,
      error: perRes.error,
      pageViews30d: 0,
      fileDownloads30d: 0,
      citationDownloads30d: 0,
      daily,
      bySyllabus,
    };
  }

  const dayIndex = new Map(daily.map((d, i) => [d.day, i]));
  let pageViews30d = 0;
  let fileDownloads30d = 0;
  let citationDownloads30d = 0;

  for (const row of dailyRes.rows) {
    // toDate may return "YYYY-MM-DD" or a DateTime string.
    const day = asString(row.day).slice(0, 10);
    const event = asString(row.event);
    const hits = asNumber(row.hits);
    const idx = dayIndex.get(day);
    if (idx == null) continue;
    if (event === EVENT_PAGE_VIEW) {
      daily[idx].pageViews += hits;
      pageViews30d += hits;
    } else if (event === EVENT_FILE_DOWNLOAD) {
      daily[idx].fileDownloads += hits;
      fileDownloads30d += hits;
    } else if (event === EVENT_CITATION_DOWNLOAD) {
      daily[idx].citationDownloads += hits;
      citationDownloads30d += hits;
    }
  }

  for (const row of perRes.rows) {
    const event = asString(row.event);
    const key = syllabusStatsKey(
      asString(row.userId),
      asString(row.libraryId),
      asString(row.collectionKey),
    );
    if (!key || key === "//") continue;
    let counts = bySyllabus[key];
    if (!counts) {
      counts = { pageViews: 0, fileDownloads: 0, citationDownloads: 0 };
      bySyllabus[key] = counts;
    }
    const hits = asNumber(row.hits);
    if (event === EVENT_PAGE_VIEW) counts.pageViews += hits;
    else if (event === EVENT_FILE_DOWNLOAD) counts.fileDownloads += hits;
    else if (event === EVENT_CITATION_DOWNLOAD)
      counts.citationDownloads += hits;
  }

  return {
    available: true,
    pageViews30d,
    fileDownloads30d,
    citationDownloads30d,
    daily,
    bySyllabus,
  };
}
