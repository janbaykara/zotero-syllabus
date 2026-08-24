import { formatDate } from "date-fns";

/**
 * Calendar date from a stored ISO value.
 * Reading dates are date-only (the time is always UTC midnight), so parse the
 * YYYY-MM-DD prefix in the local timezone instead of `new Date(iso)`, which
 * shifts the calendar day west of UTC.
 */
export function parseReadingDate(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) {
    const fallback = new Date(isoDate);
    if (Number.isNaN(fallback.getTime())) {
      return fallback;
    }
    return new Date(
      fallback.getFullYear(),
      fallback.getMonth(),
      fallback.getDate(),
    );
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatReadingDate(
  isoDate: string,
  month: boolean = true,
): string {
  const date = parseReadingDate(isoDate);
  return formatDate(date, month ? "iiii do MMM" : "iiii do");
}
