/** Display fields stored on published index.html customMetadata. */

export const SYLLABUS_META_TITLE = "title";
export const SYLLABUS_META_COURSE_CODE = "courseCode";
export const SYLLABUS_META_INSTITUTION = "institution";
export const SYLLABUS_META_ITEM_TYPE = "itemType";
/** Item shares only: "y" or "n". */
export const SYLLABUS_META_ANNOTATIONS = "annotations";

export const META_HEADER_TITLE = "x-syllabus-title";
export const META_HEADER_COURSE_CODE = "x-syllabus-course-code";
export const META_HEADER_INSTITUTION = "x-syllabus-institution";
export const META_HEADER_ITEM_TYPE = "x-syllabus-item-type";
export const META_HEADER_ANNOTATIONS = "x-syllabus-annotations";

/** Max stored length per field (well under R2's 8 KiB metadata budget). */
export const META_FIELD_MAX_CHARS = 512;

export type SyllabusIndexMeta = {
  title: string;
  courseCode: string;
  institution: string;
  /** Item shares: localized item type label. */
  itemType: string;
  /** Item shares: "y" | "n" when known. */
  annotations: string;
};

export function sanitizeMetaField(
  raw: string | null | undefined,
  maxChars = META_FIELD_MAX_CHARS,
): string {
  if (!raw) return "";
  // Strip C0 controls + DEL; keep printable Unicode (institution names, accents).
  const cleaned = raw
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars).trim();
}

/** Normalize annotations flag to "y" / "n" / "". */
export function sanitizeAnnotationsFlag(
  raw: string | null | undefined,
): "" | "y" | "n" {
  const v = sanitizeMetaField(raw).toLowerCase();
  if (v === "y" || v === "yes" || v === "true" || v === "1") return "y";
  if (v === "n" || v === "no" || v === "false" || v === "0") return "n";
  return "";
}

/** Decode a transport header (percent-encoded UTF-8) into a sanitized field. */
export function decodeMetaHeader(raw: string | null | undefined): string {
  if (!raw) return "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Keep the raw value when decoding fails.
  }
  return sanitizeMetaField(decoded);
}

/** Encode a field for an HTTP request header (ASCII-safe). */
export function encodeMetaHeader(value: string): string {
  const cleaned = sanitizeMetaField(value);
  return cleaned ? encodeURIComponent(cleaned) : "";
}

export function syllabusMetaFromHeaders(
  headers: Headers,
): SyllabusIndexMeta | null {
  const title = decodeMetaHeader(headers.get(META_HEADER_TITLE));
  const courseCode = decodeMetaHeader(headers.get(META_HEADER_COURSE_CODE));
  const institution = decodeMetaHeader(headers.get(META_HEADER_INSTITUTION));
  const itemType = decodeMetaHeader(headers.get(META_HEADER_ITEM_TYPE));
  const annotations = sanitizeAnnotationsFlag(
    decodeMetaHeader(headers.get(META_HEADER_ANNOTATIONS)),
  );
  if (!title && !courseCode && !institution && !itemType && !annotations) {
    return null;
  }
  return { title, courseCode, institution, itemType, annotations };
}

export function customMetadataFromSyllabusMeta(
  meta: SyllabusIndexMeta,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (meta.title) out[SYLLABUS_META_TITLE] = meta.title;
  if (meta.courseCode) out[SYLLABUS_META_COURSE_CODE] = meta.courseCode;
  if (meta.institution) out[SYLLABUS_META_INSTITUTION] = meta.institution;
  if (meta.itemType) out[SYLLABUS_META_ITEM_TYPE] = meta.itemType;
  if (meta.annotations === "y" || meta.annotations === "n") {
    out[SYLLABUS_META_ANNOTATIONS] = meta.annotations;
  }
  return out;
}

export function syllabusMetaFromCustomMetadata(
  custom: Record<string, string> | undefined | null,
): SyllabusIndexMeta {
  return {
    title: sanitizeMetaField(custom?.[SYLLABUS_META_TITLE]),
    courseCode: sanitizeMetaField(custom?.[SYLLABUS_META_COURSE_CODE]),
    institution: sanitizeMetaField(custom?.[SYLLABUS_META_INSTITUTION]),
    itemType: sanitizeMetaField(custom?.[SYLLABUS_META_ITEM_TYPE]),
    annotations: sanitizeAnnotationsFlag(custom?.[SYLLABUS_META_ANNOTATIONS]),
  };
}

/** Header names for syllabus meta (CORS allow-list + PUT). */
export const SYLLABUS_META_HEADER_NAMES = [
  META_HEADER_TITLE,
  META_HEADER_COURSE_CODE,
  META_HEADER_INSTITUTION,
  META_HEADER_ITEM_TYPE,
  META_HEADER_ANNOTATIONS,
] as const;
