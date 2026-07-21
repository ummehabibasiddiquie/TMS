const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

function normalizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const attempts = await p.quizAttempt.findMany({
    where: { passed: true, score: { gte: 80 } },
    orderBy: { createdAt: "desc" },
    include: {
      quiz: {
        include: {
          lesson: {
            include: {
              module: { include: { course: { select: { title: true } } } },
            },
          },
        },
      },
      user: { select: { name: true } },
    },
  });

  const seen = new Set();
  let count = 0;

  for (const attempt of attempts) {
    const courseTitle = attempt.quiz?.lesson?.module?.course?.title;
    if (!courseTitle) continue;
    const key = `${attempt.userId}:${courseTitle}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const assignments = await p.projectAssignment.findMany({
      where: {
        userId: attempt.userId,
        status: { notIn: ["REMOVED", "CANCELLED"] },
        project: { active: true },
      },
      include: { project: true },
    });

    const courseKey = normalizeName(courseTitle);
    const match =
      assignments.find((a) => {
        const projectKey = normalizeName(a.project.name);
        return (
          projectKey === courseKey ||
          courseKey.includes(projectKey) ||
          projectKey.includes(courseKey)
        );
      }) || (assignments.length === 1 ? assignments[0] : null);

    if (!match) {
      console.log("no match for", attempt.user.name, courseTitle);
      continue;
    }

    const row = await p.projectCertification.upsert({
      where: {
        userId_projectId: {
          userId: attempt.userId,
          projectId: match.projectId,
        },
      },
      create: {
        userId: attempt.userId,
        projectId: match.projectId,
        score: attempt.score,
        passed: true,
        status: "PENDING_REVIEW",
        certifiedAt: attempt.createdAt,
      },
      update: {
        score: attempt.score,
        passed: true,
        status: "PENDING_REVIEW",
        certifiedAt: attempt.createdAt,
        reviewedAt: null,
        reviewedById: null,
        reviewNote: null,
      },
    });

    count++;
    console.log(
      "PENDING",
      attempt.user.name,
      "->",
      match.project.name,
      Math.round(attempt.score) + "%",
      row.id
    );
  }

  console.log("Done. Upserted:", count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
