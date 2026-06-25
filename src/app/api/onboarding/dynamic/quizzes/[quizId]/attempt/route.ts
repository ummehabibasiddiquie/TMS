import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST submit quiz attempt
export async function POST(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { answers } = await req.json();
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "answers are required" }, { status: 400 });
  }

  const quiz = await (prisma as any).courseQuiz.findUnique({
    where: { id: params.quizId },
    include: {
      questions: {
        orderBy: { order: "asc" }
      },
      assignment: {
        include: {
          employeeProgress: {
            where: { userId: user.id }
          }
        }
      }
    }
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Check if course is approved
  const courseProgress = quiz.assignment.employeeProgress[0];
  if (!courseProgress || courseProgress.status !== "APPROVED") {
    return NextResponse.json({ error: "Course must be approved before taking quiz" }, { status: 400 });
  }

  // Check attempt limit
  const existingAttempts = await prisma.quizAttempt.count({
    where: {
      userId: user.id,
      courseQuizId: params.quizId
    } as any
  });

  if (existingAttempts >= quiz.maxAttempts) {
    return NextResponse.json({ error: "Maximum attempts reached" }, { status: 400 });
  }

  // Calculate score
  let correct = 0;
  quiz.questions.forEach((question: any) => {
    const userAnswer = answers[question.id];
    const correctAnswer = JSON.parse(question.correct);
    if (JSON.stringify(userAnswer) === JSON.stringify(correctAnswer)) {
      correct++;
    }
  });

  const score = (correct / quiz.questions.length) * 100;
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      courseQuizId: params.quizId,
      score,
      passed,
      answers: JSON.stringify(answers)
    } as any
  });

  return NextResponse.json({
    attempt,
    score,
    passed,
    correct,
    total: quiz.questions.length,
    passingScore: quiz.passingScore
  });
}