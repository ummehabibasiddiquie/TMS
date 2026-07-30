/**
 * App-wide date display formats (use everywhere in UI).
 * Dates:     29 Jul 2026
 * Date/time: 29 Jul 2026, 2:30 pm
 */

import { format, isValid, startOfDay } from "date-fns";

export const DISPLAY_DATE_FORMAT = "d MMM yyyy";
export const DISPLAY_DATETIME_FORMAT = "d MMM yyyy, h:mm a";
export const ISO_DATE_FORMAT = "yyyy-MM-dd";

export function parseAppDate(
  value: Date | string | null | undefined
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00`);
    return isValid(d) ? d : null;
  }
  const d = new Date(raw);
  return isValid(d) ? d : null;
}

/** Standard date for tables, cards, schedules — e.g. 29 Jul 2026 */
export function formatDisplayDate(
  value: Date | string | null | undefined,
  fallback = "—"
): string {
  const d = parseAppDate(value);
  if (!d) return fallback;
  return format(d, DISPLAY_DATE_FORMAT);
}

/** Standard date + time — e.g. 29 Jul 2026, 2:30 pm */
export function formatDisplayDateTime(
  value: Date | string | null | undefined,
  fallback = "—"
): string {
  const d = parseAppDate(value);
  if (!d) return fallback;
  return format(d, DISPLAY_DATETIME_FORMAT);
}

/** Certificate month line — e.g. July 2026 */
export function formatMonthYear(
  value: Date | string | null | undefined,
  fallback = ""
): string {
  const d = parseAppDate(value);
  if (!d) return fallback;
  return format(d, "MMMM yyyy");
}

/** ISO calendar date for APIs / storage — yyyy-MM-dd */
export function formatIsoDate(
  value: Date | string | null | undefined
): string | null {
  const d = parseAppDate(value);
  if (!d) return null;
  return format(startOfDay(d), ISO_DATE_FORMAT);
}
