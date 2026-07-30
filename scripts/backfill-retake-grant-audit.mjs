import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Only backfill when the real grantor was stored on the profile — never guess from trainerId. */
const profiles = await prisma.traineeProfile.findMany({
  where: {
    OR: [
      { finalQuizRetakeGrantedAt: { not: null }, finalQuizRetakeGrantedById: { not: null } },
      { evaluationCycle: { gt: 1 } },
    ],
  },
  select: {
    userId: true,
    evaluationCycle: true,
    finalQuizRetakeGrantedAt: true,
    finalQuizRetakeGrantedById: true,
    finalQuizRetakePreviousScore: true,
    trainerId: true,
  },
});

let created = 0;
let removed = 0;

for (const profile of profiles) {
  for (let cycle = 1; cycle < profile.evaluationCycle; cycle += 1) {
    const existing = await prisma.finalQuizRetakeGrant.findFirst({
      where: { userId: profile.userId, previousCycle: cycle, newCycle: cycle + 1 },
      include: { grantedBy: { select: { id: true, role: true } } },
    });

    const prevAttempt = await prisma.finalEvaluationAttempt.findFirst({
      where: { userId: profile.userId, cycle },
    });
    const nextAttempt = await prisma.finalEvaluationAttempt.findFirst({
      where: { userId: profile.userId, cycle: cycle + 1 },
    });
    if (!prevAttempt || !nextAttempt) continue;

    // Remove incorrect backfills that guessed the assigned Team Lead as grantor.
    if (
      existing &&
      profile.trainerId &&
      existing.grantedById === profile.trainerId &&
      existing.grantedBy?.role === "TRAINER" &&
      !profile.finalQuizRetakeGrantedById
    ) {
      await prisma.finalQuizRetakeGrant.delete({ where: { id: existing.id } });
      removed += 1;
      continue;
    }

    if (existing) continue;

    if (!profile.finalQuizRetakeGrantedById) continue;

    await prisma.finalQuizRetakeGrant.create({
      data: {
        userId: profile.userId,
        grantedById: profile.finalQuizRetakeGrantedById,
        grantedAt:
          profile.finalQuizRetakeGrantedAt ??
          nextAttempt.createdAt ??
          prevAttempt.createdAt,
        previousCycle: cycle,
        newCycle: cycle + 1,
        previousScore: profile.finalQuizRetakePreviousScore ?? prevAttempt.score,
      },
    });
    created += 1;
  }
}

console.log(`Removed ${removed} guessed grantor record(s). Created ${created} audit record(s).`);
await prisma.$disconnect();
