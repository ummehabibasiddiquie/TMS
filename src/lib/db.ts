import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasFinalQuizModel(client: PrismaClient) {
  return Boolean((client as { finalEvaluationQuiz?: unknown }).finalEvaluationQuiz);
}

let prisma = globalForPrisma.prisma ?? createClient();

// Dev: if the process kept an old client from before schema generate, replace it.
if (process.env.NODE_ENV !== "production" && !hasFinalQuizModel(prisma)) {
  void prisma.$disconnect().catch(() => undefined);
  prisma = createClient();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
