import { getPref, setPref, clearPref } from "./prefs";
import { publishTargetHeaders, type PublishTarget } from "./publishTarget";

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

export type PublishObjectMeta = {
  size: number;
  fingerprint: string | null;
  etag: string | null;
};

function normalizeObjectsMap(
  raw: Record<
    string,
    { size?: number; fingerprint?: string | null; etag?: string | null }
  >,
): Record<string, PublishObjectMeta> {
  const objects: Record<string, PublishObjectMeta> = {};
  for (const [relPath, meta] of Object.entries(raw || {})) {
    objects[relPath] = {
      size: Number(meta?.size || 0),
      fingerprint:
        typeof meta?.fingerprint === "string" && meta.fingerprint
          ? meta.fingerprint
          : null,
      etag: typeof meta?.etag === "string" ? meta.etag : null,
    };
  }
  return objects;
}

export async function listPublishObjects(opts: {
  token: string;
  target: PublishTarget;
}): Promise<{
  publicUrl: string;
  objects: Record<string, PublishObjectMeta>;
  /** Present when listing a syllabus that has itemKeys.json. */
  itemKeys?: string[];
}> {
  const base = getPublishApiBaseUrl();
  const path =
    opts.target.kind === "item" ? "/v1/item/objects" : "/v1/syllabus/objects";
  const xhr = await Zotero.HTTP.request("GET", `${base}${path}`, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
      ...publishTargetHeaders(opts.target),
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
    itemKeys?: string[];
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
    objects: normalizeObjectsMap(data.objects || {}),
    itemKeys: Array.isArray(data.itemKeys)
      ? data.itemKeys.filter((k): k is string => typeof k === "string" && !!k)
      : undefined,
  };
}

/** @deprecated Prefer listPublishObjects({ target }) */
export async function listPublishSyllabusObjects(opts: {
  token: string;
  libraryId: string;
  collectionKey: string;
}): Promise<{
  publicUrl: string;
  objects: Record<string, PublishObjectMeta>;
}> {
  return listPublishObjects({
    token: opts.token,
    target: {
      kind: "syllabus",
      libraryId: opts.libraryId,
      collectionKey: opts.collectionKey,
    },
  });
}

export async function deletePublishSyllabus(opts: {
  token: string;
  libraryId: string;
  collectionKey: string;
}): Promise<{
  ok: boolean;
  deleted: number;
  usageBytes: number;
  gcDeleted: number;
}> {
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
    gcDeleted?: number;
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
    gcDeleted: Number(data.gcDeleted || 0),
  };
}

export async function deletePublishItem(opts: {
  token: string;
  libraryId: string;
  itemKey: string;
}): Promise<{
  ok: boolean;
  deleted: number;
  usageBytes: number;
  gcDeleted: number;
}> {
  const base = getPublishApiBaseUrl();
  const qs = new URLSearchParams({
    libraryId: opts.libraryId,
    itemKey: opts.itemKey,
  });
  const xhr = await Zotero.HTTP.request(
    "DELETE",
    `${base}/v1/item?${qs.toString()}`,
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
    gcDeleted?: number;
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
    gcDeleted: Number(data.gcDeleted || 0),
  };
}

export async function patchPublishItemRefs(opts: {
  token: string;
  libraryId: string;
  itemKey: string;
  addSyllabus?: string;
  removeSyllabus?: string;
  setPage?: boolean;
}): Promise<{
  refs: { syllabi: string[]; page: boolean };
  gcDeleted: number;
}> {
  const base = getPublishApiBaseUrl();
  const body: Record<string, unknown> = {
    libraryId: opts.libraryId,
    itemKey: opts.itemKey,
  };
  if (opts.addSyllabus) body.addSyllabus = opts.addSyllabus;
  if (opts.removeSyllabus) body.removeSyllabus = opts.removeSyllabus;
  if (typeof opts.setPage === "boolean") body.setPage = opts.setPage;

  const xhr = await Zotero.HTTP.request("POST", `${base}/v1/item-refs`, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    responseType: "text",
    timeout: 60000,
    successCodes: false,
  });
  const status = xhr.status || 0;
  const text = String(xhr.responseText || "");
  let data: {
    refs?: { syllabi?: string[]; page?: boolean };
    gcDeleted?: number;
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
    refs: {
      syllabi: Array.isArray(data.refs?.syllabi)
        ? data.refs!.syllabi!.filter((k): k is string => typeof k === "string")
        : [],
      page: data.refs?.page === true,
    },
    gcDeleted: Number(data.gcDeleted || 0),
  };
}

export async function putPublishObject(opts: {
  token: string;
  target: PublishTarget;
  relPath: string;
  bytes: Uint8Array;
  fingerprint?: string | null;
  /** Stored on index.html customMetadata for the admin dashboard. */
  syllabusMeta?: {
    title?: string;
    courseCode?: string;
    institution?: string;
    /** Item shares: localized item type. */
    itemType?: string;
    /** Item shares: "y" | "n". */
    annotations?: string;
  } | null;
}): Promise<{ publicUrl: string; usageBytes: number; quotaBytes: number }> {
  const base = getPublishApiBaseUrl();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
    "Content-Type": "application/octet-stream",
    ...publishTargetHeaders(opts.target),
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
    const itemType = encodeSyllabusMetaHeader(opts.syllabusMeta.itemType);
    const annotations = encodeSyllabusMetaHeader(opts.syllabusMeta.annotations);
    if (title) headers["X-Syllabus-Title"] = title;
    if (courseCode) headers["X-Syllabus-Course-Code"] = courseCode;
    if (institution) headers["X-Syllabus-Institution"] = institution;
    if (itemType) headers["X-Syllabus-Item-Type"] = itemType;
    if (annotations) headers["X-Syllabus-Annotations"] = annotations;
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

export async function deletePublishObject(opts: {
  token: string;
  target: PublishTarget;
  relPath: string;
}): Promise<{ deleted: boolean }> {
  const base = getPublishApiBaseUrl();
  const xhr = await Zotero.HTTP.request("DELETE", `${base}/v1/objects`, {
    headers: {
      Authorization: `Bearer ${opts.token}`,
      ...publishTargetHeaders(opts.target),
      "X-Object-Path": opts.relPath,
      Accept: "application/json",
    },
    responseType: "text",
    timeout: 60000,
    successCodes: false,
  });
  const status = xhr.status || 0;
  const text = String(xhr.responseText || "");
  let data: { deleted?: boolean; error?: string };
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
  return { deleted: Boolean(data.deleted) };
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
