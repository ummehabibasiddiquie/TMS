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
    productionScorePercent: number | null;
    entries: number;
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
        productionScorePercent: null,
        entries: 0,
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
  const targetByDay = new Map<number, number>();
  for (const d of plan.allDays) {
    const target = d.workItems?.find(
      (w) => w.productionTarget != null && w.productionTarget > 0
    )?.productionTarget;
    if (target != null) targetByDay.set(d.dayNumber, target);
  }

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
  let qualitySum = 0;
  let qualityN = 0;
  let prodPctSum = 0;
  let prodPctN = 0;
  let entries = 0;

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
    if (p.productionScorePercent != null) {
      prodPctSum += p.productionScorePercent;
      prodPctN += 1;
    }
    if (p.qualityScore != null) {
      qualitySum += p.qualityScore;
      qualityN += 1;
    }
  }

  return {
    configured: true,
    connected: true,
    hrmsUserId: null,
    projects,
    totals: {
      hoursLogged: hoursN > 0 ? Math.round(totalHours * 10) / 10 : null,
      productionUnits: prodN > 0 ? Math.round(totalProd * 10) / 10 : null,
      productionScorePercent:
        prodPctN > 0 ? Math.round((prodPctSum / prodPctN) * 10) / 10 : null,
      entries,
      qualityScore:
        qualityN > 0 ? Math.round((qualitySum / qualityN) * 10) / 10 : null,
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
