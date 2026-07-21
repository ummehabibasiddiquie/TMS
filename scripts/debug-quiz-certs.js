const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const attempts = await p.quizAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      user: { select: { name: true, email: true } },
      quiz: {
        select: {
          title: true,
          lesson: {
            select: {
              title: true,
              module: { select: { course: { select: { id: true, title: true } } } },
            },
          },
        },
      },
    },
  });
  const certs = await p.projectCertification.findMany();
  const projects = await p.project.findMany({
    select: { id: true, name: true, active: true },
    take: 20,
  });
  const assignments = await p.projectAssignment.findMany({
    take: 20,
    include: {
      user: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  console.log(
    "attempts",
    JSON.stringify(
      attempts.map((a) => ({
        score: a.score,
        passed: a.passed,
        user: a.user.name,
        quiz: a.quiz?.title,
        course: a.quiz?.lesson?.module?.course?.title,
        at: a.createdAt,
      })),
      null,
      2
    )
  );
  console.log("certs", certs.length);
  console.log("projects", projects);
  console.log(
    "assignments",
    assignments.map((a) => `${a.user.name} -> ${a.project.name}`)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
