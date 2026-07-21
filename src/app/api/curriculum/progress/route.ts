import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDayWisePlan } from "@/lib/day-wise-training";
import { getTraineeEvaluationScore } from "@/lib/final-evaluation";

/**
 * Admin/TL: day-wise progress + final evaluation scores for trainees.
 * TRAINER sees assigned trainees; ADMIN sees all trainees.
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
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!trainee || trainee.role !== "TRAINEE") {
      return NextResponse.json({ error: "Trainee not found" }, { status: 404 });
    }
    const [plan, evaluation] = await Promise.all([
      getDayWisePlan(userId),
      getTraineeEvaluationScore(userId),
    ]);
    return NextResponse.json({ trainee, plan, evaluation });
  }

  const where =
    user.role === "TRAINER"
      ? { role: "TRAINEE" as const, traineeProfile: { trainerId: user.id } }
      : { role: "TRAINEE" as const };

  // Include inactive (rejected) so Admin still sees decision history
  const trainees = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
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
      const [plan, customCount, evaluation] = await Promise.all([
        getDayWisePlan(t.id),
        prisma.curriculumDay.count({ where: { scopeKey: t.id } }),
        getTraineeEvaluationScore(t.id),
      ]);

      const score = evaluation.score;
      const canExtendWeek =
        !plan.readyForProduction &&
        t.traineeProfile?.trainingStatus !== "REJECTED" &&
        t.traineeProfile?.trainingStatus !== "APPROVED_IN_ORG" &&
        (score == null || score < 90);

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        active: t.active,
        currentDay: plan.currentDay,
        totalDays: plan.totalDays,
        plannedDays: plan.plannedDays,
        overallPercent: plan.overallPercent,
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
      };
    })
  );

  return NextResponse.json({ trainees: rows });
}
