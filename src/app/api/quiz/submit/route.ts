import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recalculateCourseProgress, updateLearningStreak, checkAndAwardAchievements } from "@/lib/progress";
import { upsertPendingProjectCertificationFromCourse } from "@/lib/project-certification";

export async function POST(req: Request) {
  const user = await requireSession(["TRAINEE"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { quizId, answers } = await req.json();
    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        lesson: {
          include: {
            module: {
              include: {
                course: { select: { id: true, title: true } },
              },
            },
            quizzes: { select: { id: true } },
          },
        },
      },
    });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    let correct = 0;
    const parsedAnswers = (answers ?? {}) as Record<string, string>;
    for (const q of quiz.questions) {
      if (parsedAnswers[q.id] === q.correct) correct++;
    }
    const score = quiz.questions.length > 0 ? (correct / quiz.questions.length) * 100 : 0;
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

    const lessonQuizIds = quiz.lesson.quizzes.map((q) => q.id);
    const passedAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId: user.id,
        quizId: { in: lessonQuizIds },
        passed: true,
      },
      select: { quizId: true, score: true },
    });
    const passedIds = new Set(passedAttempts.map((a) => a.quizId).filter(Boolean) as string[]);
    if (passed) passedIds.add(quizId);
    const allPassed =
      lessonQuizIds.length > 0 && lessonQuizIds.every((id) => passedIds.has(id));

    const scoresByQuiz = new Map<string, number>();
    for (const a of passedAttempts) {
      if (a.quizId != null && !scoresByQuiz.has(a.quizId)) {
        scoresByQuiz.set(a.quizId, a.score);
      }
    }
    if (passed) scoresByQuiz.set(quizId, score);
    const avgScore =
      scoresByQuiz.size > 0
        ? [...scoresByQuiz.values()].reduce((s, v) => s + v, 0) / scoresByQuiz.size
        : score;

    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: quiz.lessonId } },
      create: {
        userId: user.id,
        lessonId: quiz.lessonId,
        quizScore: avgScore,
        quizPassed: allPassed,
        completed: allPassed,
        completedAt: allPassed ? new Date() : null,
        watchPercent: 100,
      },
      update: {
        quizScore: avgScore,
        quizPassed: allPassed,
        completed: allPassed,
        completedAt: allPassed ? new Date() : undefined,
      },
    });

    const courseId = quiz.lesson.module.courseId;
    const courseProgress = await recalculateCourseProgress(user.id, courseId);
    await updateLearningStreak(user.id);
    await checkAndAwardAchievements(user.id);

    // Course quiz pass → pending project certification for Admin/Team Lead approval
    if (passed) {
      await upsertPendingProjectCertificationFromCourse({
        userId: user.id,
        courseTitle: quiz.lesson.module.course.title,
        score,
        passed: true,
      });
    }

    return NextResponse.json({
      score,
      passed,
      allPassed,
      passedQuizIds: [...passedIds],
      passingScore: quiz.passingScore,
      courseProgress,
    });
  } catch (err) {
    console.error("Quiz submit failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit quiz" },
      { status: 500 }
    );
  }
}
