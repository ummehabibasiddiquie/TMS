import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDayLearningComplete } from "@/lib/progress";
import { TrainingDayClient } from "./TrainingDayClient";

export default async function TrainingPage() {
  const user = await getSession();
  if (!user) return null;

  const profile = await prisma.traineeProfile.findUnique({
    where: { userId: user.id },
  });

  const currentDay = profile?.currentDayNumber ?? 1;
  const day = await prisma.trainingDay.findUnique({
    where: { id: currentDay },
    include: {
      phases: true,
      requiredLearn: {
        include: { lesson: { include: { module: true } }, course: true },
      },
    },
  });

  const allDays = await prisma.trainingDay.findMany({ orderBy: { id: "asc" } });
  const learningComplete = await isDayLearningComplete(user.id, currentDay);

  const lessonIds = day?.requiredLearn.filter((r) => r.lessonId).map((r) => r.lessonId!) ?? [];
  const progress = await prisma.lessonProgress.findMany({
    where: { userId: user.id, lessonId: { in: lessonIds } },
  });
  const progressMap = Object.fromEntries(progress.map((p) => [p.lessonId, p]));

  const submissions = await prisma.dailySubmission.findMany({
    where: { userId: user.id, dayNumber: currentDay },
  });

  return (
    <TrainingDayClient
      currentDay={currentDay}
      day={day}
      allDays={allDays}
      learningComplete={learningComplete}
      progressMap={progressMap}
      submissions={submissions}
      profile={profile}
    />
  );
}
