/**
 * Day-wise due dates from training start (join date).
 * Day 1 due on join (first working day). Each next day due on the next Mon–Fri working day.
 * Sat/Sun are weekoffs — never due dates and not counted in “Xd overdue”.
 * HRMS holidays are optional later via WorkingCalendar.holidayDates.
 * Trainees may complete open days in any order; due/late still apply per day.
 */

import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import { DISPLAY_DATE_FORMAT, formatIsoDate, parseAppDate } from "./format-date";
import {
  type WorkingCalendar,
  dueDateForTrainingDay,
  emptyWorkingCalendar,
  workingDaysAfterDue,
} from "./working-calendar";

export type { WorkingCalendar } from "./working-calendar";
export { emptyWorkingCalendar };

export type DayDueStatus =
  | "UPCOMING"
  | "DUE_TODAY"
  | "OVERDUE"
  | "DONE_ON_TIME"
  | "DONE_LATE"
  | "NO_START";

export type DayDueInfo = {
  dueDate: string;
  completedAt: string | null;
  status: DayDueStatus;
  /** Working days after due (overdue now, or when completed late). */
  daysLate: number | null;
  label: string;
};

export function resolveTrainingStartDate(
  dateOfJoining: Date | string | null | undefined,
  createdAt?: Date | string | null
): Date | null {
  const raw = dateOfJoining || createdAt;
  if (!raw) return null;
  const d =
    raw instanceof Date
      ? parseAppDate(format(raw, "yyyy-MM-dd")) ?? raw
      : parseAppDate(raw);
  if (!d || Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

/** Due calendar date for Day N (1-based; Mon–Fri, Sat/Sun off). */
export function dueDateForDay(
  trainingStart: Date,
  dayNumber: number,
  cal: WorkingCalendar = emptyWorkingCalendar
): Date {
  return dueDateForTrainingDay(trainingStart, dayNumber, cal);
}

export function computeDayDueInfo(args: {
  dayNumber: number;
  done: boolean;
  completedAt?: Date | string | null;
  trainingStart: Date | null;
  today?: Date;
  calendar?: WorkingCalendar;
}): DayDueInfo {
  const cal = args.calendar ?? emptyWorkingCalendar;
  const today = startOfDay(args.today ?? new Date());

  if (!args.trainingStart) {
    return {
      dueDate: "",
      completedAt: args.completedAt
        ? new Date(args.completedAt).toISOString()
        : null,
      status: "NO_START",
      daysLate: null,
      label: "No join date",
    };
  }

  const due = dueDateForDay(args.trainingStart, args.dayNumber, cal);
  const dueDate = format(due, "yyyy-MM-dd");
  const completedRaw = args.completedAt
    ? typeof args.completedAt === "string"
      ? new Date(args.completedAt)
      : args.completedAt
    : null;
  const completedAt =
    completedRaw && !Number.isNaN(completedRaw.getTime())
      ? completedRaw.toISOString()
      : null;

  if (args.done) {
    const completedDay = completedRaw
      ? startOfDay(completedRaw)
      : today;
    const late = workingDaysAfterDue(due, completedDay, cal);
    if (late > 0) {
      return {
        dueDate,
        completedAt,
        status: "DONE_LATE",
        daysLate: late,
        label: `Done ${late}d late`,
      };
    }
    return {
      dueDate,
      completedAt,
      status: "DONE_ON_TIME",
      daysLate: 0,
      label: "Done on time",
    };
  }

  const untilDue = differenceInCalendarDays(due, today);
  if (untilDue > 0) {
    return {
      dueDate,
      completedAt: null,
      status: "UPCOMING",
      daysLate: null,
      label: `Due ${format(due, DISPLAY_DATE_FORMAT)}`,
    };
  }
  if (untilDue === 0) {
    return {
      dueDate,
      completedAt: null,
      status: "DUE_TODAY",
      daysLate: 0,
      label: "Due today",
    };
  }
  const overdue = workingDaysAfterDue(due, today, cal);
  return {
    dueDate,
    completedAt: null,
    status: "OVERDUE",
    daysLate: overdue,
    label: overdue > 0 ? `${overdue}d overdue` : "Overdue",
  };
}

export type DueSummary = {
  trainingStart: string | null;
  overdueCount: number;
  dueTodayCount: number;
  doneLateCount: number;
  doneOnTimeCount: number;
  maxOverdueDays: number;
};

export function summarizeDue(
  days: DayDueInfo[],
  trainingStart: Date | null
): DueSummary {
  let overdueCount = 0;
  let dueTodayCount = 0;
  let doneLateCount = 0;
  let doneOnTimeCount = 0;
  let maxOverdueDays = 0;
  for (const d of days) {
    if (d.status === "OVERDUE") {
      overdueCount += 1;
      maxOverdueDays = Math.max(maxOverdueDays, d.daysLate ?? 0);
    } else if (d.status === "DUE_TODAY") dueTodayCount += 1;
    else if (d.status === "DONE_LATE") doneLateCount += 1;
    else if (d.status === "DONE_ON_TIME") doneOnTimeCount += 1;
  }
  return {
    trainingStart: trainingStart ? formatIsoDate(trainingStart) : null,
    overdueCount,
    dueTodayCount,
    doneLateCount,
    doneOnTimeCount,
    maxOverdueDays,
  };
}

export function dueBadgeClass(status: DayDueStatus): string {
  switch (status) {
    case "OVERDUE":
      return "text-red-700 dark:text-red-300";
    case "DUE_TODAY":
      return "text-amber-800 dark:text-amber-200";
    case "DONE_LATE":
      return "text-orange-800 dark:text-amber-300";
    case "DONE_ON_TIME":
      return "text-emerald-700 dark:text-emerald-300";
    case "UPCOMING":
      return "text-slate-500 dark:text-slate-500";
    default:
      return "text-slate-600 dark:text-slate-600";
  }
}
