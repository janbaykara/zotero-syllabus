import { formatDate } from "date-fns";

export function formatReadingDate(isoDate: string): string {
  const date = new Date(isoDate);
  return formatDate(date, "iiii do");
}
