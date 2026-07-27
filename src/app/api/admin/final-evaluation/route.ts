import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultFinalEvaluationQuiz } from "@/lib/final-evaluation";

/** Admin: view / update the active final evaluation quiz. */
export async function GET() {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensureDefaultFinalEvaluationQuiz();
    const quiz = await prisma.finalEvaluationQuiz.findFirst({
      where: { isActive: true },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ quiz });
  } catch (err) {
    console.error("GET /api/admin/final-evaluation", err);
    const message = err instanceof Error ? err.message : "Failed to load final quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Admin or Team Lead: replace questions on the active final quiz. */
export async function PUT(req: Request) {
  const user = await requireSession(["ADMIN", "TRAINER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    title?: string;
    description?: string | null;
    questions?: { question: string; options: string[]; correct: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await ensureDefaultFinalEvaluationQuiz();
  const quiz = await prisma.finalEvaluationQuiz.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!quiz) {
    return NextResponse.json({ error: "No quiz found" }, { status: 404 });
  }

  const questions = body.questions;
  if (questions) {
    for (const q of questions) {
      if (!q.question?.trim() || !Array.isArray(q.options) || q.options.length < 2 || !q.correct) {
        return NextResponse.json(
          { error: "Each question needs text, ≥2 options, and a correct answer" },
          { status: 400 }
        );
      }
      if (!q.options.includes(q.correct)) {
        return NextResponse.json(
          { error: "correct must be one of the options" },
          { status: 400 }
        );
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.finalEvaluationQuiz.update({
      where: { id: quiz.id },
      data: {
        title: body.title?.trim() || quiz.title,
        description:
          body.description === undefined ? quiz.description : body.description,
        passingScore: 0,
      },
    });

    if (questions) {
      await tx.finalEvaluationQuestion.deleteMany({ where: { quizId: quiz.id } });
      await tx.finalEvaluationQuestion.createMany({
        data: questions.map((q, i) => ({
          quizId: quiz.id,
          question: q.question.trim(),
          options: JSON.stringify(q.options),
          correct: q.correct,
          sortOrder: i,
        })),
      });
    }
  });

  const updated = await prisma.finalEvaluationQuiz.findUnique({
    where: { id: quiz.id },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ quiz: updated });
}
