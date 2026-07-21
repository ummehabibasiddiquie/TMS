import { prisma } from "@/lib/db";

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * When an employee passes a course quiz, create/update a ProjectCertification
 * for an assigned project whose name matches the course (so Cert Approvals can review it).
 */
export async function upsertPendingProjectCertificationFromCourse(opts: {
  userId: string;
  courseTitle: string;
  score: number;
  passed: boolean;
}) {
  const { userId, courseTitle, score, passed } = opts;
  if (!passed || score < 80) return null;

  const assignments = await prisma.projectAssignment.findMany({
    where: {
      userId,
      status: { notIn: ["REMOVED", "CANCELLED"] },
      project: { active: true },
    },
    include: { project: true },
  });

  if (assignments.length === 0) return null;

  const courseKey = normalizeName(courseTitle);
  const match = assignments.find((a) => {
    const projectKey = normalizeName(a.project.name);
    return (
      projectKey === courseKey ||
      courseKey.includes(projectKey) ||
      projectKey.includes(courseKey)
    );
  });

  if (!match) return null;

  // Do not overwrite an already-approved certificate with a retake unless we reset review
  const existing = await prisma.projectCertification.findUnique({
    where: {
      userId_projectId: { userId, projectId: match.projectId },
    },
  });

  if (existing?.status === "APPROVED" && existing.reviewedAt) {
    // Keep approved cert; admin already issued it
    return existing;
  }

  return prisma.projectCertification.upsert({
    where: {
      userId_projectId: { userId, projectId: match.projectId },
    },
    create: {
      userId,
      projectId: match.projectId,
      score,
      passed: true,
      status: "PENDING_REVIEW",
      certifiedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
    },
    update: {
      score,
      passed: true,
      status: "PENDING_REVIEW",
      certifiedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
    },
  });
}

/** Backfill pending certs from recent passed course quiz attempts (for already-submitted quizzes). */
export async function backfillPendingCertsFromQuizAttempts() {
  const attempts = await prisma.quizAttempt.findMany({
    where: { passed: true, score: { gte: 80 } },
    orderBy: { createdAt: "desc" },
    take: 200,
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
    },
  });

  let created = 0;
  const seen = new Set<string>();

  for (const attempt of attempts) {
    const courseTitle = attempt.quiz?.lesson?.module?.course?.title;
    if (!courseTitle) continue;
    const key = `${attempt.userId}:${courseTitle}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = await upsertPendingProjectCertificationFromCourse({
      userId: attempt.userId,
      courseTitle,
      score: attempt.score,
      passed: true,
    });
    if (result) created++;
  }

  return created;
}
