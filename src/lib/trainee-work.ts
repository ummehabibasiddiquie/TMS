/**
 * Manual training work metrics (hours / production / quality) entered by Admin or Team Lead.
 * Replaces live HRMS tracker fetch for training progress views.
 */

import { prisma } from "./db";
import { getDayWisePlan } from "./day-wise-training";
import { productionScorePercent } from "./work-metrics-display";

export type TraineeDayWork = {
  projectId: string;
  projectName: string;
  dayNumber: number;
  hoursLogged: number | null;
  productionUnits: number | null;
  productionTarget: number | null;
  productionScorePercent: number | null;
  entries: number;
  qualityScore: number | null;
  qcSamples: number;
  lastActivityAt: string | null;
  notes?: string | null;
  recordedByName?: string | null;
  message?: string;
};

export type TraineeWorkSummary = {
  configured: boolean;
  connected: boolean;
  hrmsUserId: null;
  projects: TraineeDayWork[];
  totals: {
    hoursLogged: number | null;
    productionUnits: number | null;
    /** Sum of unit goals on all scheduled training-work days. */
    productionTargetUnits: number | null;
    productionScorePercent: number | null;
    /** Like learning %: average day score over all training-work days through current day (missing days = 0). */
    workOverallPercent: number | null;
    workDaysExpected: number;
    /** Work days on or before the trainee's current day. */
    workDaysDueThroughToday: number;
    workDaysLogged: number;
    entries: number;
    /** Average quality % on days where quality was entered (not schedule-weighted). */
    qualityScoreLoggedAvg: number | null;
    qualityScore: number | null;
  };
  message?: string;
};

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampQuality(v: number | null): number | null {
  if (v == null) return null;
  return Math.min(100, Math.max(0, Math.round(v * 10) / 10));
}

function clampPct(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

function metricRowSubmitted(row: {
  hoursLogged: number | null;
  productionUnits: number | null;
  qualityScore: number | null;
}) {
  return (
    row.hoursLogged != null ||
    row.productionUnits != null ||
    row.qualityScore != null
  );
}

function planDayHasWork(d: {
  workItems?: { productionTarget?: number | null }[] | undefined;
  hrmsProjectId?: string | null;
  projectName?: string | null;
  dayType?: string;
}) {
  if ((d.workItems?.length ?? 0) > 0) return true;
  if (d.hrmsProjectId?.trim()) return true;
  if (d.projectName?.trim() && d.dayType !== "CHECKLIST") return true;
  return false;
}

/** Per-day work score (0–100): capped production vs goal + quality; missing pieces count as 0. */
function scoreWorkDay(
  row:
    | {
        hoursLogged: number | null;
        productionUnits: number | null;
        qualityScore: number | null;
      }
    | undefined,
  productionTarget: number | null
): { day: number; prod: number; qual: number } {
  if (!row || !metricRowSubmitted(row)) {
    return { day: 0, prod: 0, qual: 0 };
  }
  const hasGoal = productionTarget != null && productionTarget > 0;
  const prodRaw = hasGoal
    ? productionScorePercent(row.productionUnits, productionTarget)
    : null;
  const prod = hasGoal ? (prodRaw != null ? prodRaw : 0) : 0;
  const qual =
    row.qualityScore != null ? clampPct(Number(row.qualityScore)) : 0;
  const parts = hasGoal ? [prod, qual] : qual > 0 || row.qualityScore != null ? [qual] : [];
  if (parts.length === 0) return { day: 0, prod, qual };
  const day = parts.reduce((a, b) => a + b, 0) / parts.length;
  return { day: clampPct(day), prod, qual };
}

/** Aggregate saved metrics for a trainee (optionally through a day number). */
export async function listTraineeWorkMetrics(
  traineeId: string,
  options?: { throughDayNumber?: number }
): Promise<TraineeWorkSummary> {
  if (!prisma.traineeWorkMetric) {
    return {
      configured: true,
      connected: false,
      hrmsUserId: null,
      projects: [],
      totals: {
        hoursLogged: null,
        productionUnits: null,
        productionTargetUnits: null,
        productionScorePercent: null,
        workOverallPercent: null,
        workDaysExpected: 0,
        workDaysDueThroughToday: 0,
        workDaysLogged: 0,
        entries: 0,
        qualityScoreLoggedAvg: null,
        qualityScore: null,
      },
      message:
        "Work metrics model is not available. Restart the app after prisma generate.",
    };
  }

  const through = options?.throughDayNumber;
  const rows = await prisma.traineeWorkMetric.findMany({
    where: {
      traineeId,
      ...(through != null && Number.isFinite(through)
        ? { dayNumber: { lte: through } }
        : {}),
    },
    include: { recordedBy: { select: { name: true } } },
    orderBy: { dayNumber: "asc" },
  });

  const plan = await getDayWisePlan(traineeId);
  const currentDay =
    through != null && Number.isFinite(through)
      ? Math.floor(through)
      : plan.currentDay;

  const metricsByDay = new Map(rows.map((r) => [r.dayNumber, r]));

  const targetByDay = new Map<number, number>();
  /** Every training-work day on the schedule (e.g. 4 days even if trainee is still on Day 1). */
  const workDayNumbers: number[] = [];
  for (const d of plan.allDays) {
    if (!planDayHasWork(d)) continue;
    workDayNumbers.push(d.dayNumber);
    const target = d.workItems?.find(
      (w) => w.productionTarget != null && w.productionTarget > 0
    )?.productionTarget;
    if (target != null) targetByDay.set(d.dayNumber, target);
  }
  workDayNumbers.sort((a, b) => a - b);

  let productionTargetTotal = 0;
  for (const dayNumber of workDayNumbers) {
    const t = targetByDay.get(dayNumber);
    if (t != null && t > 0) productionTargetTotal += t;
  }

  let scheduleDaySum = 0;
  let scheduleProdSum = 0;
  let scheduleQualSum = 0;
  let workDaysLogged = 0;
  let workDaysDueThroughToday = 0;
  for (const dayNumber of workDayNumbers) {
    const dueYet = dayNumber <= currentDay;
    if (dueYet) workDaysDueThroughToday += 1;

    if (dueYet) {
      const row = metricsByDay.get(dayNumber);
      if (row && metricRowSubmitted(row)) workDaysLogged += 1;
      const target = targetByDay.get(dayNumber) ?? null;
      const scored = scoreWorkDay(row, target);
      scheduleDaySum += scored.day;
      scheduleProdSum += scored.prod;
      scheduleQualSum += scored.qual;
    }
    // Days after current day stay 0 in the sum (pending), but still count in denominator.
  }
  const workDaysExpected = workDayNumbers.length;
  const workOverallPercent =
    workDaysExpected > 0
      ? clampPct(scheduleDaySum / workDaysExpected)
      : null;
  const scheduleProdAvg =
    workDaysExpected > 0
      ? clampPct(scheduleProdSum / workDaysExpected)
      : null;
  const scheduleQualAvg =
    workDaysExpected > 0
      ? clampPct(scheduleQualSum / workDaysExpected)
      : null;

  const projects: TraineeDayWork[] = rows.map((r) => {
    const target = targetByDay.get(r.dayNumber) ?? null;
    const hasAny =
      r.hoursLogged != null ||
      r.productionUnits != null ||
      r.qualityScore != null;
    return {
      projectId: `day-${r.dayNumber}`,
      projectName: r.projectName?.trim() || `Day ${r.dayNumber}`,
      dayNumber: r.dayNumber,
      hoursLogged: r.hoursLogged,
      productionUnits: r.productionUnits,
      productionTarget: target,
      productionScorePercent: productionScorePercent(r.productionUnits, target),
      entries: hasAny ? 1 : 0,
      qualityScore: r.qualityScore,
      qcSamples: r.qualityScore != null ? 1 : 0,
      lastActivityAt: r.updatedAt.toISOString(),
      notes: r.notes,
      recordedByName: r.recordedBy?.name ?? null,
    };
  });

  let totalHours = 0;
  let totalProd = 0;
  let hoursN = 0;
  let prodN = 0;
  let entries = 0;
  let qualityLoggedSum = 0;
  let qualityLoggedN = 0;

  for (const p of projects) {
    if (p.entries > 0) entries += p.entries;
    if (p.hoursLogged != null) {
      totalHours += p.hoursLogged;
      hoursN += 1;
    }
    if (p.productionUnits != null) {
      totalProd += p.productionUnits;
      prodN += 1;
    }
    if (p.qualityScore != null) {
      qualityLoggedSum += p.qualityScore;
      qualityLoggedN += 1;
    }
  }

  const qualityScoreLoggedAvg =
    qualityLoggedN > 0
      ? Math.round((qualityLoggedSum / qualityLoggedN) * 10) / 10
      : null;

  return {
    configured: true,
    connected: true,
    hrmsUserId: null,
    projects,
    totals: {
      hoursLogged: hoursN > 0 ? Math.round(totalHours * 10) / 10 : null,
      productionUnits: prodN > 0 ? Math.round(totalProd * 10) / 10 : null,
      productionTargetUnits:
        productionTargetTotal > 0 ? Math.round(productionTargetTotal) : null,
      productionScorePercent: scheduleProdAvg,
      workOverallPercent,
      workDaysExpected,
      workDaysDueThroughToday,
      workDaysLogged,
      entries,
      qualityScoreLoggedAvg,
      qualityScore: scheduleQualAvg,
    },
    message:
      projects.length === 0
        ? "No work metrics recorded yet. Team Lead or Admin can add hours, production units, and quality scores."
        : undefined,
  };
}

export async function upsertTraineeWorkMetric(args: {
  traineeId: string;
  dayNumber: number;
  recordedById: string;
  projectName?: string | null;
  hoursLogged?: number | null;
  productionUnits?: number | null;
  qualityScore?: number | null;
  notes?: string | null;
}) {
  const dayNumber = Math.floor(Number(args.dayNumber));
  if (!Number.isFinite(dayNumber) || dayNumber < 1) {
    throw new Error("dayNumber must be a positive integer");
  }

  const hoursLogged = numOrNull(args.hoursLogged);
  const productionUnits = numOrNull(args.productionUnits);
  const qualityScore = clampQuality(numOrNull(args.qualityScore));
  const projectName =
    args.projectName != null && String(args.projectName).trim()
      ? String(args.projectName).trim()
      : null;
  const notes =
    args.notes != null && String(args.notes).trim()
      ? String(args.notes).trim()
      : null;

  // Clear row if all metrics empty
  const allEmpty =
    hoursLogged == null &&
    productionUnits == null &&
    qualityScore == null &&
    !notes;

  if (allEmpty) {
    await prisma.traineeWorkMetric.deleteMany({
      where: { traineeId: args.traineeId, dayNumber },
    });
    await syncWorkChecklistProgress(args.traineeId, dayNumber, false);
    return null;
  }

  const row = await prisma.traineeWorkMetric.upsert({
    where: {
      traineeId_dayNumber: {
        traineeId: args.traineeId,
        dayNumber,
      },
    },
    create: {
      traineeId: args.traineeId,
      dayNumber,
      projectName,
      hoursLogged,
      productionUnits,
      qualityScore,
      notes,
      recordedById: args.recordedById,
    },
    update: {
      projectName,
      hoursLogged,
      productionUnits,
      qualityScore,
      notes,
      recordedById: args.recordedById,
    },
    include: { recordedBy: { select: { name: true } } },
  });

  await syncWorkChecklistProgress(args.traineeId, dayNumber, true);
  return row;
}

/** Mark curriculum WORK items complete when Work Metrics are saved for that day. */
async function syncWorkChecklistProgress(
  traineeId: string,
  dayNumber: number,
  completed: boolean
) {
  const { resolveCurriculumScope } = await import("./day-wise-training");
  const { scopeKey } = await resolveCurriculumScope(traineeId);
  const day = await prisma.curriculumDay.findFirst({
    where: { scopeKey, dayNumber },
    select: {
      checklistItems: {
        where: { kind: "WORK" },
        select: { id: true },
      },
    },
  });
  if (!day?.checklistItems.length) return;

  const now = completed ? new Date() : null;
  await Promise.all(
    day.checklistItems.map((item) =>
      prisma.userChecklistProgress.upsert({
        where: {
          userId_itemId: { userId: traineeId, itemId: item.id },
        },
        create: {
          userId: traineeId,
          itemId: item.id,
          completed,
          completedAt: now,
        },
        update: {
          completed,
          completedAt: now,
        },
      })
    )
  );
}
