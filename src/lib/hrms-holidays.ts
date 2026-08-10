/**
 * HRMS company holidays for training due dates (future).
 * Until the holiday table exists in mytfs, due dates use Mon–Fri only (Sat/Sun off).
 *
 * When ready, set HRMS_HOLIDAY_ENABLED=1 and configure:
 * - HRMS_HOLIDAY_TABLE (default: holiday)
 * - HRMS_HOLIDAY_DATE_COLUMN (default: holiday_date)
 */

import { startOfDay } from "date-fns";
import {
  type WorkingCalendar,
  emptyWorkingCalendar,
} from "./working-calendar";

function holidaysEnabled(): boolean {
  return process.env.HRMS_HOLIDAY_ENABLED === "1";
}

/** No-op until HRMS holiday table exists. */
export async function fetchHrmsHolidayDates(
  _from: Date,
  _to: Date
): Promise<Set<string>> {
  if (!holidaysEnabled()) return new Set();
  // Future: restore mysql fetch when table is available.
  console.warn(
    "HRMS_HOLIDAY_ENABLED=1 but holiday fetch is not implemented yet."
  );
  return new Set();
}

export async function getWorkingCalendar(
  _trainingStart: Date | null,
  _today: Date = new Date()
): Promise<WorkingCalendar> {
  if (!holidaysEnabled()) return emptyWorkingCalendar;
  const holidayDates = await fetchHrmsHolidayDates(
    startOfDay(new Date()),
    startOfDay(new Date())
  );
  return { holidayDates };
}

export async function getDefaultWorkingCalendar(): Promise<WorkingCalendar> {
  return emptyWorkingCalendar;
}

export { emptyWorkingCalendar };
