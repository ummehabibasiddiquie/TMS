import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectQuizClient } from "@/components/projects/ProjectQuizClient";
import { prisma } from "@/lib/db";

export default async function ProjectQuizPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  // Verify user has access to this project
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      assignments: true,
    },
  });

  if (!project) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-6xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Project not found</h1>
        </div>
      </AppShell>
    );
  }

  const isAssigned = project.assignments.some((a) => a.userId === user.id);
  const isAdmin = user.role === "ADMIN";
  const isTeamLead = user.role === "TRAINER";

  if (!isAdmin && !isTeamLead && !isAssigned) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-6xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-slate-400">You don&apos;t have permission to view this project.</p>
        </div>
      </AppShell>
    );
  }

  // Find quiz associated with this project's course
  const quiz = await prisma.quiz.findFirst({
    where: {
      lesson: {
        module: {
          course: {
            title: { contains: project.name },
            published: true,
          },
        },
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!quiz) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
              {project.name} - Certification Quiz
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">No Quiz Available</h1>
            <p className="mt-2 text-slate-400">
              A certification quiz has not been set up for this project yet. Please contact your administrator.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const questions = quiz.questions.map((question) => {
    let options: string[] = [];
    try {
      const parsed = JSON.parse(question.options);
      options = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      options = [];
    }
    const correctIndex = Math.max(0, options.indexOf(question.correct));
    return { question: question.question, options, correctIndex };
  }).filter((question) => question.options.length >= 2);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            {project.name} - Certification Quiz
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">Answer all {questions.length} questions</h1>
          <p className="mt-2 text-slate-400">Score 80%+ to earn your {project.name} certification badge.</p>
        </div>
        <ProjectQuizClient questions={questions} projectId={project.id} projectName={project.name} />
      </div>
    </AppShell>
  );
}
