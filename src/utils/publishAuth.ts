import { getPref, setPref, clearPref } from "./prefs";

const DEFAULT_BASE = "https://read.zotero-syllabus.workers.dev";

export function getPublishApiBaseUrl(): string {
  const fromPref = String(getPref("publishApiBaseUrl") || "").trim();
  const base = (fromPref || DEFAULT_BASE).replace(/\/+$/, "");
  if (!base || base.includes("REPLACE")) {
    throw new Error("publish_api_unconfigured");
  }
  return base;
}

export function isPublishApiConfigured(): boolean {
  try {
    getPublishApiBaseUrl();
    return true;
  } catch {
    return false;
  }
}

export function getPublishSession(): {
  token: string;
  userId: string;
  expiresAt: number;
} | null {
  const token = String(getPref("publishJwt") || "").trim();
  const userId = String(getPref("publishUserId") || "").trim();
  const expiresAt = Number(getPref("publishJwtExpiresAt") || 0);
  if (!token || !userId) {
    return null;
  }
  if (expiresAt && expiresAt * 1000 < Date.now()) {
    return null;
  }
  return { token, userId, expiresAt };
}

export function clearPublishSession(): void {
  clearPref("publishJwt");
  clearPref("publishUserId");
  clearPref("publishJwtExpiresAt");
}

function setPublishSession(opts: {
  token: string;
  userId: string;
  expiresAt: number;
}): void {
  setPref("publishJwt", opts.token);
  setPref("publishUserId", opts.userId);
  setPref("publishJwtExpiresAt", opts.expiresAt);
}

async function httpJson<T>(
  method: string,
  path: string,
  opts?: {
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
    /** When true, bypass Zotero/HTTP caches (needed for OAuth poll). */
    noCache?: boolean;
  },
): Promise<T> {
  const base = getPublishApiBaseUrl();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts?.headers || {}),
  };
  if (opts?.noCache) {
    headers["Cache-Control"] = "no-cache, no-store";
    headers.Pragma = "no-cache";
  }
  if (opts?.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }
  let body: string | undefined;
  if (opts?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const xhr = await Zotero.HTTP.request(method, `${base}${path}`, {
    headers,
    body,
    responseType: "text",
    timeout: 120000,
    successCodes: false,
    ...(opts?.noCache ? { noCache: true } : {}),
  });
  const status = xhr.status || 0;
  const text = String(xhr.responseText || "");
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (status < 200 || status >= 300) {
    const err = new Error(`publish_http_${status}`) as Error & {
      status: number;
      data: unknown;
    };
    err.status = status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export async function startZoteroPublishAuth(): Promise<{
  authorizeUrl: string;
  state: string;
}> {
  try {
    return await httpJson("POST", "/auth/zotero/start", { body: {} });
  } catch (err) {
    const data =
      err && typeof err === "object" && "data" in err
        ? (err as { data?: { error?: string } }).data
        : undefined;
    if (data?.error === "oauth_not_configured") {
      throw new Error("publish_oauth_not_configured", { cause: err });
    }
    throw err;
  }
}

export async function pollZoteroPublishAuth(
  state: string,
): Promise<
  | { status: "pending" }
  | { status: "expired" }
  | { status: "ready"; token: string; userId: string; expiresAt: number }
> {
  // Cache-bust + noCache: repeated identical GETs were reusable as "pending".
  const path = `/auth/zotero/poll?state=${encodeURIComponent(state)}&_=${Date.now()}`;
  try {
    return await httpJson("GET", path, { noCache: true });
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status?: number }).status)
        : 0;
    if (status === 410) {
      return { status: "expired" };
    }
    throw err;
  }
}

/**
 * Open Zotero.org OAuth in the browser and poll until the Worker issues a JWT.
 */
export async function signInWithZoteroForPublish(opts?: {
  pollIntervalMs?: number;
  timeoutMs?: number;
  onStatus?: (message: string) => void;
}): Promise<{ userId: string }> {
  const pollIntervalMs = opts?.pollIntervalMs ?? 1500;
  const timeoutMs = opts?.timeoutMs ?? 5 * 60 * 1000;
  opts?.onStatus?.("starting");

  const { authorizeUrl, state } = await startZoteroPublishAuth();
  Zotero.launchURL(authorizeUrl);
  opts?.onStatus?.("waiting");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await Zotero.Promise.delay(pollIntervalMs);
    const result = await pollZoteroPublishAuth(state);
    if (result.status === "ready") {
      setPublishSession({
        token: result.token,
        userId: result.userId,
        expiresAt: result.expiresAt,
      });
      opts?.onStatus?.("ready");
      return { userId: result.userId };
    }
    if (result.status === "expired") {
      throw new Error("publish_auth_expired");
    }
  }
  throw new Error("publish_auth_timeout");
}

export async function listPublishObjects(opts: {
  token: string;
  libraryId: string;
  collectionKey: string;
}): Promise<{
  publicUrl: string;
  objects: Record<
    string,
    { size: number; fingerprint: string | null; etag: string | null }
  >;
}> {
  const base = getPublishApiBaseUrl();
  const xhr = await Zotero.HTTP.request("GET", `${base}/v1/syllabus/objects`, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "X-Syllabus-Library-Id": opts.libraryId,
      "X-Syllabus-Collection-Key": opts.collectionKey,
      Accept: "application/json",
    },
    responseType: "text",
    timeout: 60000,
    successCodes: false,
  });
  const status = xhr.status || 0;
  const text = String(xhr.responseText || "");
  let data: {
    publicUrl?: string;
    objects?: Record<
      string,
      { size?: number; fingerprint?: string | null; etag?: string | null }
    >;
    error?: string;
  };
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (status < 200 || status >= 300) {
    const err = new Error(data.error || `publish_http_${status}`) as Error & {
      status: number;
      data: unknown;
    };
    err.status = status;
    err.data = data;
    throw err;
  }
  const objects: Record<
    string,
    { size: number; fingerprint: string | null; etag: string | null }
  > = {};
  for (const [relPath, meta] of Object.entries(data.objects || {})) {
    objects[relPath] = {
      size: Number(meta?.size || 0),
      fingerprint:
        typeof meta?.fingerprint === "string" && meta.fingerprint
          ? meta.fingerprint
          : null,
      etag: typeof meta?.etag === "string" ? meta.etag : null,
    };
  }
  return {
    publicUrl: String(data.publicUrl || ""),
    objects,
  };
}

export async function deletePublishSyllabus(opts: {
  token: string;
  libraryId: string;
  collectionKey: string;
}): Promise<{ ok: boolean; deleted: number; usageBytes: number }> {
  const base = getPublishApiBaseUrl();
  const qs = new URLSearchParams({
    libraryId: opts.libraryId,
    collectionKey: opts.collectionKey,
  });
  const xhr = await Zotero.HTTP.request(
    "DELETE",
    `${base}/v1/syllabus?${qs.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${opts.token}`,
        Accept: "application/json",
      },
      responseType: "text",
      timeout: 120000,
      successCodes: false,
    },
  );
  const status = xhr.status || 0;
  const text = String(xhr.responseText || "");
  let data: {
    ok?: boolean;
    deleted?: number;
    usageBytes?: number;
    error?: string;
  };
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (status < 200 || status >= 300) {
    const err = new Error(data.error || `publish_http_${status}`) as Error & {
      status: number;
      data: unknown;
    };
    err.status = status;
    err.data = data;
    throw err;
  }
  return {
    ok: Boolean(data.ok),
    deleted: Number(data.deleted || 0),
    usageBytes: Number(data.usageBytes || 0),
  };
}

export async function putPublishObject(opts: {
  token: string;
  libraryId: string;
  collectionKey: string;
  relPath: string;
  bytes: Uint8Array;
  fingerprint?: string | null;
  /** Stored on index.html customMetadata for the admin dashboard. */
  syllabusMeta?: {
    title?: string;
    courseCode?: string;
    institution?: string;
  } | null;
}): Promise<{ publicUrl: string; usageBytes: number; quotaBytes: number }> {
  const base = getPublishApiBaseUrl();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
    "Content-Type": "application/octet-stream",
    "X-Syllabus-Library-Id": opts.libraryId,
    "X-Syllabus-Collection-Key": opts.collectionKey,
    "X-Object-Path": opts.relPath,
    Accept: "application/json",
  };
  if (opts.fingerprint) {
    headers["X-Object-Fingerprint"] = opts.fingerprint;
  }
  if (opts.relPath === "index.html" && opts.syllabusMeta) {
    const title = encodeSyllabusMetaHeader(opts.syllabusMeta.title);
    const courseCode = encodeSyllabusMetaHeader(opts.syllabusMeta.courseCode);
    const institution = encodeSyllabusMetaHeader(opts.syllabusMeta.institution);
    if (title) headers["X-Syllabus-Title"] = title;
    if (courseCode) headers["X-Syllabus-Course-Code"] = courseCode;
    if (institution) headers["X-Syllabus-Institution"] = institution;
  }
  const xhr = await Zotero.HTTP.request("PUT", `${base}/v1/objects`, {
    headers,
    body: opts.bytes,
    responseType: "text",
    timeout: 300000,
    successCodes: false,
  });
  const status = xhr.status || 0;
  const text = String(xhr.responseText || "");
  let data: {
    publicUrl?: string;
    usageBytes?: number;
    quotaBytes?: number;
    error?: string;
  };
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (status < 200 || status >= 300) {
    const err = new Error(data.error || `publish_http_${status}`) as Error & {
      status: number;
      data: unknown;
    };
    err.status = status;
    err.data = data;
    throw err;
  }
  return {
    publicUrl: String(data.publicUrl || ""),
    usageBytes: Number(data.usageBytes || 0),
    quotaBytes: Number(data.quotaBytes || 0),
  };
}

/** Percent-encode for ASCII-safe HTTP headers (Worker decodes). */
function encodeSyllabusMetaHeader(value: string | null | undefined): string {
  const cleaned = (value || "")
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 512);
  return cleaned ? encodeURIComponent(cleaned) : "";
}
