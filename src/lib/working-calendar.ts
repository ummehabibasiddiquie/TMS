import { addDays, format, startOfDay } from "date-fns";

/** yyyy-MM-dd keys of non-working days from HRMS (plus Sat/Sun are always off). */
export type WorkingCalendar = {
  holidayDates: ReadonlySet<string>;
};

export const emptyWorkingCalendar: WorkingCalendar = { holidayDates: new Set() };

export function dateKey(d: Date): string {
  return format(startOfDay(d), "yyyy-MM-dd");
}

export function isWeekend(d: Date): boolean {
  const dow = startOfDay(d).getDay();
  return dow === 0 || dow === 6;
}

export function isWorkingDay(d: Date, cal: WorkingCalendar = emptyWorkingCalendar): boolean {
  const day = startOfDay(d);
  if (isWeekend(day)) return false;
  return !cal.holidayDates.has(dateKey(day));
}

export function nextWorkingDay(d: Date, cal: WorkingCalendar = emptyWorkingCalendar): Date {
  let c = startOfDay(d);
  while (!isWorkingDay(c, cal)) {
    c = addDays(c, 1);
  }
  return c;
}

/**
 * Due date for curriculum Day N (Mon–Fri only; Sat/Sun never count).
 * Day 1 = first working day on/after join; Day 2 = next working day; and so on.
 * Example: join Thu 6 Aug → Day 1 due Thu, Day 2 due Fri; on Mon 10 Aug → 1 working day overdue, not 3.
 */
export function dueDateForTrainingDay(
  trainingStart: Date,
  dayNumber: number,
  cal: WorkingCalendar = emptyWorkingCalendar
): Date {
  const n = Math.max(1, Math.floor(dayNumber));
  let current = startOfDay(trainingStart);
  if (!isWorkingDay(current, cal)) {
    current = nextWorkingDay(current, cal);
  }
  let remaining = n - 1;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, cal)) remaining -= 1;
  }
  return current;
}

/** Working days strictly after due through asOf (used for late / overdue counts). */
export function workingDaysAfterDue(
  due: Date,
  asOf: Date,
  cal: WorkingCalendar = emptyWorkingCalendar
): number {
  const dueD = startOfDay(due);
  const end = startOfDay(asOf);
  if (end <= dueD) return 0;
  let count = 0;
  let c = addDays(dueD, 1);
  while (c <= end) {
    if (isWorkingDay(c, cal)) count += 1;
    c = addDays(c, 1);
  }
  return count;
}
