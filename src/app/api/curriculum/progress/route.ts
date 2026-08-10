import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getDayWisePlan,
  listCurriculumDays,
  resolveCurriculumScope,
} from "@/lib/day-wise-training";
import { getTraineeEvaluationScore } from "@/lib/final-evaluation";
import {
  collectPracticeProjectsFromDays,
  hasPracticeWorkOnSchedule,
} from "@/lib/hrms-work";
import { listTraineeWorkMetrics } from "@/lib/trainee-work";

function resolvePhase(args: {
  readyForProduction: boolean;
  trainingStatus: string | null;
  scheduleComplete: boolean;
  hasPractice: boolean;
}): string {
  if (args.readyForProduction || args.trainingStatus === "APPROVED_IN_ORG") {
    return "APPROVED_IN_ORG";
  }
  if (args.trainingStatus === "REJECTED") return "REJECTED";
  if (args.scheduleComplete || args.trainingStatus === "AWAITING_EVALUATION") {
    return "AWAITING_EVALUATION";
  }
  if (args.trainingStatus === "EXTENDED" || args.hasPractice) {
    return "PRACTICE_WORK";
  }
  return "LEARNING";
}

/**
 * Admin/TL: day-wise progress + manual work metrics + final evaluation.
 */
export async function GET(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (userId) {
    if (user.role === "TRAINER") {
      const assigned = await prisma.traineeProfile.findFirst({
        where: { userId, trainerId: user.id },
      });
      if (!assigned) {
        return NextResponse.json({ error: "Not your trainee" }, { status: 403 });
      }
    }
    const trainee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        active: true,
      },
    });
    if (!trainee || trainee.role !== "TRAINEE") {
      return NextResponse.json({ error: "Trainee not found" }, { status: 404 });
    }
    const [plan, evaluation, scope] = await Promise.all([
      getDayWisePlan(userId),
      getTraineeEvaluationScore(userId),
      resolveCurriculumScope(userId),
    ]);
    const days = await listCurriculumDays(scope.scopeKey);
    const throughDay = plan.currentDay;
    const practiceProjects = collectPracticeProjectsFromDays(days, {
      throughDayNumber: throughDay,
    });
    const hasPractice = hasPracticeWorkOnSchedule(days, {
      throughDayNumber: throughDay,
    });
    const work = await listTraineeWorkMetrics(userId, {
      throughDayNumber: throughDay,
    });
    const currentPhase = resolvePhase({
      readyForProduction: plan.readyForProduction,
      trainingStatus: plan.trainingStatus,
      scheduleComplete: plan.scheduleComplete,
      hasPractice,
    });

    return NextResponse.json({
      trainee,
      plan,
      evaluation,
      currentPhase,
      practiceProjects,
      workByProject: work.projects,
      workSummary: work.totals,
      workMeta: {
        configured: work.configured,
        connected: work.connected,
        hrmsUserId: null,
        message: work.message,
        source: "manual",
      },
    });
  }

  const where =
    user.role === "TRAINER"
      ? { role: "TRAINEE" as const, traineeProfile: { trainerId: user.id } }
      : { role: "TRAINEE" as const };

  const trainees = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      active: true,
      traineeProfile: {
        select: {
          currentDayNumber: true,
          trainingStatus: true,
          readyForProduction: true,
          evaluationCycle: true,
        },
      },
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  const rows = await Promise.all(
    trainees.map(async (t) => {
      const [plan, evaluation, scope] = await Promise.all([
        getDayWisePlan(t.id),
        getTraineeEvaluationScore(t.id),
        resolveCurriculumScope(t.id),
      ]);
      const days = await listCurriculumDays(scope.scopeKey);
      const throughDay = plan.currentDay;
      const practiceProjects = collectPracticeProjectsFromDays(days, {
        throughDayNumber: throughDay,
      });
      const hasPractice = hasPracticeWorkOnSchedule(days, {
        throughDayNumber: throughDay,
      });
      const work = await listTraineeWorkMetrics(t.id, {
        throughDayNumber: throughDay,
      });

      const score = evaluation.score;
      const canExtendWeek =
        !plan.readyForProduction &&
        t.traineeProfile?.trainingStatus !== "REJECTED" &&
        t.traineeProfile?.trainingStatus !== "APPROVED_IN_ORG" &&
        (score == null || score < 90);

      const currentPhase = resolvePhase({
        readyForProduction: plan.readyForProduction,
        trainingStatus: plan.trainingStatus,
        scheduleComplete: plan.scheduleComplete,
        hasPractice,
      });

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        active: t.active,
        currentDay: plan.currentDay,
        totalDays: plan.totalDays,
        plannedDays: plan.plannedDays,
        overallPercent: plan.overallPercent,
        learningPercent: plan.overallPercent,
        scheduleComplete: plan.scheduleComplete,
        todayTitle: plan.today?.title ?? null,
        todayDone: plan.today?.done ?? false,
        trainingStatus: plan.trainingStatus,
        readyForProduction: plan.readyForProduction,
        canExtendWeek,
        isCustom: scope.isCustom,
        scheduleSource: scope.isCustom ? "custom" : "default",
        finalQuizScore: evaluation.score,
        lastFinalQuizScore: evaluation.lastFinalQuizScore,
        finalQuizAttemptedAt: evaluation.attemptedAt,
        evaluationCycle: evaluation.cycle,
        previousQuizAttempts: evaluation.previousAttempts,
        quizRetakePending: evaluation.retakePending,
        quizRetakeGrantedAt: evaluation.retakeGrantedAt,
        quizRetakeGrantedBy: evaluation.retakeGrantedBy,
        finalQuizCertificateStatus: evaluation.certificateStatus,
        finalQuizCertificateReviewedBy: evaluation.certificateReviewedBy,
        band: evaluation.band,
        currentPhase,
        hasPracticeWork: hasPractice,
        practiceProjects,
        workByProject: work.projects,
        workSummary: work.totals,
        workMeta: {
          configured: work.configured,
          connected: work.connected,
          message: work.message,
          source: "manual",
        },
        forcedDay: plan.forcedDay ?? null,
        autoDay: plan.autoDay ?? null,
        trainingStart: plan.trainingStart,
        dueSummary: plan.dueSummary,
        days: plan.allDays.map((d) => ({
          dayNumber: d.dayNumber,
          title: d.title,
          done: d.done,
          percent: d.percent,
          completedAt: d.completedAt,
          due: d.due,
          projectName: d.projectName ?? null,
          hrmsProjectId: d.hrmsProjectId ?? null,
          dayType: d.dayType,
          hasTrainingWork:
            Boolean(d.hrmsProjectId?.trim()) ||
            (d.workItems?.length ?? 0) > 0 ||
            (Boolean(d.projectName?.trim()) && d.dayType !== "CHECKLIST"),
          productionTarget:
            d.workItems?.find(
              (w) => w.productionTarget != null && w.productionTarget > 0
            )?.productionTarget ?? null,
          assignedHours: (() => {
            const work = d.workItems?.find(
              (w) =>
                (w.productionTarget != null && w.productionTarget > 0) ||
                (w.assignedHours != null && w.assignedHours > 0)
            );
            return work?.assignedHours ?? null;
          })(),
        })),
      };
    })
  );

  return NextResponse.json({ trainees: rows });
}
