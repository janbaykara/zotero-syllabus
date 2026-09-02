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

/** English ordinal format used in stored Reading Schedule folder names. */
export function formatReadingDateStored(
  isoDate: string,
  month: boolean = true,
): string {
  const date = parseReadingDate(isoDate);
  return formatDate(date, month ? "iiii do MMM" : "iiii do");
}

/** UI display dates follow Zotero’s locale. Do not use for stored folder names. */
export function formatReadingDate(
  isoDate: string,
  month: boolean = true,
): string {
  const date = parseReadingDate(isoDate);
  const locale =
    typeof Zotero !== "undefined" ? Zotero.locale || "en-US" : "en-US";
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
  };
  if (month) {
    options.month = "short";
  }
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return formatReadingDateStored(isoDate, month);
  }
}

function zoteroLocale(): string {
  try {
    if (typeof Zotero !== "undefined" && Zotero.locale) {
      return Zotero.locale;
    }
  } catch {
    // Tests and early startup have no Zotero.
  }
  return "en-US";
}

/** Parse a Zotero SQL/ISO datetime (`YYYY-MM-DD HH:MM:SS`, typically UTC). */
export function parseItemDateMs(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const dated = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const ms = Date.parse(dated);
  return Number.isNaN(ms) ? 0 : ms;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

/** Whole local calendar days from `from` to `to` (can be negative). */
export function calendarDayDiff(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / DAY_MS);
}

/**
 * Locale-relative calendar label for a reading date (“tomorrow”, “in 3 days”).
 * Compares local calendar days so the time of day does not matter.
 */
export function formatRelativeReadingDate(
  isoDate: string,
  now: Date = new Date(),
  locale = zoteroLocale(),
): string | null {
  const date = parseReadingDate(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const today = parseReadingDate(toLocalDateKey(now));
  const diffDays = calendarDayDiff(today, date);
  const abs = Math.abs(diffDays);
  let unit: Intl.RelativeTimeFormatUnit = "day";
  let amount = diffDays;
  if (abs >= 14 && abs < 60) {
    unit = "week";
    amount = Math.round(diffDays / 7);
  } else if (abs >= 60 && abs < 365) {
    unit = "month";
    amount = Math.round(diffDays / 30);
  } else if (abs >= 365) {
    unit = "year";
    amount = Math.round(diffDays / 365);
  }
  try {
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
      style: "long",
    }).format(amount, unit);
  } catch {
    return null;
  }
}

/**
 * Locale-relative timestamp for item/annotation datetimes (“2 hours ago”).
 * Uses `Intl.RelativeTimeFormat` so the copy follows Zotero’s locale.
 */
export function formatRelativeTimestamp(
  value: string | undefined,
  now = Date.now(),
  locale = zoteroLocale(),
): { relative: string; iso: string; absolute: string } | null {
  const ms = parseItemDateMs(value);
  if (!ms) {
    return null;
  }
  const delta = ms - now;
  const abs = Math.abs(delta);
  let unit: Intl.RelativeTimeFormatUnit;
  let amount: number;
  if (abs < 45_000) {
    unit = "second";
    amount = 0;
  } else if (abs < 45 * MINUTE_MS) {
    unit = "minute";
    amount = Math.round(delta / MINUTE_MS);
  } else if (abs < 22 * HOUR_MS) {
    unit = "hour";
    amount = Math.round(delta / HOUR_MS);
  } else if (abs < WEEK_MS) {
    unit = "day";
    amount = Math.round(delta / DAY_MS);
  } else if (abs < MONTH_MS) {
    unit = "week";
    amount = Math.round(delta / WEEK_MS);
  } else if (abs < YEAR_MS) {
    unit = "month";
    amount = Math.round(delta / MONTH_MS);
  } else {
    unit = "year";
    amount = Math.round(delta / YEAR_MS);
  }
  try {
    const date = new Date(ms);
    const relative = new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
      style: "long",
    }).format(amount, unit);
    const absolute = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
    return { relative, iso: date.toISOString(), absolute };
  } catch {
    return null;
  }
}

/** Inclusive lookback for the managed Reading schedule collection. */
export const READING_SCHEDULE_LOOKBACK_DAYS = 10;

/**
 * True when the reading date is today, in the future, or within the past
 * {@link READING_SCHEDULE_LOOKBACK_DAYS} local calendar days.
 */
export function isReadingDateInScheduleWindow(
  isoDate: string,
  now: Date = new Date(),
): boolean {
  const date = parseReadingDate(isoDate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const today = parseReadingDate(toLocalDateKey(now));
  const cutoff = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - READING_SCHEDULE_LOOKBACK_DAYS,
  );
  return date.getTime() >= cutoff.getTime();
}
