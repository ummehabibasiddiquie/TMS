import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recalculateCourseProgress, updateLearningStreak, checkAndAwardAchievements } from "@/lib/progress";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId, answers } = await req.json();
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true, lesson: { include: { module: true } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  let correct = 0;
  const parsedAnswers = answers as Record<string, string>;
  for (const q of quiz.questions) {
    if (parsedAnswers[q.id] === q.correct) correct++;
  }
  const score = (correct / quiz.questions.length) * 100;
  const passed = score >= quiz.passingScore;

  await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      quizId,
      score,
      passed,
      answers: JSON.stringify(parsedAnswers),
    },
  });

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: quiz.lessonId } },
    create: {
      userId: user.id,
      lessonId: quiz.lessonId,
      quizScore: score,
      quizPassed: passed,
      completed: passed,
      completedAt: passed ? new Date() : null,
    },
    update: {
      quizScore: score,
      quizPassed: passed,
      completed: passed,
      completedAt: passed ? new Date() : undefined,
    },
  });

  const courseId = quiz.lesson.module.courseId;
  const courseProgress = await recalculateCourseProgress(user.id, courseId);
  await updateLearningStreak(user.id);
  await checkAndAwardAchievements(user.id);

  return NextResponse.json({ score, passed, passingScore: quiz.passingScore, courseProgress });
}
