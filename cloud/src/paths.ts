/** Deterministic R2 key layout and path safety. */

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

export function assertSafeSegment(value: string, label: string): string {
  const v = value.trim();
  if (!v || v.includes("..") || v.includes("/") || !SAFE_SEGMENT.test(v)) {
    throw new PathError(`Invalid ${label}`);
  }
  return v;
}

export class PathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathError";
  }
}

/** Relative object path inside a syllabus folder:
 * index.html, bibliography.ris / bibliography.bib / bibliography.rdf,
 * og-image.jpg, or files/{key}.{ext}
 */
export function assertRelPath(relPath: string): string {
  const p = relPath.replace(/^\/+/, "").trim();
  if (
    p === "index.html" ||
    p === "bibliography.ris" ||
    p === "bibliography.bib" ||
    p === "bibliography.rdf" ||
    p === "og-image.jpg"
  ) {
    return p;
  }
  const m = /^files\/([A-Za-z0-9._-]+\.[A-Za-z0-9]+)$/.exec(p);
  if (!m) {
    throw new PathError("Invalid object path");
  }
  return p;
}

export function userSyllabusPrefix(
  userId: string,
  libraryId: string,
  collectionKey: string,
): string {
  const u = assertSafeSegment(userId, "userId");
  const lib = assertSafeSegment(libraryId, "libraryId");
  const col = assertSafeSegment(collectionKey, "collectionKey");
  return `users/${u}/syllabi/${lib}/${col}/`;
}

export function objectKey(
  userId: string,
  libraryId: string,
  collectionKey: string,
  relPath: string,
): string {
  return `${userSyllabusPrefix(userId, libraryId, collectionKey)}${assertRelPath(relPath)}`;
}

export function userRootPrefix(userId: string): string {
  return `users/${assertSafeSegment(userId, "userId")}/`;
}

export function contentTypeForPath(relPath: string): string {
  const lower = relPath.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return "text/html; charset=utf-8";
  }
  if (lower.endsWith(".ris")) return "application/x-research-info-systems";
  if (lower.endsWith(".bib")) return "application/x-bibtex; charset=utf-8";
  if (lower.endsWith(".rdf") || lower.endsWith(".xml")) {
    return "application/rdf+xml; charset=utf-8";
  }
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".epub")) return "application/epub+zip";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".md")) return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}

/** Parse /u/{userId}/{libraryId}/{collectionKey}/... */
export function parsePublicPath(pathname: string): {
  userId: string;
  libraryId: string;
  collectionKey: string;
  relPath: string;
} | null {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");
  // u / userId / libraryId / collectionKey / [rel...]
  if (parts[0] !== "u" || parts.length < 4) {
    return null;
  }
  const userId = parts[1];
  const libraryId = parts[2];
  const collectionKey = parts[3];
  const rest = parts.slice(4);
  const relPath = rest.length === 0 ? "index.html" : rest.join("/");
  try {
    assertSafeSegment(userId, "userId");
    assertSafeSegment(libraryId, "libraryId");
    assertSafeSegment(collectionKey, "collectionKey");
    assertRelPath(relPath);
  } catch {
    return null;
  }
  return { userId, libraryId, collectionKey, relPath };
}
