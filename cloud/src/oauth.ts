/** OAuth 1.0a helpers for Zotero (HMAC-SHA1). */

function percentEncode(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function b64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let bin = "";
  for (const b of u8) {
    bin += String.fromCharCode(b);
  }
  return btoa(bin);
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data),
  );
  return b64(sig);
}

function parseForm(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of body.split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=");
    out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
  }
  return out;
}

export async function oauthSignedRequest(opts: {
  method: "GET" | "POST";
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  extraParams?: Record<string, string>;
}): Promise<Record<string, string>> {
  const {
    method,
    url,
    consumerKey,
    consumerSecret,
    token = "",
    tokenSecret = "",
    extraParams = {},
  } = opts;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
    ...extraParams,
  };
  if (token) {
    oauthParams.oauth_token = token;
  }

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const base = [method, percentEncode(url), percentEncode(paramString)].join(
    "&",
  );

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  oauthParams.oauth_signature = await hmacSha1(signingKey, base);

  const authHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
      .join(", ");

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OAuth ${method} ${url} failed: ${res.status} ${text}`);
  }
  return parseForm(text);
}

export const ZOTERO_REQUEST_TOKEN = "https://www.zotero.org/oauth/request";
export const ZOTERO_ACCESS_TOKEN = "https://www.zotero.org/oauth/access";
export const ZOTERO_AUTHORIZE = "https://www.zotero.org/oauth/authorize";
