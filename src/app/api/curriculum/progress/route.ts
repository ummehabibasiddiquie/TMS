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
  listHrmsWorkForTraineeProjects,
} from "@/lib/hrms-work";

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
 * Admin/TL: day-wise progress + HRMS work (practice projects) + final evaluation.
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
    const practiceProjects = collectPracticeProjectsFromDays(days);
    const hasPractice = hasPracticeWorkOnSchedule(days);
    const work = await listHrmsWorkForTraineeProjects(
      { email: trainee.email, employeeId: trainee.employeeId, name: trainee.name },
      practiceProjects
    );
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
        hrmsUserId: work.hrmsUserId,
        message: work.message,
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
      const [plan, customCount, evaluation, scope] = await Promise.all([
        getDayWisePlan(t.id),
        prisma.curriculumDay.count({ where: { scopeKey: t.id } }),
        getTraineeEvaluationScore(t.id),
        resolveCurriculumScope(t.id),
      ]);
      const days = await listCurriculumDays(scope.scopeKey);
      const practiceProjects = collectPracticeProjectsFromDays(days);
      const hasPractice = hasPracticeWorkOnSchedule(days);
      const work = await listHrmsWorkForTraineeProjects(
        { email: t.email, employeeId: t.employeeId, name: t.name },
        practiceProjects
      );

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
        isCustom: customCount > 0,
        scheduleSource: plan.isCustom ? "custom" : "default",
        finalQuizScore: evaluation.score,
        finalQuizAttemptedAt: evaluation.attemptedAt,
        evaluationCycle: evaluation.cycle,
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
        },
      };
    })
  );

  return NextResponse.json({ trainees: rows });
}
