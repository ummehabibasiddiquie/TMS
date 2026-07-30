import { prisma } from "./db";
import { format } from "date-fns";
import {
  computeDayDueInfo,
  resolveTrainingStartDate,
  summarizeDue,
  type DayDueInfo,
  type DueSummary,
} from "./day-due";

export type { DayDueInfo, DueSummary } from "./day-due";
export { dueBadgeClass } from "./day-due";

export const GLOBAL_CURRICULUM_SCOPE = "GLOBAL";
/** Default template copied onto a trainee when Admin/TL adds an extra week. */
export const EXTRA_WEEK_CURRICULUM_SCOPE = "EXTRA_WEEK";

export function isSharedCurriculumScope(scopeKey: string) {
  return scopeKey === GLOBAL_CURRICULUM_SCOPE || scopeKey === EXTRA_WEEK_CURRICULUM_SCOPE;
}

export type DayLessonItem = {
  linkId: string;
  lessonId: string;
  courseId: string;
  label: string;
  title: string;
  courseTitle: string;
  moduleTitle: string;
  completed: boolean;
  watchPercent: number;
};

export type DayChecklistItem = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  /** CHECKLIST = tick tasks; WORK = hands-on training work */
  kind: "CHECKLIST" | "WORK";
  /** Assigned hours for WORK items */
  assignedHours: number | null;
  completed: boolean;
};

export type DaySnapshot = {
  dayNumber: number;
  title: string;
  dayType: "CHECKLIST" | "TRAINING" | "MIXED";
  projectName: string | null;
  hrmsProjectId: string | null;
  description: string | null;
  checklist: DayChecklistItem[];
  /** Hands-on training work items (subset of checklist with kind WORK) */
  workItems: DayChecklistItem[];
  lessons: DayLessonItem[];
  completedCount: number;
  totalCount: number;
  percent: number;
  done: boolean;
  /** When checklist+lessons were all completed (max item completedAt). */
  completedAt: string | null;
  due: DayDueInfo;
  /** Optional Team Lead feedback for this day */
  review: {
    notes: string | null;
    rating: number | null;
    reviewerName: string | null;
    updatedAt: string;
  } | null;
};

export type DayWisePlan = {
  source: "curriculum" | "custom" | "empty";
  scopeKey: string;
  isCustom: boolean;
  currentDay: number;
  /** Day from checklist/course completion only (before Admin promotion). */
  autoDay?: number;
  /** Admin/TL forced day when ahead of auto progress. */
  forcedDay?: number | null;
  totalDays: number;
  /** Length of GLOBAL default schedule (planned training, before any extra weeks). */
  plannedDays: number;
  /** Training calendar start = dateOfJoining (fallback account createdAt). */
  trainingStart: string | null;
  dueSummary: DueSummary;
  today: DaySnapshot | null;
  yesterday: DaySnapshot | null;
  /** Full snapshots for all days before current (newest first). */
  pastDays: DaySnapshot[];
  allDays: {
    dayNumber: number;
    title: string;
    dayType: string;
    projectName: string | null;
    hrmsProjectId: string | null;
    done: boolean;
    percent: number;
    isExtra?: boolean;
    completedAt: string | null;
    due: DayDueInfo;
    workItems?: DayChecklistItem[];
  }[];
  overallPercent: number;
  /** True when Admin has approved trainee into the org. */
  readyForProduction: boolean;
  /** All curriculum days completed (unlocks final evaluation quiz). */
  scheduleComplete: boolean;
  trainingStatus: string;
};

function toPercent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/** Resolve which schedule a trainee uses: personal copy if present, else GLOBAL. */
export async function resolveCurriculumScope(userId: string): Promise<{
  scopeKey: string;
  isCustom: boolean;
}> {
  const customCount = await prisma.curriculumDay.count({
    where: { scopeKey: userId },
  });
  if (customCount > 0) {
    return { scopeKey: userId, isCustom: true };
  }
  return { scopeKey: GLOBAL_CURRICULUM_SCOPE, isCustom: false };
}

async function buildDaySnapshot(
  userId: string,
  day: {
    id: string;
    dayNumber: number;
    title: string;
    dayType: string;
    projectName: string | null;
    hrmsProjectId?: string | null;
    description: string | null;
    checklistItems: {
      id: string;
      title: string;
      description: string | null;
      sortOrder: number;
      kind?: string;
      assignedHours?: number | null;
      progress: { completed: boolean; completedAt: Date | null }[];
    }[];
    lessons: {
      id: string;
      label: string | null;
      sortOrder: number;
      lesson: {
        id: string;
        title: string;
        module: { title: string; course: { id: string; title: string } };
        progress: {
          completed: boolean;
          watchPercent: number;
          completedAt: Date | null;
        }[];
      };
    }[];
  },
  trainingStart: Date | null
): Promise<DaySnapshot> {
  const allTicks: DayChecklistItem[] = day.checklistItems
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      sortOrder: item.sortOrder,
      kind: item.kind === "WORK" ? "WORK" : "CHECKLIST",
      assignedHours:
        item.assignedHours != null && Number.isFinite(Number(item.assignedHours))
          ? Number(item.assignedHours)
          : null,
      completed: item.progress[0]?.completed === true,
    }));

  const checklist = allTicks.filter((i) => i.kind === "CHECKLIST");
  const workItems = allTicks.filter((i) => i.kind === "WORK");

  const lessons: DayLessonItem[] = day.lessons
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => {
      const p = link.lesson.progress[0];
      return {
        linkId: link.id,
        lessonId: link.lesson.id,
        courseId: link.lesson.module.course.id,
        label: link.label || link.lesson.title,
        title: link.lesson.title,
        courseTitle: link.lesson.module.course.title,
        moduleTitle: link.lesson.module.title,
        completed: p?.completed === true,
        watchPercent: p?.watchPercent ?? 0,
      };
    });

  // Only checklist + courses gate day completion. Training work is tracked via HRMS
  // and never blocks unlocking the next day.
  const completedCount =
    checklist.filter((c) => c.completed).length +
    lessons.filter((l) => l.completed).length;
  const totalCount = checklist.length + lessons.length;

  let dayType: DaySnapshot["dayType"] = "MIXED";
  if (day.dayType === "CHECKLIST" || day.dayType === "TRAINING" || day.dayType === "MIXED") {
    dayType = day.dayType;
  } else if (lessons.length > 0 && allTicks.length > 0) {
    dayType = "MIXED";
  } else if (lessons.length > 0) {
    dayType = "TRAINING";
  } else {
    dayType = "CHECKLIST";
  }

  const done = totalCount === 0 || completedCount === totalCount;

  // Day completedAt = latest gate-item completion time when the day is done
  let completedAtDate: Date | null = null;
  if (done && totalCount > 0) {
    const times: Date[] = [];
    for (const item of day.checklistItems) {
      if (item.kind === "WORK") continue;
      const p = item.progress[0];
      if (p?.completed && p.completedAt) times.push(new Date(p.completedAt));
    }
    for (const link of day.lessons) {
      const p = link.lesson.progress[0];
      if (p?.completed && p.completedAt) times.push(new Date(p.completedAt));
    }
    if (times.length > 0) {
      completedAtDate = new Date(Math.max(...times.map((t) => t.getTime())));
    }
  }

  const due = computeDayDueInfo({
    dayNumber: day.dayNumber,
    done,
    completedAt: completedAtDate,
    trainingStart,
  });

  return {
    dayNumber: day.dayNumber,
    title: day.title,
    dayType,
    projectName: day.projectName,
    hrmsProjectId: day.hrmsProjectId ?? null,
    description: day.description,
    checklist,
    workItems,
    lessons,
    completedCount,
    totalCount,
    // Work-only days have no gate items — show 100% so UI doesn’t look “stuck”
    percent: totalCount === 0 ? 100 : toPercent(completedCount, totalCount),
    // Empty gate (work-only / empty day) does not block — next day still opens
    done,
    completedAt: completedAtDate ? completedAtDate.toISOString() : null,
    due,
    review: null,
  };
}

export const dayInclude = (userId: string) => ({
  checklistItems: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      progress: { where: { userId }, take: 1 },
    },
  },
  lessons: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      lesson: {
        include: {
          module: { include: { course: { select: { id: true, title: true } } } },
          progress: { where: { userId }, take: 1 },
        },
      },
    },
  },
});

const manageInclude = {
  checklistItems: { orderBy: { sortOrder: "asc" as const } },
  lessons: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      lesson: {
        include: {
          module: {
            include: { course: { select: { id: true, title: true } } },
          },
        },
      },
    },
  },
};

export async function listCurriculumDays(scopeKey: string) {
  return prisma.curriculumDay.findMany({
    where: { scopeKey },
    orderBy: { dayNumber: "asc" },
    include: manageInclude,
  });
}

/**
 * Day-wise plan from GLOBAL default, or trainee-specific copy if customized.
 */
export async function getDayWisePlan(userId: string): Promise<DayWisePlan> {
  const [{ scopeKey, isCustom }, profile, user] = await Promise.all([
    resolveCurriculumScope(userId),
    prisma.traineeProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { dateOfJoining: true, createdAt: true },
    }),
  ]);

  const trainingStart = resolveTrainingStartDate(
    user?.dateOfJoining,
    user?.createdAt
  );
  const emptyDue = summarizeDue([], trainingStart);

  const days = await prisma.curriculumDay.findMany({
    where: { scopeKey },
    orderBy: { dayNumber: "asc" },
    include: dayInclude(userId),
  });

  if (days.length === 0) {
    return {
      source: "empty",
      scopeKey,
      isCustom,
      currentDay: 1,
      totalDays: 0,
      plannedDays: 0,
      trainingStart: trainingStart ? format(trainingStart, "yyyy-MM-dd") : null,
      dueSummary: emptyDue,
      today: null,
      yesterday: null,
      pastDays: [],
      allDays: [],
      overallPercent: 0,
      readyForProduction: profile?.readyForProduction === true,
      scheduleComplete: false,
      trainingStatus: profile?.trainingStatus ?? "REGISTERED",
    };
  }

  const plannedDays = await prisma.curriculumDay.count({
    where: { scopeKey: GLOBAL_CURRICULUM_SCOPE },
  });

  const snapshots = await Promise.all(
    days.map((d) => buildDaySnapshot(userId, d, trainingStart))
  );

  const reviews = await prisma.dayWorkReview.findMany({
    where: { traineeId: userId },
    include: { reviewer: { select: { name: true } } },
  });
  const reviewByDay = new Map(reviews.map((r) => [r.dayNumber, r]));
  for (const s of snapshots) {
    const r = reviewByDay.get(s.dayNumber);
    if (r) {
      s.review = {
        notes: r.notes,
        rating: r.rating,
        reviewerName: r.reviewer?.name ?? null,
        updatedAt: r.updatedAt.toISOString(),
      };
    }
  }

  const byNumber = new Map(snapshots.map((s) => [s.dayNumber, s]));

  let autoDay = Math.max(profile?.currentDayNumber || 1, days[0].dayNumber);
  for (const s of snapshots) {
    if (!s.done) {
      autoDay = s.dayNumber;
      break;
    }
    autoDay = s.dayNumber;
  }

  const maxDay = days[days.length - 1]?.dayNumber ?? autoDay;
  const forced = profile?.forcedCurrentDayNumber;
  // Admin/TL promotion: open at least the forced day even if earlier checklist is incomplete
  let currentDay = autoDay;
  if (forced != null && Number.isFinite(forced) && forced > 0) {
    currentDay = Math.min(maxDay, Math.max(autoDay, forced));
  }

  const completedDays = snapshots.filter((s) => s.done).length;
  const totalDays = snapshots.length;
  const overallPercent = toPercent(completedDays, totalDays);
  const scheduleComplete = snapshots.length > 0 && snapshots.every((s) => s.done);

  // Terminal Admin decisions are preserved; otherwise derive from schedule.
  const storedStatus = profile?.trainingStatus ?? "REGISTERED";
  const decided =
    storedStatus === "REJECTED" ||
    storedStatus === "APPROVED_IN_ORG" ||
    profile?.readyForProduction === true;

  let trainingStatus = "IN_TRAINING";
  let readyForProduction = false;

  if (storedStatus === "REJECTED") {
    trainingStatus = "REJECTED";
    readyForProduction = false;
  } else if (storedStatus === "APPROVED_IN_ORG" || profile?.readyForProduction === true) {
    trainingStatus = "APPROVED_IN_ORG";
    readyForProduction = true;
  } else if (scheduleComplete) {
    trainingStatus = "AWAITING_EVALUATION";
    readyForProduction = false;
  } else if (isCustom && days.length > plannedDays) {
    trainingStatus = "EXTENDED";
    readyForProduction = false;
  } else {
    trainingStatus = "IN_TRAINING";
    readyForProduction = false;
  }

  if (profile && !decided) {
    const clearForced =
      forced != null && autoDay >= forced
        ? { forcedCurrentDayNumber: null as number | null }
        : {};
    const needsUpdate =
      currentDay !== profile.currentDayNumber ||
      !profile.trainingStarted ||
      profile.trainingStatus !== trainingStatus ||
      profile.readyForProduction !== readyForProduction ||
      (forced != null && autoDay >= forced);
    if (needsUpdate) {
      await prisma.traineeProfile.update({
        where: { userId },
        data: {
          currentDayNumber: currentDay,
          trainingStarted: true,
          trainingStatus,
          readyForProduction,
          ...clearForced,
        },
      });
    }
  } else if (profile && decided && currentDay !== profile.currentDayNumber) {
    await prisma.traineeProfile.update({
      where: { userId },
      data: { currentDayNumber: currentDay, trainingStarted: true },
    });
  }

  const today = byNumber.get(currentDay) || null;
  const pastDays = snapshots
    .filter((s) => s.dayNumber < currentDay)
    .sort((a, b) => b.dayNumber - a.dayNumber);
  const yesterday = pastDays[0] ?? null;

  return {
    source: isCustom ? "custom" : "curriculum",
    scopeKey,
    isCustom,
    currentDay,
    autoDay,
    forcedDay: forced != null && forced > autoDay ? forced : null,
    totalDays: days.length,
    plannedDays,
    trainingStart: trainingStart ? format(trainingStart, "yyyy-MM-dd") : null,
    dueSummary: summarizeDue(
      snapshots.map((s) => s.due),
      trainingStart
    ),
    today,
    yesterday,
    pastDays,
    allDays: snapshots.map((s) => ({
      dayNumber: s.dayNumber,
      title: s.title,
      dayType: s.dayType,
      projectName: s.projectName,
      hrmsProjectId: s.hrmsProjectId,
      done: s.done,
      percent: s.percent,
      isExtra:
        s.dayNumber > plannedDays ||
        /extra training/i.test(s.title),
      completedAt: s.completedAt,
      due: s.due,
      workItems: s.workItems,
    })),
    overallPercent,
    readyForProduction,
    scheduleComplete,
    trainingStatus,
  };
}

/** Admin/TL: set the trainee's open day (promote even if earlier checklist incomplete). */
export async function setTraineeCurrentDay(traineeId: string, dayNumber: number) {
  const day = Math.floor(Number(dayNumber));
  if (!Number.isFinite(day) || day < 1) {
    throw new Error("dayNumber must be a positive integer");
  }

  const { scopeKey } = await resolveCurriculumScope(traineeId);
  const days = await listCurriculumDays(scopeKey);
  if (days.length === 0) {
    throw new Error("No schedule found for this trainee");
  }
  const maxDay = Math.max(...days.map((d) => d.dayNumber));
  const target = Math.min(day, maxDay);
  if (!days.some((d) => d.dayNumber === target)) {
    throw new Error(`Day ${target} does not exist on this schedule`);
  }

  await prisma.traineeProfile.upsert({
    where: { userId: traineeId },
    create: {
      userId: traineeId,
      currentDayNumber: target,
      forcedCurrentDayNumber: target,
      trainingStarted: true,
      trainingStatus: "IN_TRAINING",
    },
    update: {
      currentDayNumber: target,
      forcedCurrentDayNumber: target,
      trainingStarted: true,
    },
  });

  return getDayWisePlan(traineeId);
}

/** Clone GLOBAL schedule into a personal copy for this trainee (idempotent if already custom). */
export async function enableCustomCurriculumForTrainee(traineeId: string) {
  const existing = await prisma.curriculumDay.count({ where: { scopeKey: traineeId } });
  if (existing > 0) {
    return { created: false, days: await listCurriculumDays(traineeId) };
  }

  const globalDays = await prisma.curriculumDay.findMany({
    where: { scopeKey: GLOBAL_CURRICULUM_SCOPE },
    orderBy: { dayNumber: "asc" },
    include: {
      checklistItems: { orderBy: { sortOrder: "asc" } },
      lessons: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (globalDays.length === 0) {
    throw new Error("No default schedule to copy. Create the GLOBAL curriculum first.");
  }

  await prisma.$transaction(
    globalDays.map((day) =>
      prisma.curriculumDay.create({
        data: {
          scopeKey: traineeId,
          dayNumber: day.dayNumber,
          title: day.title,
          dayType: day.dayType,
          projectName: day.projectName,
          hrmsProjectId: day.hrmsProjectId,
          description: day.description,
          checklistItems: {
            create: day.checklistItems.map((item) => ({
              title: item.title,
              description: item.description,
              kind: item.kind === "WORK" ? "WORK" : "CHECKLIST",
              assignedHours: "assignedHours" in item ? item.assignedHours ?? null : null,
              sortOrder: item.sortOrder,
            })),
          },
          lessons: {
            create: day.lessons.map((link) => ({
              lessonId: link.lessonId,
              label: link.label,
              sortOrder: link.sortOrder,
            })),
          },
        },
      })
    )
  );

  return { created: true, days: await listCurriculumDays(traineeId) };
}

/** Remove personal schedule and re-copy the current GLOBAL default onto this trainee. */
export async function resetTraineeCurriculumToDefault(traineeId: string) {
  await prisma.curriculumDay.deleteMany({ where: { scopeKey: traineeId } });
  return enableCustomCurriculumForTrainee(traineeId);
}

/**
 * Ensure every trainee has a personal copy of the default schedule.
 * Safe to call on Users / Curriculum page load. Skips trainees who already have a custom schedule.
 */
export async function backfillDefaultCurriculumForTrainees() {
  const globalCount = await prisma.curriculumDay.count({
    where: { scopeKey: GLOBAL_CURRICULUM_SCOPE },
  });
  if (globalCount === 0) return { assigned: 0, skipped: 0 };

  const trainees = await prisma.user.findMany({
    where: { role: "TRAINEE", active: true },
    select: { id: true },
  });
  if (trainees.length === 0) return { assigned: 0, skipped: 0 };

  const customScopes = await prisma.curriculumDay.findMany({
    where: { scopeKey: { in: trainees.map((t) => t.id) } },
    select: { scopeKey: true },
    distinct: ["scopeKey"],
  });
  const hasCustom = new Set(customScopes.map((c) => c.scopeKey));

  let assigned = 0;
  let skipped = 0;
  for (const t of trainees) {
    if (hasCustom.has(t.id)) {
      skipped += 1;
      continue;
    }
    try {
      const result = await enableCustomCurriculumForTrainee(t.id);
      if (result.created) assigned += 1;
      else skipped += 1;
    } catch (e) {
      console.error(`Default curriculum assign failed for ${t.id}:`, e);
    }
  }
  return { assigned, skipped };
}

/** Max days Admin/TL can append in one extend action. */
export const MAX_EXTEND_DAYS = 60;

/** Append extra training days from the EXTRA_WEEK default template (personal schedule only). */
export async function extendTraineeCurriculumByWeek(
  traineeId: string,
  extraDays = 7
) {
  const plan = await getDayWisePlan(traineeId);
  const profile = await prisma.traineeProfile.findUnique({
    where: { userId: traineeId },
    select: {
      readyForProduction: true,
      trainingStatus: true,
      evaluationCycle: true,
    },
  });

  if (profile?.readyForProduction || profile?.trainingStatus === "APPROVED_IN_ORG") {
    throw new Error("Cannot add extra days for a trainee already approved into the org.");
  }
  if (profile?.trainingStatus === "REJECTED") {
    throw new Error("Cannot extend training for a rejected trainee.");
  }

  // Prefer final-quiz score when present; otherwise allow extend while still in training / awaiting eval.
  const { getTraineeEvaluationScore } = await import("./final-evaluation");
  const evaluation = await getTraineeEvaluationScore(traineeId);
  if (evaluation.score != null && evaluation.score >= 90) {
    throw new Error(
      "Extra days are only for trainees under 90% on the final evaluation. This trainee scored 90% or higher."
    );
  }

  const daysToAdd = Math.min(
    MAX_EXTEND_DAYS,
    Math.max(1, Math.floor(Number(extraDays) || 7))
  );

  await ensureExtraWeekDefaultCurriculum();
  await enableCustomCurriculumForTrainee(traineeId);

  const existing = await prisma.curriculumDay.findMany({
    where: { scopeKey: traineeId },
    select: { dayNumber: true },
    orderBy: { dayNumber: "desc" },
    take: 1,
  });
  const maxDay = existing[0]?.dayNumber ?? 0;

  const templateDays = await prisma.curriculumDay.findMany({
    where: { scopeKey: EXTRA_WEEK_CURRICULUM_SCOPE },
    orderBy: { dayNumber: "asc" },
    include: {
      checklistItems: { orderBy: { sortOrder: "asc" } },
      lessons: { orderBy: { sortOrder: "asc" } },
    },
  });

  type SourceDay = {
    title: string;
    dayType: string;
    projectName: string | null;
    hrmsProjectId: string | null;
    description: string | null;
    checklistItems: {
      title: string;
      description: string | null;
      kind: string;
      sortOrder: number;
      assignedHours?: number | null;
    }[];
    lessons: {
      lessonId: string;
      label: string | null;
      sortOrder: number;
    }[];
  };

  // Build exactly daysToAdd days — cycle Extra-week default when it has content.
  const source: SourceDay[] = Array.from({ length: daysToAdd }, (_, i) => {
    if (templateDays.length > 0) {
      const day = templateDays[i % templateDays.length];
      const weekPass = Math.floor(i / templateDays.length);
      return {
        title:
          weekPass > 0
            ? `${day.title} (${weekPass + 1})`
            : day.title,
        dayType: day.dayType,
        projectName: day.projectName,
        hrmsProjectId: day.hrmsProjectId,
        description: day.description,
        checklistItems: day.checklistItems.map((item) => ({
          title: item.title,
          description: item.description,
          kind: item.kind,
          sortOrder: item.sortOrder,
          assignedHours: item.assignedHours ?? null,
        })),
        lessons: day.lessons.map((link) => ({
          lessonId: link.lessonId,
          label: link.label,
          sortOrder: link.sortOrder,
        })),
      };
    }
    return {
      title: `Day ${maxDay + i + 1} — Extra training`,
      dayType: "MIXED",
      projectName: null,
      hrmsProjectId: null,
      description:
        "Extra training day (no default template content yet). Add checklist, courses, and work as needed.",
      checklistItems: [],
      lessons: [],
    };
  });

  await prisma.$transaction(
    source.map((day, i) => {
      const dayNumber = maxDay + i + 1;
      return prisma.curriculumDay.create({
        data: {
          scopeKey: traineeId,
          dayNumber,
          title: day.title,
          dayType: day.dayType,
          projectName: day.projectName,
          hrmsProjectId: day.hrmsProjectId,
          description: day.description,
          checklistItems: {
            create: day.checklistItems.map((item) => ({
              title: item.title,
              description: item.description,
              kind: item.kind === "WORK" ? "WORK" : "CHECKLIST",
              assignedHours: item.assignedHours ?? null,
              sortOrder: item.sortOrder,
            })),
          },
          lessons: {
            create: day.lessons.map((link) => ({
              lessonId: link.lessonId,
              label: link.label,
              sortOrder: link.sortOrder,
            })),
          },
        },
      });
    })
  );

  // Always bump evaluation cycle so after the extra week is completed,
  // every trainee gets a fresh Final Quiz attempt (no requiz within a cycle).
  const nextCycle = (profile?.evaluationCycle ?? 1) + 1;

  await prisma.traineeProfile.upsert({
    where: { userId: traineeId },
    create: {
      userId: traineeId,
      trainingStatus: "EXTENDED",
      readyForProduction: false,
      evaluationCycle: nextCycle,
      trainingStarted: true,
    },
    update: {
      trainingStatus: "EXTENDED",
      readyForProduction: false,
      evaluationCycle: nextCycle,
    },
  });

  return {
    added: source.length,
    fromDay: maxDay + 1,
    toDay: maxDay + source.length,
    evaluationCycle: nextCycle,
    scheduleDaysBefore: plan.totalDays,
    fromTemplate: templateDays.length > 0,
    days: await listCurriculumDays(traineeId),
  };
}

/** Canonical Day 1 onboarding checklist (GLOBAL default). */
export const DAY1_ONBOARDING_CHECKLIST: {
  title: string;
  description: string;
  sortOrder: number;
}[] = [
  {
    title: "Company induction",
    description: "Attend induction and learn company policies, culture, and how teams work.",
    sortOrder: 1,
  },
  {
    title: "Documents and signatures",
    description: "Fill in required joining forms and complete all signatures.",
    sortOrder: 2,
  },
  {
    title: "Fingerprint and face enrollment",
    description: "Complete biometric enrollment (fingerprint and face recognition) for access.",
    sortOrder: 3,
  },
  {
    title: "KEKA credentials",
    description: "Receive and verify your KEKA login credentials for HR and attendance.",
    sortOrder: 4,
  },
  {
    title: "System assignment",
    description: "Collect your assigned system / laptop and confirm it is set up for work.",
    sortOrder: 5,
  },
  {
    title: "Locker assignment",
    description: "Receive your locker assignment and store personal items securely.",
    sortOrder: 6,
  },
];

/**
 * Ensure GLOBAL Day 1 exists with the standard onboarding checklist.
 * Creates Day 1 if missing. Migrates once from the old starter checklist
 * (or empty Day 1) — does not overwrite a customized Day 1 on every request.
 */
export async function ensureStarterCurriculum() {
  let day1 = await prisma.curriculumDay.findFirst({
    where: { scopeKey: GLOBAL_CURRICULUM_SCOPE, dayNumber: 1 },
    select: {
      id: true,
      checklistItems: {
        where: { kind: "CHECKLIST" },
        select: { id: true, title: true },
      },
    },
  });

  if (!day1) {
    await prisma.curriculumDay.create({
      data: {
        scopeKey: GLOBAL_CURRICULUM_SCOPE,
        dayNumber: 1,
        title: "Day 1 — Onboarding",
        dayType: "CHECKLIST",
        projectName: null,
        description:
          "First-day onboarding checklist: induction, documents, biometrics, KEKA, system, and locker.",
        checklistItems: {
          create: DAY1_ONBOARDING_CHECKLIST.map((item) => ({
            title: item.title,
            description: item.description,
            kind: "CHECKLIST",
            sortOrder: item.sortOrder,
          })),
        },
      },
    });
  } else {
    const titles = new Set(day1.checklistItems.map((i) => i.title));
    const hasCanonical = titles.has("Company induction") && titles.has("KEKA credentials");
    if (!hasCanonical) {
      await prisma.curriculumDay.update({
        where: { id: day1.id },
        data: {
          title: "Day 1 — Onboarding",
          dayType: "CHECKLIST",
          description:
            "First-day onboarding checklist: induction, documents, biometrics, KEKA, system, and locker.",
        },
      });

      await prisma.curriculumChecklistItem.deleteMany({
        where: { dayId: day1.id, kind: "CHECKLIST" },
      });
      await prisma.curriculumChecklistItem.createMany({
        data: DAY1_ONBOARDING_CHECKLIST.map((item) => ({
          dayId: day1.id,
          title: item.title,
          description: item.description,
          kind: "CHECKLIST",
          sortOrder: item.sortOrder,
        })),
      });
    }
  }

  await ensureExtraWeekDefaultCurriculum();
}

/**
 * Default 7-day EXTRA_WEEK template. Copied onto a trainee when they get +1 week.
 * Admin/TL can edit this schedule; per-trainee copies remain editable after extend.
 */
export async function ensureExtraWeekDefaultCurriculum() {
  const count = await prisma.curriculumDay.count({
    where: { scopeKey: EXTRA_WEEK_CURRICULUM_SCOPE },
  });
  if (count > 0) return;

  await prisma.$transaction(
    Array.from({ length: 7 }, (_, i) => {
      const dayNumber = i + 1;
      return prisma.curriculumDay.create({
        data: {
          scopeKey: EXTRA_WEEK_CURRICULUM_SCOPE,
          dayNumber,
          title: `Extra week — Day ${dayNumber}`,
          dayType: "MIXED",
          projectName: null,
          description:
            "Default extra-week day. Edit this template in Day Curriculum → Extra week default. When a trainee is extended, these days (checklist, courses, work) are copied to their personal schedule.",
          checklistItems: {
            create: [
              {
                title: "Complete assigned training for this day",
                description: "Work through the courses and tasks planned for this extra-week day.",
                kind: "CHECKLIST",
                sortOrder: 0,
              },
              {
                title: "Hands-on practice / production simulation",
                description: "Complete the practice work set for this day.",
                kind: "WORK",
                sortOrder: 1,
              },
            ],
          },
        },
      });
    })
  );
}

export async function assertCanManageTrainee(
  actor: { id: string; role: string },
  traineeId: string
) {
  const trainee = await prisma.user.findUnique({
    where: { id: traineeId },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      traineeProfile: { select: { trainerId: true } },
    },
  });
  if (!trainee || trainee.role !== "TRAINEE") {
    return { ok: false as const, error: "Trainee not found" };
  }
  if (actor.role === "ADMIN") {
    return { ok: true as const, trainee };
  }
  if (
    actor.role === "TRAINER" &&
    trainee.traineeProfile?.trainerId === actor.id
  ) {
    return { ok: true as const, trainee };
  }
  return { ok: false as const, error: "Not allowed to manage this trainee" };
}
