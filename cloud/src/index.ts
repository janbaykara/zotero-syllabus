import type { Env, OAuthPending, OAuthReady } from "./types";
import { handleAdminDashboard } from "./admin";
import { randomId, signJwt, verifyJwt } from "./jwt";
import {
  ZOTERO_ACCESS_TOKEN,
  ZOTERO_AUTHORIZE,
  ZOTERO_REQUEST_TOKEN,
  oauthSignedRequest,
} from "./oauth";
import {
  PathError,
  contentTypeForPath,
  objectKey,
  parsePublicPath,
  userSyllabusPrefix,
} from "./paths";
import {
  getUsageBytes,
  headSize,
  parseIntEnv,
  reconcileUsage,
  setUsageBytes,
} from "./quota";

const JWT_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
const OAUTH_STATE_TTL = 60 * 15; // 15 minutes

/** Strongly consistent handshake object (KV is eventually consistent). */
function oauthReadyR2Key(state: string): string {
  return `_oauth/ready/${state}.json`;
}

function json(
  data: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers":
        "authorization, content-type, x-syllabus-library-id, x-syllabus-collection-key, x-object-path, x-object-fingerprint",
      "access-control-allow-methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
      ...extraHeaders,
    },
  });
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers":
        "authorization, content-type, x-syllabus-library-id, x-syllabus-collection-key, x-object-path, x-object-fingerprint",
      "access-control-allow-methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
      "access-control-max-age": "86400",
    },
  });
}

async function requireUser(
  request: Request,
  env: Env,
): Promise<{ userId: string } | Response> {
  const auth = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(\S+)/i.exec(auth);
  if (!m) {
    return json({ error: "missing_token" }, 401);
  }
  if (!env.JWT_SECRET) {
    return json({ error: "server_misconfigured" }, 500);
  }
  const payload = await verifyJwt(env.JWT_SECRET, m[1]);
  if (!payload) {
    return json({ error: "invalid_token" }, 401);
  }
  return { userId: payload.sub };
}

function publicBase(env: Env, request: Request): string {
  // Prefer the request origin so oauth_callback always matches the live host.
  try {
    const origin = new URL(request.url).origin;
    if (origin && origin.startsWith("http")) {
      return origin.replace(/\/+$/, "");
    }
  } catch {
    // fall through
  }
  const configured = (env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (configured && !configured.includes("REPLACE")) {
    return configured;
  }
  return "https://read.zotero-syllabus.workers.dev";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return corsPreflight();
      }
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (path === "/health" && request.method === "GET") {
        return json({ ok: true });
      }

      if (path === "/admin" && request.method === "GET") {
        return handleAdminDashboard(request, env, publicBase(env, request));
      }

      if (path === "/auth/zotero/start" && request.method === "POST") {
        return handleAuthStart(request, env);
      }
      if (path === "/auth/zotero/callback" && request.method === "GET") {
        return handleAuthCallback(request, env);
      }
      if (path === "/auth/zotero/poll" && request.method === "GET") {
        return handleAuthPoll(request, env);
      }

      if (path === "/v1/me" && request.method === "GET") {
        return handleMe(request, env);
      }

      if (path === "/v1/objects" && request.method === "GET") {
        return handleHeadObject(request, env);
      }
      if (path === "/v1/objects" && request.method === "HEAD") {
        return handleHeadObject(request, env);
      }
      if (path === "/v1/objects" && request.method === "PUT") {
        return handlePutObject(request, env);
      }

      if (path === "/v1/syllabus/objects" && request.method === "GET") {
        return handleListSyllabusObjects(request, env);
      }

      if (path === "/v1/syllabus" && request.method === "DELETE") {
        return handleDeleteSyllabus(request, env);
      }

      if (path.startsWith("/u/") && request.method === "GET") {
        return handlePublicGet(request, env);
      }

      return json({ error: "not_found" }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message);
      if (err instanceof PathError) {
        return json({ error: "bad_path", message }, 400);
      }
      return json({ error: "internal", message }, 500);
    }
  },
};

async function handleAuthStart(request: Request, env: Env): Promise<Response> {
  if (!env.ZOTERO_OAUTH_CLIENT_KEY || !env.ZOTERO_OAUTH_CLIENT_SECRET) {
    return json({ error: "oauth_not_configured" }, 503);
  }
  const state = randomId(16);
  const callbackUrl = `${publicBase(env, request)}/auth/zotero/callback`;

  const tokenInfo = await oauthSignedRequest({
    method: "POST",
    url: ZOTERO_REQUEST_TOKEN,
    consumerKey: env.ZOTERO_OAUTH_CLIENT_KEY,
    consumerSecret: env.ZOTERO_OAUTH_CLIENT_SECRET,
    extraParams: {
      oauth_callback: callbackUrl,
    },
  });

  if (!tokenInfo.oauth_token || !tokenInfo.oauth_token_secret) {
    return json({ error: "oauth_request_failed" }, 502);
  }

  const pending: OAuthPending = {
    requestToken: tokenInfo.oauth_token,
    requestTokenSecret: tokenInfo.oauth_token_secret,
    createdAt: Date.now(),
  };
  await env.KV.put(`oauth:pending:${state}`, JSON.stringify(pending), {
    expirationTtl: OAUTH_STATE_TTL,
  });
  // Map oauth_token -> state so callback can find us
  await env.KV.put(`oauth:token:${tokenInfo.oauth_token}`, state, {
    expirationTtl: OAUTH_STATE_TTL,
  });

  // identity=1: obtain userID without creating a long-lived Zotero API key
  const authorizeUrl =
    `${ZOTERO_AUTHORIZE}?oauth_token=${encodeURIComponent(tokenInfo.oauth_token)}` +
    `&identity=1&name=${encodeURIComponent("Zotero Syllabus Publish")}`;

  return json({ authorizeUrl, state });
}

async function handleAuthCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const oauthToken = url.searchParams.get("oauth_token") || "";
    const verifier = url.searchParams.get("oauth_verifier") || "";
    if (!oauthToken || !verifier) {
      return html("<p>Missing OAuth parameters.</p>", 400);
    }

    if (!env.ZOTERO_OAUTH_CLIENT_KEY || !env.ZOTERO_OAUTH_CLIENT_SECRET) {
      return html(
        "<p>Publish OAuth is not configured on the server (missing client secrets).</p>",
        503,
      );
    }
    if (!env.JWT_SECRET) {
      return html(
        "<p>Publish OAuth is not configured on the server (missing JWT_SECRET).</p>",
        503,
      );
    }

    const state = await env.KV.get(`oauth:token:${oauthToken}`);
    if (!state) {
      return html(
        "<p>Unknown or expired OAuth session. Return to Zotero and try again.</p>",
        400,
      );
    }
    const pendingRaw = await env.KV.get(`oauth:pending:${state}`);
    if (!pendingRaw) {
      return html(
        "<p>OAuth session expired. Return to Zotero and try again.</p>",
        400,
      );
    }
    const pending = JSON.parse(pendingRaw) as OAuthPending;

    const access = await oauthSignedRequest({
      method: "POST",
      url: ZOTERO_ACCESS_TOKEN,
      consumerKey: env.ZOTERO_OAUTH_CLIENT_KEY,
      consumerSecret: env.ZOTERO_OAUTH_CLIENT_SECRET,
      token: oauthToken,
      tokenSecret: pending.requestTokenSecret,
      extraParams: { oauth_verifier: verifier },
    });

    const userId =
      access.userID || access.userId || access.userid || access.UserID || "";
    if (!userId) {
      console.error("OAuth access response keys:", Object.keys(access));
      return html(
        "<p>Zotero did not return a user ID. Try again, or check Worker logs.</p>",
        502,
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(env.JWT_SECRET, {
      sub: String(userId),
      iat: now,
      exp: now + JWT_TTL_SEC,
    });

    const ready: OAuthReady = {
      token,
      userId: String(userId),
      expiresAt: now + JWT_TTL_SEC,
      createdAt: Date.now(),
    };
    // R2 is strongly consistent — plugin poll must see this immediately.
    // KV alone is eventually consistent and often stays "pending" after sign-in.
    await env.BUCKET.put(oauthReadyR2Key(state), JSON.stringify(ready), {
      httpMetadata: { contentType: "application/json" },
    });
    // Keep pending in KV until poll consumes ready (avoids false "expired").
    await env.KV.delete(`oauth:token:${oauthToken}`);

    return html(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Zotero Syllabus</title></head>
<body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem">
  <h1>Signed in</h1>
  <p>Return to <strong>Zotero</strong>. Publishing will continue there automatically — you can close this window.</p>
</body>
</html>`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("auth callback failed:", message);
    return html(
      `<p>Sign-in failed.</p><pre style="white-space:pre-wrap">${escapeHtml(message)}</pre><p>Return to Zotero and try Publish again.</p>`,
      500,
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function handleAuthPoll(request: Request, env: Env): Promise<Response> {
  const state = new URL(request.url).searchParams.get("state") || "";
  if (!state) {
    return json({ error: "missing_state" }, 400);
  }

  const noStore = { "cache-control": "no-store, no-cache, must-revalidate" };

  // Prefer R2 (strong consistency) over KV for the ready token.
  const readyObj = await env.BUCKET.get(oauthReadyR2Key(state));
  if (readyObj) {
    const ready = (await readyObj.json()) as OAuthReady;
    const ageMs = Date.now() - (ready.createdAt || 0);
    if (ageMs > 5 * 60 * 1000) {
      await env.BUCKET.delete(oauthReadyR2Key(state));
      await env.KV.delete(`oauth:pending:${state}`);
      return json({ status: "expired" }, 410, noStore);
    }
    await env.BUCKET.delete(oauthReadyR2Key(state));
    await env.KV.delete(`oauth:pending:${state}`);
    // Legacy KV ready key from older deploys
    await env.KV.delete(`oauth:ready:${state}`);
    return json(
      {
        status: "ready",
        token: ready.token,
        userId: ready.userId,
        expiresAt: ready.expiresAt,
      },
      200,
      noStore,
    );
  }

  // Fallback: older workers wrote ready only to KV
  const readyRaw = await env.KV.get(`oauth:ready:${state}`);
  if (readyRaw) {
    const ready = JSON.parse(readyRaw) as OAuthReady;
    await env.KV.delete(`oauth:ready:${state}`);
    await env.KV.delete(`oauth:pending:${state}`);
    return json(
      {
        status: "ready",
        token: ready.token,
        userId: ready.userId,
        expiresAt: ready.expiresAt,
      },
      200,
      noStore,
    );
  }

  const pending = await env.KV.get(`oauth:pending:${state}`);
  if (pending) {
    return json({ status: "pending" }, 200, noStore);
  }
  return json({ status: "expired" }, 410, noStore);
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const auth = await requireUser(request, env);
  if (auth instanceof Response) return auth;
  const usage = await getUsageBytes(env, auth.userId);
  const quota = parseIntEnv(env.USER_QUOTA_BYTES, 209715200);
  return json({
    userId: auth.userId,
    usageBytes: usage,
    quotaBytes: quota,
  });
}

async function handleListSyllabusObjects(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireUser(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const libraryId =
    request.headers.get("x-syllabus-library-id") ||
    url.searchParams.get("libraryId") ||
    "";
  const collectionKey =
    request.headers.get("x-syllabus-collection-key") ||
    url.searchParams.get("collectionKey") ||
    "";

  let prefix: string;
  try {
    prefix = userSyllabusPrefix(auth.userId, libraryId, collectionKey);
  } catch (e) {
    if (e instanceof PathError) {
      return json({ error: "bad_path", message: e.message }, 400);
    }
    throw e;
  }

  const objects: Record<
    string,
    { size: number; fingerprint: string | null; etag: string | null }
  > = {};
  let cursor: string | undefined;
  // Plain list (size/etag only). Including customMetadata forces per-object
  // metadata fetches and is far too slow for publish skip checks.
  let pages = 0;
  do {
    const listed = await env.BUCKET.list({
      prefix,
      cursor,
      limit: 1000,
    });
    for (const obj of listed.objects) {
      if (!obj.key.startsWith(prefix)) continue;
      const relPath = obj.key.slice(prefix.length);
      if (!relPath || relPath.includes("..")) {
        continue;
      }
      objects[relPath] = {
        size: obj.size,
        fingerprint: null,
        etag: obj.etag || null,
      };
    }
    cursor = listed.truncated ? listed.cursor : undefined;
    pages += 1;
  } while (cursor && pages < 20);

  const base = publicBase(env, request);
  const publicUrl = `${base}/u/${auth.userId}/${libraryId}/${collectionKey}/`;

  return json({
    ok: true,
    publicUrl,
    objects,
  });
}

async function handleHeadObject(request: Request, env: Env): Promise<Response> {
  const auth = await requireUser(request, env);
  if (auth instanceof Response) return auth;

  const libraryId = request.headers.get("x-syllabus-library-id") || "";
  const collectionKey = request.headers.get("x-syllabus-collection-key") || "";
  const relPath = request.headers.get("x-object-path") || "";

  let key: string;
  try {
    key = objectKey(auth.userId, libraryId, collectionKey, relPath);
  } catch (e) {
    if (e instanceof PathError) {
      return json({ error: "bad_path", message: e.message }, 400);
    }
    throw e;
  }

  const obj = await env.BUCKET.head(key);
  const base = publicBase(env, request);
  const publicUrl = `${base}/u/${auth.userId}/${libraryId}/${collectionKey}/`;

  if (!obj) {
    return json({
      exists: false,
      size: 0,
      etag: null,
      fingerprint: null,
      publicUrl,
    });
  }

  const fingerprint = obj.customMetadata?.fingerprint || null;
  return json({
    exists: true,
    size: obj.size,
    etag: obj.etag || null,
    fingerprint,
    uploaded: obj.uploaded?.toISOString?.() || null,
    publicUrl,
  });
}

async function handlePutObject(request: Request, env: Env): Promise<Response> {
  const auth = await requireUser(request, env);
  if (auth instanceof Response) return auth;

  const libraryId = request.headers.get("x-syllabus-library-id") || "";
  const collectionKey = request.headers.get("x-syllabus-collection-key") || "";
  const relPath = request.headers.get("x-object-path") || "";
  const fingerprint = sanitizeFingerprint(
    request.headers.get("x-object-fingerprint") || "",
  );

  let key: string;
  try {
    key = objectKey(auth.userId, libraryId, collectionKey, relPath);
  } catch (e) {
    if (e instanceof PathError) {
      return json({ error: "bad_path", message: e.message }, 400);
    }
    throw e;
  }

  const maxObject = parseIntEnv(env.MAX_OBJECT_BYTES, 50 * 1024 * 1024);
  const quota = parseIntEnv(env.USER_QUOTA_BYTES, 209715200);

  const buf = await request.arrayBuffer();
  const newSize = buf.byteLength;
  if (newSize <= 0) {
    return json({ error: "empty_body" }, 400);
  }
  if (newSize > maxObject) {
    return json({ error: "object_too_large", maxObjectBytes: maxObject }, 413);
  }

  const oldSize = await headSize(env, key);
  let usage = await getUsageBytes(env, auth.userId);
  const projected = usage - oldSize + newSize;
  if (projected > quota) {
    // Try reconcile once in case KV drifted
    usage = await reconcileUsage(env, auth.userId);
    const projected2 = usage - oldSize + newSize;
    if (projected2 > quota) {
      return json(
        {
          error: "quota_exceeded",
          usageBytes: usage,
          quotaBytes: quota,
          projectedBytes: projected2,
        },
        413,
      );
    }
  }

  const customMetadata: Record<string, string> = {};
  if (fingerprint) {
    customMetadata.fingerprint = fingerprint;
  }

  await env.BUCKET.put(key, buf, {
    httpMetadata: { contentType: contentTypeForPath(relPath) },
    customMetadata:
      Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
  });

  const nextUsage = (await getUsageBytes(env, auth.userId)) - oldSize + newSize;
  await setUsageBytes(env, auth.userId, nextUsage);

  const base = publicBase(env, request);
  const publicUrl = `${base}/u/${auth.userId}/${libraryId}/${collectionKey}/`;

  return json({
    ok: true,
    key,
    size: newSize,
    fingerprint: fingerprint || null,
    usageBytes: nextUsage,
    quotaBytes: quota,
    publicUrl,
  });
}

/** size:mtime — digits and colon only, capped length. */
function sanitizeFingerprint(raw: string): string {
  const v = raw.trim();
  if (!v || v.length > 64) return "";
  return /^\d+:\d+$/.test(v) ? v : "";
}

async function handleDeleteSyllabus(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireUser(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const libraryId = url.searchParams.get("libraryId") || "";
  const collectionKey = url.searchParams.get("collectionKey") || "";

  let prefix: string;
  try {
    prefix = userSyllabusPrefix(auth.userId, libraryId, collectionKey);
  } catch (e) {
    if (e instanceof PathError) {
      return json({ error: "bad_path", message: e.message }, 400);
    }
    throw e;
  }

  let cursor: string | undefined;
  let deleted = 0;
  do {
    const listed = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    await Promise.all(listed.objects.map((obj) => env.BUCKET.delete(obj.key)));
    deleted += listed.objects.length;
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  const usage = await reconcileUsage(env, auth.userId);
  return json({ ok: true, deleted, usageBytes: usage });
}

async function handlePublicGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parsePublicPath(url.pathname);
  if (!parsed) {
    return text("Not found", 404);
  }
  const key = objectKey(
    parsed.userId,
    parsed.libraryId,
    parsed.collectionKey,
    parsed.relPath,
  );
  const obj = await env.BUCKET.get(key);
  if (!obj) {
    return text("Not found", 404);
  }
  const headers = new Headers();
  headers.set(
    "content-type",
    obj.httpMetadata?.contentType || contentTypeForPath(parsed.relPath),
  );
  // index.html changes on every sync — don't serve a stale layout for minutes.
  if (parsed.relPath === "index.html" || parsed.relPath === "") {
    headers.set("cache-control", "no-cache, max-age=0, must-revalidate");
  } else {
    headers.set("cache-control", "public, max-age=300");
  }
  headers.set("access-control-allow-origin", "*");
  if (obj.size != null) {
    headers.set("content-length", String(obj.size));
  }
  return new Response(obj.body, { status: 200, headers });
}
