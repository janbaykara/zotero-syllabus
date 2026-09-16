/**
 * Normalize identifiers so import remap can match across common variants.
 */

export function normalizeDoi(raw: string | null | undefined): string {
  let value = String(raw || "")
    .trim()
    .toLowerCase();
  if (!value) {
    return "";
  }
  value = value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  value = value.replace(/^doi:\s*/i, "");
  return value.replace(/\/+$/, "").trim();
}

function isbnDigits(raw: string): string {
  return String(raw || "")
    .replace(/[-\s]/g, "")
    .toLowerCase();
}

function isbn13Checksum(body12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

/** ISBN-10 → ISBN-13 (978…). Returns "" if the value is not a 10-digit ISBN. */
export function isbn10To13(raw: string): string {
  const digits = isbnDigits(raw).replace(/x$/, "x");
  if (!/^\d{9}[\dx]$/.test(digits)) {
    return "";
  }
  const body = `978${digits.slice(0, 9)}`;
  return body + isbn13Checksum(body);
}

/**
 * Canonical ISBN for matching: ISBN-13 when we can derive it, otherwise
 * hyphen-stripped lowercase digits.
 */
export function normalizeIsbn(raw: string | null | undefined): string {
  const digits = isbnDigits(raw || "");
  if (!digits) {
    return "";
  }
  if (/^\d{13}$/.test(digits)) {
    return digits;
  }
  const as13 = isbn10To13(digits);
  return as13 || digits;
}

/** PubMed ID: digits only. Accepts PMID: prefixes and pubmed.gov URLs. */
export function normalizePmid(raw: string | null | undefined): string {
  const text = String(raw || "").trim();
  if (!text) {
    return "";
  }
  const fromUrl = text.match(
    /(?:pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov\/pubmed|europepmc\.org\/(?:abstract|article)\/MED)\/(\d{1,12})/i,
  );
  if (fromUrl) {
    return fromUrl[1];
  }
  const labeled = text.match(/^(?:pmid|pubmed(?:\s*id)?)\s*:?\s*(\d{1,12})$/i);
  if (labeled) {
    return labeled[1];
  }
  return /^\d{1,12}$/.test(text) ? text : "";
}

/** PMCID as PMC + digits. Accepts pmc/articles URLs and PMC prefixes. */
export function normalizePmcid(raw: string | null | undefined): string {
  let value = String(raw || "").trim();
  if (!value) {
    return "";
  }
  const fromUrl = value.match(/\/pmc\/articles\/(PMC\d+)/i);
  if (fromUrl) {
    return fromUrl[1].toUpperCase();
  }
  value = value.replace(/^(?:pmcid|pmc)\s*:?\s*/i, "");
  const digits = value.replace(/^pmc/i, "");
  return /^\d{1,10}$/.test(digits) ? `PMC${digits}` : "";
}

const ARXIV_NEW = /^\d{4}\.\d{4,5}$/;
const ARXIV_OLD = /^[a-z0-9.-]+\/\d{7}$/;

/**
 * Canonical arXiv id, without version. Accepts arxiv.org URLs, arXiv: prefixes,
 * and both new (YYMM.NNNNN) and old (archive/YYMMNNN) identifiers.
 */
export function normalizeArxiv(raw: string | null | undefined): string {
  let value = String(raw || "")
    .trim()
    .toLowerCase();
  if (!value) {
    return "";
  }
  value = value.replace(
    /^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf|html|ps)\//,
    "",
  );
  value = value.replace(/^arxiv(?:\.org)?\s*:?\s*/, "");
  value = value.replace(/\.pdf$/, "");
  value = value.replace(/v\d+$/, "");
  value = value.replace(/\/+$/, "");
  return ARXIV_NEW.test(value) || ARXIV_OLD.test(value) ? value : "";
}

function extraKeyedFields(extra: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of String(extra || "").split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key && value && !map.has(key)) {
      map.set(key, value);
    }
  }
  return map;
}

function pmidFromText(text: string): string {
  const url = text.match(
    /(?:pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov\/pubmed|europepmc\.org\/(?:abstract|article)\/MED)\/(\d{1,12})/i,
  );
  if (url) {
    return url[1];
  }
  const labeled = text.match(/\bPMID\s*:\s*(\d{1,12})\b/i);
  return labeled ? labeled[1] : "";
}

function pmcidFromText(text: string): string {
  const url = text.match(/\/pmc\/articles\/(PMC\d+)/i);
  if (url) {
    return url[1].toUpperCase();
  }
  const labeled = text.match(/\bPMCID\s*:\s*(?:PMC)?(\d{1,10})\b/i);
  return labeled ? `PMC${labeled[1]}` : "";
}

function arxivFromText(text: string): string {
  const url = text.match(/arxiv\.org\/(?:abs|pdf|html|ps)\/[^\s]+/i);
  if (url) {
    return normalizeArxiv(url[0]);
  }
  const labeled = text.match(/\barxiv(?:\.org)?\s*:\s*([^\s]+)/i);
  return labeled ? normalizeArxiv(labeled[1]) : "";
}

export type ItemLookupIds = {
  doi: string;
  isbn: string;
  pmid: string;
  pmcid: string;
  arxiv: string;
};

/** Extra / citation field key for export-local syllabus reading ids. */
export const SYLLABUS_EXPORT_ID_KEY = "zotero-syllabus-id";

const EXPORT_ID_LINE = new RegExp(
  `(?:^|\\n)\\s*${SYLLABUS_EXPORT_ID_KEY}\\s*:\\s*(\\S+)`,
  "i",
);
const EXPORT_ID_TAG = new RegExp(`^${SYLLABUS_EXPORT_ID_KEY}:(.+)$`, "i");

/** Read an export-local id from Extra text (or N1/abstract blobs). */
export function exportIdFromText(text: string | null | undefined): string {
  const raw = String(text || "");
  if (!raw) {
    return "";
  }
  const map = extraKeyedFields(raw);
  const fromMap = (map.get(SYLLABUS_EXPORT_ID_KEY) || "").trim();
  if (fromMap) {
    return fromMap;
  }
  const match = raw.match(EXPORT_ID_LINE);
  return match ? match[1].trim() : "";
}

/** Append `zotero-syllabus-id: …` to Extra without duplicating. */
export function appendExportIdToExtra(
  extra: string | null | undefined,
  exportId: string,
): string {
  const id = String(exportId || "").trim();
  if (!id) {
    return String(extra || "");
  }
  const base = String(extra || "").trim();
  if (exportIdFromText(base) === id) {
    return base;
  }
  const line = `${SYLLABUS_EXPORT_ID_KEY}: ${id}`;
  return base ? `${base}\n${line}` : line;
}

/**
 * Collect canonical identifiers from common Zotero fields (DOI, ISBN, Extra,
 * URL, preprint archiveID) so import remap can match across variants.
 */
export function identifiersFromFields(fields: {
  doi?: string | null;
  isbn?: string | null;
  pmid?: string | null;
  pmcid?: string | null;
  arxiv?: string | null;
  extra?: string | null;
  url?: string | null;
  archiveID?: string | null;
}): ItemLookupIds {
  const extra = String(fields.extra || "");
  const url = String(fields.url || "");
  const map = extraKeyedFields(extra);
  const blob = `${extra}\n${url}`;
  const eprinttype = (
    map.get("eprinttype") ||
    map.get("eprint-type") ||
    ""
  ).toLowerCase();
  const eprint = map.get("eprint") || "";
  let arxiv = normalizeArxiv(fields.arxiv) || normalizeArxiv(map.get("arxiv"));
  if (!arxiv && eprinttype === "arxiv") {
    arxiv = normalizeArxiv(eprint);
  }
  if (!arxiv) {
    arxiv =
      normalizeArxiv(eprint) ||
      normalizeArxiv(fields.archiveID) ||
      normalizeArxiv(url) ||
      arxivFromText(blob);
  }
  return {
    doi:
      normalizeDoi(fields.doi) ||
      normalizeDoi(map.get("doi")) ||
      normalizeDoi(url),
    isbn: normalizeIsbn(fields.isbn) || normalizeIsbn(map.get("isbn")),
    pmid:
      normalizePmid(fields.pmid) ||
      normalizePmid(
        map.get("pmid") || map.get("pubmed") || map.get("pubmed id"),
      ) ||
      normalizePmid(url) ||
      pmidFromText(blob),
    pmcid:
      normalizePmcid(fields.pmcid) ||
      normalizePmcid(map.get("pmcid") || map.get("pmc")) ||
      normalizePmcid(url) ||
      pmcidFromText(blob),
    arxiv,
  };
}

/** Resolve export-local id from Extra, abstract/notes blobs, or a dedicated tag. */
export function exportIdFromItem(item: Zotero.Item): string {
  try {
    const fromExtra = exportIdFromText(item.getField?.("extra"));
    if (fromExtra) {
      return fromExtra;
    }
  } catch {
    // ignore
  }
  try {
    const fromAbstract = exportIdFromText(item.getField?.("abstractNote"));
    if (fromAbstract) {
      return fromAbstract;
    }
  } catch {
    // ignore
  }
  try {
    const tags = item.getTags?.() || [];
    for (const entry of tags) {
      const tag =
        typeof entry === "string" ? entry : String(entry?.tag || "").trim();
      const match = tag.match(EXPORT_ID_TAG);
      if (match) {
        return match[1].trim();
      }
    }
  } catch {
    // ignore
  }
  return "";
}
