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
  /** Expected production units (target) for WORK items */
  productionTarget: number | null;
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
  /** True when checklist, lessons, and work (if any) are fully complete — used in UI and metrics. */
  done: boolean;
  /**
   * True when checklist+lessons gate passes (empty days pass; work does not block).
   * Used only to compute which calendar day the trainee is on.
   */
  unlockDone: boolean;
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

/** Learning progress from actual checklist, lesson, and work items (not empty future days). */
function overallLearningPercent(snapshots: DaySnapshot[]): number {
  let completed = 0;
  let total = 0;
  for (const s of snapshots) {
    if (s.totalCount <= 0) continue;
    completed += s.completedCount;
    total += s.totalCount;
  }
  return toPercent(completed, total);
}

export async function traineeUsesCustomCurriculum(userId: string): Promise<boolean> {
  const profile = await prisma.traineeProfile.findUnique({
    where: { userId },
    select: { usesCustomCurriculum: true },
  });
  return profile?.usesCustomCurriculum === true;
}

export async function setTraineeUsesCustomCurriculum(
  traineeId: string,
  usesCustom: boolean
) {
  await prisma.traineeProfile.upsert({
    where: { userId: traineeId },
    create: {
      userId: traineeId,
      usesCustomCurriculum: usesCustom,
      trainingStarted: false,
      trainingStatus: "REGISTERED",
    },
    update: { usesCustomCurriculum: usesCustom },
  });
}

/** Resolve which schedule a trainee uses (flag-driven, not “has personal rows”). */
export async function resolveCurriculumScope(userId: string): Promise<{
  scopeKey: string;
  isCustom: boolean;
}> {
  const usesCustom = await traineeUsesCustomCurriculum(userId);
  if (usesCustom) {
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
      productionTarget?: number | null;
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
  trainingStart: Date | null,
  workMetric?: {
    hoursLogged: number | null;
    productionUnits: number | null;
    qualityScore: number | null;
    updatedAt: Date;
  } | null
): Promise<DaySnapshot> {
  const workMetricsSubmitted = Boolean(
    workMetric &&
      (workMetric.hoursLogged != null ||
        workMetric.productionUnits != null ||
        workMetric.qualityScore != null)
  );

  const allTicks: DayChecklistItem[] = day.checklistItems
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const isWork = item.kind === "WORK";
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        sortOrder: item.sortOrder,
        kind: isWork ? ("WORK" as const) : ("CHECKLIST" as const),
        assignedHours:
          item.assignedHours != null && Number.isFinite(Number(item.assignedHours))
            ? Number(item.assignedHours)
            : null,
        productionTarget:
          item.productionTarget != null &&
          Number.isFinite(Number(item.productionTarget))
            ? Number(item.productionTarget)
            : null,
        // Training work is tracked by Work Metrics, not by ticking the item.
        completed: isWork
          ? workMetricsSubmitted
          : item.progress[0]?.completed === true,
      };
    });

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

  // Checklist + courses gate unlocking the next day.
  // Training work is tracked in Work Metrics (manager enters it) and must NOT block unlock.
  const checklistDoneCount = checklist.filter((c) => c.completed).length;
  const lessonDoneCount = lessons.filter((l) => l.completed).length;
  const checklistGateTotal = checklist.length + lessons.length;
  const checklistGateDone =
    checklistGateTotal === 0 ||
    checklistDoneCount + lessonDoneCount === checklistGateTotal;

  const workRequired = workItems.length > 0;
  const isBlankDay = checklistGateTotal === 0 && !workRequired;

  // Unlock / current-day: work never blocks. Blank days do not block advancing.
  const unlockDone = checklistGateTotal === 0 || checklistGateDone;

  // Metrics + "completed day": checklist, lessons, and work (when required) must be done.
  const displayDone =
    isBlankDay
      ? false
      : checklistGateDone && (!workRequired || workMetricsSubmitted);

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

  const completedCount =
    checklistDoneCount +
    lessonDoneCount +
    (workRequired && workMetricsSubmitted ? 1 : 0);
  const totalCount = checklistGateTotal + (workRequired ? 1 : 0);

  let completedAtDate: Date | null = null;
  if (displayDone) {
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
    if (workMetricsSubmitted && workMetric?.updatedAt) {
      times.push(new Date(workMetric.updatedAt));
    }
    if (times.length > 0) {
      completedAtDate = new Date(Math.max(...times.map((t) => t.getTime())));
    }
  }

  const due = computeDayDueInfo({
    dayNumber: day.dayNumber,
    done: displayDone,
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
    percent:
      totalCount === 0 ? 0 : toPercent(completedCount, totalCount),
    done: displayDone,
    unlockDone,
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
 * Trainees usually have a personal copy of the GLOBAL schedule (from backfill).
 * When Admin/TL edits training work on the GLOBAL day, push WORK items + project fields
 * to each trainee's matching day if that day is not fully complete for them yet.
 */
export async function syncGlobalDayWorkToTraineeCopies(dayNumber: number) {
  const n = Math.floor(Number(dayNumber));
  if (!Number.isFinite(n) || n < 1) return { updated: 0 };

  const globalDay = await prisma.curriculumDay.findFirst({
    where: { scopeKey: GLOBAL_CURRICULUM_SCOPE, dayNumber: n },
    include: {
      checklistItems: {
        where: { kind: "WORK" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!globalDay) return { updated: 0 };

  const personalDays = await prisma.curriculumDay.findMany({
    where: {
      dayNumber: n,
      scopeKey: { notIn: [GLOBAL_CURRICULUM_SCOPE, EXTRA_WEEK_CURRICULUM_SCOPE] },
    },
    select: { id: true, scopeKey: true },
  });

  let updated = 0;
  for (const pd of personalDays) {
    const traineeId = pd.scopeKey;
    const profile = await prisma.traineeProfile.findUnique({
      where: { userId: traineeId },
      select: {
        usesCustomCurriculum: true,
        currentDayNumber: true,
        forcedCurrentDayNumber: true,
      },
    });
    if (profile?.usesCustomCurriculum === true) continue;

    const openDay = Math.max(
      profile?.currentDayNumber ?? 1,
      profile?.forcedCurrentDayNumber ?? 0
    );
    if (openDay > n) continue;

    const personalDay = await prisma.curriculumDay.findUnique({
      where: { id: pd.id },
      include: dayInclude(traineeId),
    });
    if (!personalDay) continue;

    const workMetric = prisma.traineeWorkMetric
      ? await prisma.traineeWorkMetric.findFirst({
          where: { traineeId, dayNumber: n },
          select: {
            hoursLogged: true,
            productionUnits: true,
            qualityScore: true,
            updatedAt: true,
          },
        })
      : null;

    const user = await prisma.user.findUnique({
      where: { id: traineeId },
      select: { dateOfJoining: true, createdAt: true },
    });
    const trainingStart = resolveTrainingStartDate(
      user?.dateOfJoining,
      user?.createdAt
    );
    const snapshot = await buildDaySnapshot(
      traineeId,
      personalDay,
      trainingStart,
      workMetric
    );
    if (snapshot.done) continue;

    await prisma.$transaction(async (tx) => {
      await tx.curriculumChecklistItem.deleteMany({
        where: { dayId: pd.id, kind: "WORK" },
      });
      if (globalDay.checklistItems.length > 0) {
        await tx.curriculumChecklistItem.createMany({
          data: globalDay.checklistItems.map((item) => ({
            dayId: pd.id,
            title: item.title,
            description: item.description,
            kind: "WORK",
            assignedHours: item.assignedHours,
            productionTarget: item.productionTarget,
            sortOrder: item.sortOrder,
          })),
        });
      }
      await tx.curriculumDay.update({
        where: { id: pd.id },
        data: {
          projectName: globalDay.projectName,
          hrmsProjectId: globalDay.hrmsProjectId,
        },
      });
    });
    updated += 1;
  }

  return { updated };
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

  const workMetricRows = prisma.traineeWorkMetric
    ? await prisma.traineeWorkMetric.findMany({
        where: { traineeId: userId },
        select: {
          dayNumber: true,
          hoursLogged: true,
          productionUnits: true,
          qualityScore: true,
          updatedAt: true,
        },
      })
    : [];
  const workByDay = new Map(
    workMetricRows.map((r) => [
      r.dayNumber,
      {
        hoursLogged: r.hoursLogged,
        productionUnits: r.productionUnits,
        qualityScore: r.qualityScore,
        updatedAt: r.updatedAt,
      },
    ])
  );

  const snapshots = await Promise.all(
    days.map((d) =>
      buildDaySnapshot(userId, d, trainingStart, workByDay.get(d.dayNumber) ?? null)
    )
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
    if (!s.unlockDone) {
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

  const overallPercent = overallLearningPercent(snapshots);
  const scheduleComplete =
    snapshots.length > 0 && snapshots.every((s) => s.done);

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

type CurriculumDayCloneSource = {
  dayNumber: number;
  title: string;
  dayType: string;
  projectName: string | null;
  hrmsProjectId: string | null;
  description: string | null;
  checklistItems: {
    title: string;
    description: string | null;
    kind: string;
    assignedHours: number | null;
    productionTarget: number | null;
    sortOrder: number;
  }[];
  lessons: {
    lessonId: string;
    label: string | null;
    sortOrder: number;
  }[];
};

const curriculumDayCloneInclude = {
  checklistItems: { orderBy: { sortOrder: "asc" as const } },
  lessons: { orderBy: { sortOrder: "asc" as const } },
};

function curriculumDayCreateData(scopeKey: string, day: CurriculumDayCloneSource) {
  return {
    scopeKey,
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
        kind: item.kind === "WORK" ? ("WORK" as const) : ("CHECKLIST" as const),
        assignedHours: item.assignedHours ?? null,
        productionTarget: item.productionTarget ?? null,
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
  };
}

/** True when a trainee's personal copy no longer matches the GLOBAL template (legacy detection). */
async function personalCurriculumDiffersFromGlobal(traineeId: string): Promise<boolean> {
  const [globalDays, personalDays] = await Promise.all([
    prisma.curriculumDay.findMany({
      where: { scopeKey: GLOBAL_CURRICULUM_SCOPE },
      select: { dayNumber: true, title: true },
      orderBy: { dayNumber: "asc" },
    }),
    prisma.curriculumDay.findMany({
      where: { scopeKey: traineeId },
      select: { dayNumber: true, title: true },
      orderBy: { dayNumber: "asc" },
    }),
  ]);
  if (personalDays.length === 0) return false;
  if (personalDays.length > globalDays.length) return true;
  const globalByNum = new Map(globalDays.map((d) => [d.dayNumber, d.title]));
  for (const p of personalDays) {
    const gTitle = globalByNum.get(p.dayNumber);
    if (gTitle == null || gTitle !== p.title) return true;
  }
  return false;
}

/**
 * Copy completed checklist ticks from a trainee's personal day items onto matching GLOBAL items
 * (same day number + title/sortOrder) before their personal curriculum rows are removed.
 */
async function migratePersonalChecklistProgressToGlobal(traineeId: string) {
  const [personalDays, globalDays] = await Promise.all([
    prisma.curriculumDay.findMany({
      where: { scopeKey: traineeId },
      orderBy: { dayNumber: "asc" },
      include: {
        checklistItems: {
          where: { kind: "CHECKLIST" },
          orderBy: { sortOrder: "asc" },
          include: {
            progress: { where: { userId: traineeId }, take: 1 },
          },
        },
      },
    }),
    prisma.curriculumDay.findMany({
      where: { scopeKey: GLOBAL_CURRICULUM_SCOPE },
      orderBy: { dayNumber: "asc" },
      include: {
        checklistItems: {
          where: { kind: "CHECKLIST" },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);

  const globalByDay = new Map(globalDays.map((d) => [d.dayNumber, d]));
  let migrated = 0;

  for (const pd of personalDays) {
    const gd = globalByDay.get(pd.dayNumber);
    if (!gd) continue;

    for (const pi of pd.checklistItems) {
      const prog = pi.progress[0];
      if (!prog?.completed) continue;

      const gi =
        gd.checklistItems.find(
          (g) => g.sortOrder === pi.sortOrder && g.title === pi.title
        ) ?? gd.checklistItems.find((g) => g.title === pi.title);

      if (!gi) continue;

      await prisma.userChecklistProgress.upsert({
        where: { userId_itemId: { userId: traineeId, itemId: gi.id } },
        create: {
          userId: traineeId,
          itemId: gi.id,
          completed: true,
          completedAt: prog.completedAt ?? new Date(),
        },
        update: {
          completed: true,
          completedAt: prog.completedAt ?? undefined,
        },
      });
      migrated += 1;
    }
  }

  return migrated;
}

/**
 * Default followers use live GLOBAL — drop stale personal copies.
 * Legacy rows that differ from GLOBAL are treated as custom (flag set, copy kept).
 */
export async function reconcileDefaultCurriculumFollowers() {
  const trainees = await prisma.user.findMany({
    where: { role: "TRAINEE", active: true },
    select: { id: true },
  });
  let markedCustom = 0;
  let clearedCopies = 0;

  for (const t of trainees) {
    const personalCount = await prisma.curriculumDay.count({
      where: { scopeKey: t.id },
    });
    if (personalCount === 0) continue;

    const usesCustom = await traineeUsesCustomCurriculum(t.id);
    if (usesCustom) continue;

    if (await personalCurriculumDiffersFromGlobal(t.id)) {
      await setTraineeUsesCustomCurriculum(t.id, true);
      markedCustom += 1;
      continue;
    }

    await migratePersonalChecklistProgressToGlobal(t.id);
    await prisma.curriculumDay.deleteMany({ where: { scopeKey: t.id } });
    clearedCopies += 1;
  }

  return { markedCustom, clearedCopies };
}

/** Clone GLOBAL schedule into a personal copy for this trainee (idempotent if already custom). */
export async function enableCustomCurriculumForTrainee(traineeId: string) {
  await setTraineeUsesCustomCurriculum(traineeId, true);

  const existing = await prisma.curriculumDay.count({ where: { scopeKey: traineeId } });
  if (existing > 0) {
    return { created: false, days: await listCurriculumDays(traineeId) };
  }

  const globalDays = await prisma.curriculumDay.findMany({
    where: { scopeKey: GLOBAL_CURRICULUM_SCOPE },
    orderBy: { dayNumber: "asc" },
    include: curriculumDayCloneInclude,
  });

  if (globalDays.length === 0) {
    throw new Error("No default schedule to copy. Create the GLOBAL curriculum first.");
  }

  await prisma.$transaction(
    globalDays.map((day) =>
      prisma.curriculumDay.create({
        data: curriculumDayCreateData(traineeId, day),
      })
    )
  );

  return { created: true, days: await listCurriculumDays(traineeId) };
}

/** Follow live GLOBAL default again (drops personal copy and custom flag). */
export async function resetTraineeCurriculumToDefault(traineeId: string) {
  await migratePersonalChecklistProgressToGlobal(traineeId);
  await prisma.curriculumDay.deleteMany({ where: { scopeKey: traineeId } });
  await setTraineeUsesCustomCurriculum(traineeId, false);
  return {
    created: false,
    days: await listCurriculumDays(GLOBAL_CURRICULUM_SCOPE),
  };
}

/** Safe on Curriculum / Users page load: align default followers with live GLOBAL. */
export async function backfillDefaultCurriculumForTrainees() {
  const globalCount = await prisma.curriculumDay.count({
    where: { scopeKey: GLOBAL_CURRICULUM_SCOPE },
  });
  if (globalCount === 0) return { markedCustom: 0, clearedCopies: 0 };

  try {
    return await reconcileDefaultCurriculumFollowers();
  } catch (e) {
    console.error("Reconcile default curriculum followers failed:", e);
    return { markedCustom: 0, clearedCopies: 0 };
  }
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
      productionTarget?: number | null;
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
          productionTarget: item.productionTarget ?? null,
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
              productionTarget: item.productionTarget ?? null,
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

  // Always add extra days — final quiz remains a single attempt (no retake cycle bump).
  await prisma.traineeProfile.upsert({
    where: { userId: traineeId },
    create: {
      userId: traineeId,
      trainingStatus: "EXTENDED",
      readyForProduction: false,
      trainingStarted: true,
    },
    update: {
      trainingStatus: "EXTENDED",
      readyForProduction: false,
    },
  });

  return {
    added: source.length,
    fromDay: maxDay + 1,
    toDay: maxDay + source.length,
    evaluationCycle: profile?.evaluationCycle ?? 1,
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
