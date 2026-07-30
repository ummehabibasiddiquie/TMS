import { prisma } from "@/lib/db";
import { ACTIVE_USER, PUBLISHED_COURSE } from "@/lib/active-filters";
import { getDayWisePlan } from "@/lib/day-wise-training";
import { listHrmsProjects } from "@/lib/hrms";

export type TraineeAttentionRow = {
  id: string;
  name: string;
  overallPercent: number;
  currentDay: number;
  totalDays: number;
  overdueCount: number;
  dueTodayCount: number;
  maxOverdueDays: number;
  trainingStatus: string | null;
  scheduleComplete: boolean;
  /** Primary reason this trainee appears on the dashboard. */
  reason: "OVERDUE" | "DUE_TODAY" | "AWAITING_EVALUATION";
};

export type DashboardStats = {
  activeTrainees: number;
  courses: number;
  projects: number;
  pendingCerts: number;
  awaitingEvaluation: number;
  overdueTrainees: number;
  dueTodayTrainees: number;
  dayReviewsGiven: number;
  attention: TraineeAttentionRow[];
};

type TraineeFilter = {
  role: "TRAINEE";
  active: true;
  traineeProfile?: { trainerId: string };
};

function traineeWhere(trainerId?: string): TraineeFilter {
  const base = { role: "TRAINEE" as const, ...ACTIVE_USER };
  if (trainerId) {
    return { ...base, traineeProfile: { trainerId } };
  }
  return base;
}

function certWhere(traineeFilter: TraineeFilter) {
  return {
    status: "PENDING_REVIEW" as const,
    user: traineeFilter,
  };
}

function attentionPriority(row: TraineeAttentionRow): number {
  if (row.reason === "OVERDUE") return 0;
  if (row.reason === "DUE_TODAY") return 1;
  return 2;
}

async function buildAttentionList(traineeFilter: TraineeFilter): Promise<{
  attention: TraineeAttentionRow[];
  awaitingEvaluation: number;
  overdueTrainees: number;
  dueTodayTrainees: number;
}> {
  const trainees = await prisma.user.findMany({
    where: traineeFilter,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  let awaitingEvaluation = 0;
  let overdueTrainees = 0;
  let dueTodayTrainees = 0;
  const attention: TraineeAttentionRow[] = [];

  await Promise.all(
    trainees.map(async (t) => {
      const plan = await getDayWisePlan(t.id);
      const due = plan.dueSummary;

      const isAwaitingDecision =
        (plan.scheduleComplete || plan.trainingStatus === "AWAITING_EVALUATION") &&
        plan.trainingStatus !== "APPROVED_IN_ORG" &&
        plan.trainingStatus !== "REJECTED" &&
        !plan.readyForProduction;

      if (isAwaitingDecision) awaitingEvaluation += 1;

      if (due.overdueCount > 0) overdueTrainees += 1;
      if (due.dueTodayCount > 0) dueTodayTrainees += 1;

      let reason: TraineeAttentionRow["reason"] | null = null;
      if (due.overdueCount > 0) reason = "OVERDUE";
      else if (due.dueTodayCount > 0) reason = "DUE_TODAY";
      else if (isAwaitingDecision) reason = "AWAITING_EVALUATION";

      if (!reason) return;

      attention.push({
        id: t.id,
        name: t.name,
        overallPercent: plan.overallPercent,
        currentDay: plan.currentDay,
        totalDays: plan.totalDays,
        overdueCount: due.overdueCount,
        dueTodayCount: due.dueTodayCount,
        maxOverdueDays: due.maxOverdueDays,
        trainingStatus: plan.trainingStatus,
        scheduleComplete: plan.scheduleComplete,
        reason,
      });
    })
  );

  attention.sort((a, b) => {
    const pa = attentionPriority(a);
    const pb = attentionPriority(b);
    if (pa !== pb) return pa - pb;
    if (a.reason === "OVERDUE" && b.reason === "OVERDUE") {
      return b.maxOverdueDays - a.maxOverdueDays;
    }
    return a.name.localeCompare(b.name);
  });

  return {
    attention: attention.slice(0, 8),
    awaitingEvaluation,
    overdueTrainees,
    dueTodayTrainees,
  };
}

export async function getAdminDashboardStats(): Promise<DashboardStats> {
  const filter = traineeWhere();

  const [activeTrainees, courses, hrms, pendingCerts, dayReviewsGiven, attentionData] =
    await Promise.all([
      prisma.user.count({ where: filter }),
      prisma.course.count({ where: PUBLISHED_COURSE }),
      listHrmsProjects({ activeOnly: true }),
      prisma.projectCertification.count({ where: certWhere(filter) }),
      prisma.dayWorkReview.count(),
      buildAttentionList(filter),
    ]);

  return {
    activeTrainees,
    courses,
    projects: hrms.projects.length,
    pendingCerts,
    dayReviewsGiven,
    ...attentionData,
  };
}

export async function getTeamLeadDashboardStats(trainerId: string): Promise<DashboardStats> {
  const filter = traineeWhere(trainerId);

  const [activeTrainees, courses, hrms, pendingCerts, dayReviewsGiven, attentionData] =
    await Promise.all([
      prisma.user.count({ where: filter }),
      prisma.course.count({ where: PUBLISHED_COURSE }),
      listHrmsProjects({ activeOnly: true }),
      prisma.projectCertification.count({ where: certWhere(filter) }),
      prisma.dayWorkReview.count({ where: { reviewerId: trainerId } }),
      buildAttentionList(filter),
    ]);

  return {
    activeTrainees,
    courses,
    projects: hrms.projects.length,
    pendingCerts,
    dayReviewsGiven,
    ...attentionData,
  };
}
