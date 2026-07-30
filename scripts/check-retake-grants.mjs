import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const grants = await prisma.finalQuizRetakeGrant.findMany({
  include: {
    grantedBy: { select: { name: true, role: true } },
    user: { select: { name: true } },
  },
});
console.log("grants:", JSON.stringify(grants, null, 2));

const profiles = await prisma.traineeProfile.findMany({
  where: { evaluationCycle: { gt: 1 } },
  select: {
    userId: true,
    evaluationCycle: true,
    finalQuizRetakeGrantedById: true,
    finalQuizRetakeGrantedAt: true,
    finalQuizRetakeGrantedBy: { select: { name: true, role: true } },
    user: { select: { name: true } },
  },
});
console.log("profiles:", JSON.stringify(profiles, null, 2));

await prisma.$disconnect();
