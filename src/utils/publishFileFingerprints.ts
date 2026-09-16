/** Local size:mtime fingerprint used when stamping / comparing R2 objects. */

/** size:mtimeMs fingerprint for a local attachment file. */
export async function localFileFingerprint(
  path: string,
): Promise<string | null> {
  try {
    if (typeof IOUtils === "undefined" || typeof IOUtils.stat !== "function") {
      return null;
    }
    const exists = await IOUtils.exists(path);
    if (!exists) return null;
    const stat = await IOUtils.stat(path);
    const size = Number(stat.size);
    if (!Number.isFinite(size) || size <= 0) return null;
    const mtime = Number(stat.lastModified);
    const safeMtime =
      Number.isFinite(mtime) && mtime >= 0 ? Math.trunc(mtime) : 0;
    return `${size}:${safeMtime}`;
  } catch (err) {
    ztoolkit.log("localFileFingerprint failed:", err);
    return null;
  }
}

export function fingerprintSize(fingerprint: string | null): number | null {
  if (!fingerprint) return null;
  const sizePart = fingerprint.split(":")[0];
  const size = Number(sizePart);
  return Number.isFinite(size) && size > 0 ? size : null;
}

/** True when R2 metadata matches the local file fingerprint. */
export function remoteMatchesLocal(opts: {
  exists: boolean;
  remoteSize: number;
  remoteFingerprint: string | null;
  localFingerprint: string | null;
}): boolean {
  if (!opts.exists || !opts.localFingerprint) {
    return false;
  }
  if (opts.remoteFingerprint) {
    return opts.remoteFingerprint === opts.localFingerprint;
  }
  // Legacy objects without custom metadata: size-only match.
  const localSize = fingerprintSize(opts.localFingerprint);
  return localSize != null && localSize === opts.remoteSize;
}
