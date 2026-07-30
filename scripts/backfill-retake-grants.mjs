import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Backfill retake-grant fields for trainees already on a retake cycle. */
const profiles = await prisma.traineeProfile.findMany({
  where: {
    evaluationCycle: { gt: 1 },
    finalQuizRetakeGrantedAt: null,
  },
  select: { userId: true, evaluationCycle: true },
});

let updated = 0;
for (const profile of profiles) {
  const attempt = await prisma.finalEvaluationAttempt.findFirst({
    where: { userId: profile.userId, cycle: profile.evaluationCycle },
  });
  if (attempt) continue;

  const prev = await prisma.finalEvaluationAttempt.findFirst({
    where: { userId: profile.userId, cycle: profile.evaluationCycle - 1 },
    orderBy: { cycle: "desc" },
  });
  if (!prev) continue;

  await prisma.traineeProfile.update({
    where: { userId: profile.userId },
    data: {
      finalQuizRetakeGrantedAt: prev.createdAt,
      finalQuizRetakePreviousScore: prev.score,
    },
  });
  updated += 1;
}

console.log(`Backfilled ${updated} retake-grant record(s).`);
await prisma.$disconnect();
