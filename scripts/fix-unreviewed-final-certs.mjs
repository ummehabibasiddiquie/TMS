import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const result = await prisma.finalQuizCertificate.updateMany({
  where: {
    status: "APPROVED",
    reviewedById: null,
  },
  data: { status: "PENDING_REVIEW" },
});
console.log(`Reset ${result.count} unreviewed certificate(s) to PENDING_REVIEW.`);
await prisma.$disconnect();
