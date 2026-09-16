/** Minimal HS256 JWT helpers (Web Crypto). */

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signJwt(
  secret: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return `${data}.${b64url(sig)}`;
}

export async function verifyJwt(
  secret: string,
  token: string,
): Promise<{ sub: string; iat: number; exp: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [h, p, s] = parts;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToBytes(s),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!ok) {
    return null;
  }
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))) as {
      sub?: string;
      iat?: number;
      exp?: number;
    };
    if (!payload.sub || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      sub: String(payload.sub),
      iat: Number(payload.iat || 0),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function randomId(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}
