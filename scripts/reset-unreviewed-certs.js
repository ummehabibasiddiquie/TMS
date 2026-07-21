const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const all = await p.projectCertification.findMany({
    include: {
      user: { select: { name: true, email: true } },
      project: { select: { name: true } },
    },
  });
  console.log("BEFORE", JSON.stringify(all, null, 2));

  // Anything never reviewed should not be downloadable yet
  const reset = await p.projectCertification.updateMany({
    where: {
      passed: true,
      reviewedAt: null,
      OR: [{ status: "APPROVED" }, { status: "PENDING_REVIEW" }],
    },
    data: {
      status: "PENDING_REVIEW",
      reviewedById: null,
      reviewNote: null,
    },
  });
  console.log("Reset to PENDING_REVIEW:", reset.count);

  const after = await p.projectCertification.findMany({
    select: {
      id: true,
      score: true,
      passed: true,
      status: true,
      reviewedAt: true,
      user: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  console.log("AFTER", JSON.stringify(after, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
