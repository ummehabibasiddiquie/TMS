const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Remove wrongly backfilled certs that were never reviewed
  // (safe cleanup for the Email Replies mis-match)
  const bad = await p.projectCertification.findMany({
    where: { status: "PENDING_REVIEW", reviewedAt: null },
    include: {
      user: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  console.log(
    "pending before",
    bad.map((b) => `${b.user.name} / ${b.project.name} / ${b.score}`)
  );

  // Delete Priya's Email Replies pending if score came from Landscaping mismatch
  const deleted = await p.projectCertification.deleteMany({
    where: {
      status: "PENDING_REVIEW",
      reviewedAt: null,
      project: { name: "Email Replies" },
      user: { name: "Priya Sharma" },
    },
  });
  console.log("deleted mismatched", deleted.count);

  // Re-run correct upserts (name match only)
  function normalizeName(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

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
    const match = assignments.find((a) => {
      const projectKey = normalizeName(a.project.name);
      return (
        projectKey === courseKey ||
        courseKey.includes(projectKey) ||
        projectKey.includes(courseKey)
      );
    });

    if (!match) {
      console.log("skip (no project name match)", attempt.user.name, courseTitle);
      continue;
    }

    await p.projectCertification.upsert({
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
    console.log("ok", attempt.user.name, "->", match.project.name, attempt.score);
  }

  const after = await p.projectCertification.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      user: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  console.log(
    "pending after",
    after.map((b) => `${b.user.name} / ${b.project.name} / ${Math.round(b.score)}%`)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
