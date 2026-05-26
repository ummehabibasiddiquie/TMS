import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { QuizClient } from "./QuizClient";
import { prisma } from "@/lib/db";
import { landscapeQuiz } from "@/lib/onboarding-data";

export default async function LandscapeQuizPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const quiz = await prisma.quiz.findFirst({
    where: {
      lesson: {
        module: {
          course: { title: { contains: "Landscape" } },
        },
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  const questions =
    quiz?.questions.map((question) => {
      let options: string[] = [];
      try {
        const parsed = JSON.parse(question.options);
        options = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        options = [];
      }
      const correctIndex = Math.max(0, options.indexOf(question.correct));
      return { question: question.question, options, correctIndex };
    }).filter((question) => question.options.length >= 2) ?? landscapeQuiz;

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
            Landscape - Certification Quiz
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">Answer all 5 questions</h1>
          <p className="mt-2 text-slate-400">Score 80%+ (4/5) to earn your Landscape certification badge.</p>
        </div>
        <QuizClient questions={questions.length ? questions : landscapeQuiz} />
      </div>
    </AppShell>
  );
}
