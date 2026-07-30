import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const trainee = await prisma.user.findFirst({
  where: { name: "Trainee 2" },
  select: { id: true, name: true },
});

if (!trainee) {
  console.log("Trainee 2 not found");
  process.exit(0);
}

const attempts = await prisma.finalEvaluationAttempt.findMany({
  where: { userId: trainee.id },
  orderBy: { cycle: "asc" },
});

const certs = await prisma.finalQuizCertificate.findMany({
  where: { userId: trainee.id },
  orderBy: { cycle: "asc" },
  include: { reviewedBy: { select: { name: true, role: true } } },
});

console.log("attempts", attempts);
console.log("certs", certs);

await prisma.$disconnect();
