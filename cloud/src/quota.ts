import type { Env } from "./types";
import { userRootPrefix } from "./paths";

export function parseIntEnv(
  value: string | undefined,
  fallback: number,
): number {
  const n = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function getUsageBytes(env: Env, userId: string): Promise<number> {
  const raw = await env.KV.get(`usage:${userId}`);
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function setUsageBytes(
  env: Env,
  userId: string,
  bytes: number,
): Promise<void> {
  await env.KV.put(`usage:${userId}`, String(Math.max(0, Math.floor(bytes))));
}

/** Sum object sizes under the user prefix (reconcile). */
export async function reconcileUsage(
  env: Env,
  userId: string,
): Promise<number> {
  const prefix = userRootPrefix(userId);
  let cursor: string | undefined;
  let total = 0;
  do {
    const listed = await env.BUCKET.list({ prefix, cursor, limit: 1000 });
    for (const obj of listed.objects) {
      total += obj.size;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  await setUsageBytes(env, userId, total);
  return total;
}

export async function headSize(env: Env, key: string): Promise<number> {
  const obj = await env.BUCKET.head(key);
  return obj?.size ?? 0;
}
