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
