import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasRequiredModels(client: PrismaClient) {
  const c = client as {
    finalEvaluationQuiz?: unknown;
    appConfig?: unknown;
    traineeWorkMetric?: unknown;
  };
  return Boolean(c.finalEvaluationQuiz && c.appConfig && c.traineeWorkMetric);
}

let prisma = globalForPrisma.prisma ?? createClient();

// Dev: if the process kept an old client from before schema generate, replace it.
if (process.env.NODE_ENV !== "production" && !hasRequiredModels(prisma)) {
  void prisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
  prisma = createClient();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
