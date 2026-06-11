import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    users,
    courses,
    lessons,
    quizzes,
    attempts,
    trainees,
    certifications,
    onboardingDone,
    onboardingTotal,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.quiz.count(),
    prisma.quizAttempt.count(),
    prisma.user.count({ where: { role: "TRAINEE" } }),
    prisma.projectCertification.count({ where: { passed: true } }),
    prisma.userOnboardingProgress.count({ where: { status: "DONE" } }),
    prisma.userOnboardingProgress.count(),
  ]);

  const avgOnboarding =
    onboardingTotal > 0 ? Math.round((onboardingDone / onboardingTotal) * 100) : 0;

  return NextResponse.json({
    stats: {
      users,
      courses,
      lessons,
      quizzes,
      attempts,
      trainees,
      certifications,
      avgOnboardingCompletion: avgOnboarding,
    },
  });
}
