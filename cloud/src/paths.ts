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

/** Reserved public path segment that disambiguates item shares from syllabi. */
export const ITEM_PATH_SEGMENT = "item";

/** Relative object path inside a syllabus folder. */
export function assertSyllabusRelPath(relPath: string): string {
  const p = relPath.replace(/^\/+/, "").trim();
  if (
    p === "index.html" ||
    p === "bibliography.ris" ||
    p === "bibliography.bib" ||
    p === "bibliography.rdf" ||
    p === "og-image.jpg" ||
    p === "itemKeys.json" ||
    p === "share.json" ||
    p === "viewer.js" ||
    p === "viewer.css"
  ) {
    return p;
  }
  const m = /^files\/([A-Za-z0-9._-]+\.[A-Za-z0-9]+)$/.exec(p);
  if (!m) {
    throw new PathError("Invalid object path");
  }
  return p;
}

/**
 * Relative object path inside an item folder (client-uploadable).
 * refs.json is Worker-owned and not accepted via PUT.
 */
export function assertItemRelPath(relPath: string): string {
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

/** @deprecated Prefer assertSyllabusRelPath / assertItemRelPath */
export function assertRelPath(relPath: string): string {
  return assertSyllabusRelPath(relPath);
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

export function userItemPrefix(
  userId: string,
  libraryId: string,
  itemKey: string,
): string {
  const u = assertSafeSegment(userId, "userId");
  const lib = assertSafeSegment(libraryId, "libraryId");
  const item = assertSafeSegment(itemKey, "itemKey");
  return `users/${u}/items/${lib}/${item}/`;
}

export function objectKey(
  userId: string,
  libraryId: string,
  collectionKey: string,
  relPath: string,
): string {
  return `${userSyllabusPrefix(userId, libraryId, collectionKey)}${assertSyllabusRelPath(relPath)}`;
}

export function itemObjectKey(
  userId: string,
  libraryId: string,
  itemKey: string,
  relPath: string,
): string {
  return `${userItemPrefix(userId, libraryId, itemKey)}${assertItemRelPath(relPath)}`;
}

export function userRootPrefix(userId: string): string {
  return `users/${assertSafeSegment(userId, "userId")}/`;
}

export function contentTypeForPath(relPath: string): string {
  const lower = relPath.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return "text/html; charset=utf-8";
  }
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) {
    return "text/javascript; charset=utf-8";
  }
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
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

export type PublicPath =
  | {
      kind: "syllabus";
      userId: string;
      libraryId: string;
      collectionKey: string;
      relPath: string;
    }
  | {
      kind: "item";
      userId: string;
      libraryId: string;
      itemKey: string;
      relPath: string;
    };

/** Paths that must not be served publicly. */
export function isPrivateRelPath(relPath: string): boolean {
  return relPath === "refs.json" || relPath === "itemKeys.json";
}

/**
 * Parse /u/{userId}/{libraryId}/{collectionKey}/…
 * or /u/{userId}/{libraryId}/item/{itemKey}/…
 */
export function parsePublicPath(pathname: string): PublicPath | null {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");
  // u / userId / libraryId / …
  if (parts[0] !== "u" || parts.length < 4) {
    return null;
  }
  const userId = parts[1];
  const libraryId = parts[2];

  try {
    assertSafeSegment(userId, "userId");
    assertSafeSegment(libraryId, "libraryId");
  } catch {
    return null;
  }

  if (parts[3] === ITEM_PATH_SEGMENT) {
    if (parts.length < 5) {
      return null;
    }
    const itemKey = parts[4];
    const rest = parts.slice(5);
    const relPath = rest.length === 0 ? "index.html" : rest.join("/");
    try {
      assertSafeSegment(itemKey, "itemKey");
      // Allow known item paths; refs.json parses but is blocked at serve time.
      if (relPath === "refs.json") {
        return { kind: "item", userId, libraryId, itemKey, relPath };
      }
      assertItemRelPath(relPath);
    } catch {
      return null;
    }
    return { kind: "item", userId, libraryId, itemKey, relPath };
  }

  const collectionKey = parts[3];
  const rest = parts.slice(4);
  const relPath = rest.length === 0 ? "index.html" : rest.join("/");
  try {
    assertSafeSegment(collectionKey, "collectionKey");
    if (relPath === "itemKeys.json") {
      return { kind: "syllabus", userId, libraryId, collectionKey, relPath };
    }
    assertSyllabusRelPath(relPath);
  } catch {
    return null;
  }
  return { kind: "syllabus", userId, libraryId, collectionKey, relPath };
}

export function r2KeyForPublicPath(parsed: PublicPath): string {
  if (parsed.kind === "item") {
    if (parsed.relPath === "refs.json") {
      return `${userItemPrefix(parsed.userId, parsed.libraryId, parsed.itemKey)}refs.json`;
    }
    return itemObjectKey(
      parsed.userId,
      parsed.libraryId,
      parsed.itemKey,
      parsed.relPath,
    );
  }
  if (parsed.relPath === "itemKeys.json") {
    return `${userSyllabusPrefix(parsed.userId, parsed.libraryId, parsed.collectionKey)}itemKeys.json`;
  }
  return objectKey(
    parsed.userId,
    parsed.libraryId,
    parsed.collectionKey,
    parsed.relPath,
  );
}

export function publicUrlForSyllabus(
  base: string,
  userId: string,
  libraryId: string,
  collectionKey: string,
): string {
  return `${base.replace(/\/+$/, "")}/u/${userId}/${libraryId}/${collectionKey}/`;
}

export function publicUrlForItem(
  base: string,
  userId: string,
  libraryId: string,
  itemKey: string,
): string {
  return `${base.replace(/\/+$/, "")}/u/${userId}/${libraryId}/${ITEM_PATH_SEGMENT}/${itemKey}/`;
}

/** Absolute same-origin path to a shared item attachment. */
export function publicItemFilePath(
  userId: string,
  libraryId: string,
  itemKey: string,
  attachmentRelPath: string,
): string {
  const rel = assertItemRelPath(attachmentRelPath);
  return `/u/${userId}/${libraryId}/${ITEM_PATH_SEGMENT}/${itemKey}/${rel}`;
}
