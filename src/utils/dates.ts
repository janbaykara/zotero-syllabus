import { formatDate } from "date-fns";

export function formatReadingDate(
  isoDate: string,
  month: boolean = true,
): string {
  const date = new Date(isoDate);
  return formatDate(date, month ? "iiii do MMM" : "iiii do");
}
